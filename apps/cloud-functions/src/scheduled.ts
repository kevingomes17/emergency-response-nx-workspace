import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';
import type { Incident, Alert } from '@emergency-response/shared/data-models';
import { COLLECTIONS } from '@emergency-response/shared/data-models';
import {
  evaluateEscalation,
  DEFAULT_ESCALATION_RULES,
  getAlertPriorityForSeverity,
} from '@emergency-response/shared/util-escalation';

const db = admin.firestore();

export const periodicEscalation = onSchedule('every 2 minutes', async () => {
  const now = new Date();

  const snapshot = await db
    .collection(COLLECTIONS.INCIDENTS)
    .where('status', '==', 'reported')
    .get();

  const batch = db.batch();
  let writeCount = 0;

  for (const doc of snapshot.docs) {
    const incident = doc.data() as Incident;
    const actions = evaluateEscalation(incident, DEFAULT_ESCALATION_RULES, now);

    for (const action of actions) {
      if (action.type === 'escalate' && action.new_escalation_level) {
        batch.update(doc.ref, {
          escalation_level: action.new_escalation_level,
          updated_at: now.toISOString(),
        });

        const alertRef = db.collection(COLLECTIONS.ALERTS).doc();
        const alert: Alert = {
          alert_id: alertRef.id,
          incident_id: incident.incident_id,
          target_user_ids: [],
          target_roles: action.target_roles,
          channel: 'in_app',
          priority: getAlertPriorityForSeverity(incident.severity),
          title: `ESCALATION: ${incident.type.replace('_', ' ')} incident`,
          body: action.reason,
          acknowledged: false,
          created_at: now.toISOString(),
        };
        batch.set(alertRef, alert);

        writeCount++;
      }
    }
  }

  if (writeCount > 0) {
    await batch.commit();
    console.log(`Escalated ${writeCount} incidents`);
  }
});
