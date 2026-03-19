import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';
import type {
  Incident,
  Alert,
  Resource,
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

    for (const action of actions) {
      if (action.type === 'notify') {
        await createAlert(incident, action.target_roles, action.reason);
      }

      if (action.type === 'auto_dispatch') {
        await autoDispatch(incident);
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

    // Only re-evaluate if status changed
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

  const snapshot = await db
    .collection(COLLECTIONS.RESOURCES)
    .where('type', '==', resourceType)
    .where('status', '==', 'available')
    .limit(1)
    .get();

  if (snapshot.empty) return;

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
    assigned_units: admin.firestore.FieldValue.arrayUnion(unitId),
    updated_at: new Date().toISOString(),
  });

  await batch.commit();
}
