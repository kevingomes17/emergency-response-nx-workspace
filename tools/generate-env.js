/**
 * Reads .env and generates apps/control-room/src/environments/environment.ts
 * Run automatically before serve/build via project.json dependsOn.
 */
const dotenv = require('dotenv');
const { resolve } = require('path');
const { writeFileSync, mkdirSync } = require('fs');

dotenv.config({ path: resolve(__dirname, '../.env') });

const dir = resolve(__dirname, '../apps/control-room/src/environments');
mkdirSync(dir, { recursive: true });

const useEmulator = process.env.VITE_USE_FIREBASE_EMULATOR === 'true';

const content = `// Auto-generated from .env — do not edit manually
export const environment = {
  useEmulator: ${useEmulator},
  firebase: {
    projectId: '${process.env.VITE_FIREBASE_PROJECT_ID || ''}',
    appId: '${process.env.VITE_FIREBASE_APP_ID || ''}',
    storageBucket: '${process.env.VITE_FIREBASE_STORAGE_BUCKET || ''}',
    apiKey: '${process.env.VITE_FIREBASE_API_KEY || ''}',
    authDomain: '${process.env.VITE_FIREBASE_AUTH_DOMAIN || ''}',
    messagingSenderId: '${process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || ''}',
    measurementId: '${process.env.VITE_FIREBASE_MEASUREMENT_ID || ''}',
  },
  supabase: {
    url: '${process.env.VITE_SUPABASE_URL || ''}',
    anonKey: '${process.env.VITE_SUPABASE_ANON_KEY || ''}',
  },
};
`;

writeFileSync(resolve(dir, 'environment.ts'), content);
console.log(`Generated environment.ts from .env (emulator: ${useEmulator})`);
