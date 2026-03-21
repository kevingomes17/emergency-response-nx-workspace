import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import type {
  Incident,
  Alert,
  Resource,
  User,
} from '@emergency-response/shared/data-models';
import { COLLECTIONS, INCIDENT_RESOURCE_MAP } from '@emergency-response/shared/data-models';
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

    // Notify newly assigned units
    const newUnits = (after.assigned_units || []).filter(
      (u) => !(before.assigned_units || []).includes(u)
    );
    if (newUnits.length > 0) {
      await notifyAssignedUnits(after, newUnits);
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
  console.log(`[autoDispatch] Looking for resource type=${resourceType} for incident ${incident.incident_id}`);

  const snapshot = await db
    .collection(COLLECTIONS.RESOURCES)
    .where('type', '==', resourceType)
    .where('status', '==', 'available')
    .limit(1)
    .get();

  if (snapshot.empty) {
    console.log(`[autoDispatch] No available ${resourceType} resources found`);
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
