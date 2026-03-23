import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import type {
  Incident,
  Alert,
  Resource,
  User,
  ResourceType,
} from '@emergency-response/shared/data-models';
import { COLLECTIONS, INCIDENT_RESOURCE_MAP } from '@emergency-response/shared/data-models';
import { calculateDispatch, syncVehicleToSupabase } from '@emergency-response/shared/util-supabase';
import {
  evaluateEscalation,
  DEFAULT_ESCALATION_RULES,
  getAlertPriorityForSeverity,
} from '@emergency-response/shared/util-escalation';

const db = admin.firestore();

export const onIncidentCreated = onDocumentCreated(
  `${COLLECTIONS.INCIDENTS}/{incidentId}`,
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const incident = snapshot.data() as Incident;
    const now = new Date();

    const actions = evaluateEscalation(incident, DEFAULT_ESCALATION_RULES, now);
    console.log(`[onIncidentCreated] Incident ${incident.incident_id} severity=${incident.severity} actions=`, actions.map(a => a.type));

    for (const action of actions) {
      if (action.type === 'notify') {
        await createAlert(incident, action.target_roles, action.reason);
      }

      if (action.type === 'auto_dispatch') {
        try {
          await autoDispatch(incident);
          console.log(`[onIncidentCreated] Auto-dispatch completed for ${incident.incident_id}`);
        } catch (err) {
          console.error(`[onIncidentCreated] Auto-dispatch FAILED for ${incident.incident_id}:`, err);
        }
      }
    }
  }
);

export const onIncidentUpdated = onDocumentUpdated(
  `${COLLECTIONS.INCIDENTS}/{incidentId}`,
  async (event) => {
    const after = event.data?.after?.data() as Incident | undefined;
    const before = event.data?.before?.data() as Incident | undefined;
    if (!after || !before) return;

    // Notify newly assigned units and sync their status to Supabase
    const newUnits = (after.assigned_units || []).filter(
      (u) => !(before.assigned_units || []).includes(u)
    );
    if (newUnits.length > 0) {
      await notifyAssignedUnits(after, newUnits);

      // Sync newly assigned vehicles to Supabase as 'dispatched'
      for (const unitId of newUnits) {
        try {
          const resourceDoc = await db.collection(COLLECTIONS.RESOURCES).doc(unitId).get();
          if (resourceDoc.exists) {
            const r = resourceDoc.data() as Resource;
            await syncVehicleToSupabase(unitId, r.location, r.status, r.type);
          }
        } catch (err) {
          console.error(`[onIncidentUpdated] Supabase sync failed for ${unitId}:`, err);
        }
      }
    }

    // Sync unassigned vehicles back to available in Supabase
    const removedUnits = (before.assigned_units || []).filter(
      (u) => !(after.assigned_units || []).includes(u)
    );
    for (const unitId of removedUnits) {
      try {
        const resourceDoc = await db.collection(COLLECTIONS.RESOURCES).doc(unitId).get();
        if (resourceDoc.exists) {
          const r = resourceDoc.data() as Resource;
          await syncVehicleToSupabase(unitId, r.location, r.status, r.type);
        }
      } catch (err) {
        console.error(`[onIncidentUpdated] Supabase sync failed for ${unitId}:`, err);
      }
    }

    // Create alert when manually escalated
    if (after.escalation_level !== before.escalation_level && after.escalation_level > before.escalation_level) {
      const escalationTargets: Record<number, string[]> = {
        1: ['supervisor'],
        2: ['manager'],
        3: ['director'],
      };
      const targetRoles = escalationTargets[after.escalation_level] ?? ['supervisor'];
      const reason = `Incident manually escalated to level ${after.escalation_level}`;
      console.log(`[onIncidentUpdated] ${reason}, alerting: ${targetRoles.join(', ')}`);
      await createAlert(after, targetRoles, reason);
    }

    // Re-evaluate escalation if status changed
    if (after.status !== before.status) {
      const now = new Date();
      const actions = evaluateEscalation(after, DEFAULT_ESCALATION_RULES, now);

      for (const action of actions) {
        if (action.type === 'escalate' && action.new_escalation_level) {
          await db
            .collection(COLLECTIONS.INCIDENTS)
            .doc(after.incident_id)
            .update({
              escalation_level: action.new_escalation_level,
              updated_at: now.toISOString(),
            });

          await createAlert(after, action.target_roles, action.reason);
        }
      }
    }
  }
);

async function createAlert(
  incident: Incident,
  targetRoles: string[],
  reason: string
): Promise<void> {
  const alertRef = db.collection(COLLECTIONS.ALERTS).doc();

  const alert: Alert = {
    alert_id: alertRef.id,
    incident_id: incident.incident_id,
    target_user_ids: [],
    target_roles: targetRoles,
    channel: 'in_app',
    priority: getAlertPriorityForSeverity(incident.severity),
    title: `${incident.severity.toUpperCase()} ${incident.type.replace('_', ' ')} incident`,
    body: reason,
    acknowledged: false,
    created_at: new Date().toISOString(),
  };

  await alertRef.set(alert);
}

async function autoDispatch(incident: Incident): Promise<void> {
  const resourceType = INCIDENT_RESOURCE_MAP[incident.type];
  console.log(`[autoDispatch] Smart dispatch: type=${resourceType} for incident ${incident.incident_id}`);

  let candidates;
  try {
    candidates = await calculateDispatch(
      incident.location.lat,
      incident.location.lng,
      resourceType,
      5000
    );
  } catch (err) {
    console.error(`[autoDispatch] Supabase RPC failed, falling back to naive dispatch:`, err);
    return naiveDispatch(incident, resourceType);
  }

  if (!candidates || candidates.length === 0) {
    console.log(`[autoDispatch] No candidates from Supabase, falling back to naive dispatch`);
    return naiveDispatch(incident, resourceType);
  }

  // Iterate candidates and verify each is still available in Firestore (source of truth)
  for (const candidate of candidates) {
    const resourceDoc = await db
      .collection(COLLECTIONS.RESOURCES)
      .doc(candidate.vehicle_id)
      .get();

    if (!resourceDoc.exists) continue;

    const resource = resourceDoc.data() as Resource;
    if (resource.status !== 'available' || resource.type !== resourceType) continue;

    // Dispatch this unit
    const batch = db.batch();
    batch.update(resourceDoc.ref, {
      status: 'dispatched',
      assigned_incident: incident.incident_id,
      last_updated: new Date().toISOString(),
    });
    batch.update(db.collection(COLLECTIONS.INCIDENTS).doc(incident.incident_id), {
      status: 'dispatched',
      assigned_units: FieldValue.arrayUnion(candidate.vehicle_id),
      updated_at: new Date().toISOString(),
    });
    await batch.commit();

    // Sync dispatched status to Supabase (non-blocking)
    try {
      await syncVehicleToSupabase(candidate.vehicle_id, resource.location, 'dispatched', resource.type);
    } catch (err) {
      console.error(`[autoDispatch] Supabase status sync failed for ${candidate.vehicle_id}:`, err);
    }

    console.log(
      `[autoDispatch] Dispatched ${candidate.vehicle_id} ` +
      `(distance: ${candidate.distance_meters.toFixed(0)}m, cost: ${candidate.weighted_cost.toFixed(0)})`
    );
    return;
  }

  console.log(`[autoDispatch] No valid Firestore resources matched Supabase candidates`);
  await alertNoResourceAvailable(incident, resourceType);
}

/** Fallback dispatch: picks the first available resource of matching type (no proximity logic). */
async function naiveDispatch(incident: Incident, resourceType: ResourceType): Promise<void> {
  console.log(`[naiveDispatch] Looking for resource type=${resourceType} for incident ${incident.incident_id}`);

  const snapshot = await db
    .collection(COLLECTIONS.RESOURCES)
    .where('type', '==', resourceType)
    .where('status', '==', 'available')
    .limit(1)
    .get();

  if (snapshot.empty) {
    console.log(`[naiveDispatch] No available ${resourceType} resources found`);
    await alertNoResourceAvailable(incident, resourceType);
    return;
  }

  const resource = snapshot.docs[0];
  const unitId = resource.data().unit_id as string;

  const batch = db.batch();
  batch.update(resource.ref, {
    status: 'dispatched',
    assigned_incident: incident.incident_id,
    last_updated: new Date().toISOString(),
  });
  batch.update(db.collection(COLLECTIONS.INCIDENTS).doc(incident.incident_id), {
    status: 'dispatched',
    assigned_units: FieldValue.arrayUnion(unitId),
    updated_at: new Date().toISOString(),
  });
  await batch.commit();

  // Sync dispatched status to Supabase (non-blocking)
  const resourceData = resource.data() as Resource;
  try {
    await syncVehicleToSupabase(unitId, resourceData.location, 'dispatched', resourceData.type);
  } catch (err) {
    console.error(`[naiveDispatch] Supabase status sync failed for ${unitId}:`, err);
  }
}

/** Alert supervisor and manager when no resource is available for dispatch. */
async function alertNoResourceAvailable(
  incident: Incident,
  resourceType: ResourceType
): Promise<void> {
  const reason =
    `No available ${resourceType.replace('_', ' ')} resource found for ` +
    `${incident.severity} ${incident.type.replace('_', ' ')} incident. ` +
    `Manual dispatch required.`;

  console.log(`[alertNoResourceAvailable] ${reason}`);

  await createAlert(
    incident,
    ['supervisor', 'manager'],
    reason
  );
}

async function notifyAssignedUnits(
  incident: Incident,
  unitIds: string[]
): Promise<void> {
  // Find users assigned to these units
  const usersSnapshot = await db
    .collection(COLLECTIONS.USERS)
    .where('assigned_unit', 'in', unitIds)
    .where('is_active', '==', true)
    .get();

  if (usersSnapshot.empty) {
    console.log(`[notifyAssignedUnits] No active users found for units: ${unitIds.join(', ')}`);
    return;
  }

  const targetUserIds = usersSnapshot.docs.map((d) => d.id);
  console.log(`[notifyAssignedUnits] Notifying ${targetUserIds.length} users for units: ${unitIds.join(', ')}`);

  // Create an alert targeting these specific users
  const alertRef = db.collection(COLLECTIONS.ALERTS).doc();
  const alert: Alert = {
    alert_id: alertRef.id,
    incident_id: incident.incident_id,
    target_user_ids: targetUserIds,
    target_roles: [],
    channel: 'push',
    priority: getAlertPriorityForSeverity(incident.severity),
    title: `Dispatched: ${incident.type.replace('_', ' ')} incident`,
    body: `Your unit has been assigned to a ${incident.severity} ${incident.type.replace('_', ' ')} incident`,
    acknowledged: false,
    created_at: new Date().toISOString(),
  };

  await alertRef.set(alert);
}
