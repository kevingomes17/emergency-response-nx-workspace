import * as admin from 'firebase-admin';

admin.initializeApp();

export { ingestIncident, ingestResource } from './ingestion';
export { onIncidentCreated, onIncidentUpdated } from './triggers';
export { periodicEscalation } from './scheduled';
export { sendNotification } from './notifications';
