import * as admin from 'firebase-admin';
import { resolve } from 'path';

// Load .env for Supabase credentials (needed in emulator; deployed functions load .env automatically)
// eslint-disable-next-line @typescript-eslint/no-require-imports
require('dotenv').config({ path: resolve(__dirname, '.env') });

admin.initializeApp();

export { ingestIncident, ingestResource } from './ingestion';
export { onIncidentCreated, onIncidentUpdated } from './triggers';
export { periodicEscalation } from './scheduled';
export { sendNotification } from './notifications';
