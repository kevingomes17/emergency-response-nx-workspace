/**
 * Reads .env and generates apps/field-app/src/app/environment.ts
 * Run before serve/build via project.json dependsOn.
 */
const dotenv = require('dotenv');
const { resolve } = require('path');
const { writeFileSync } = require('fs');

dotenv.config({ path: resolve(__dirname, '../.env') });

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
  },
};
`;

const outPath = resolve(__dirname, '../apps/field-app/src/app/environment.ts');
writeFileSync(outPath, content);
console.log(`Generated field-app environment.ts from .env (emulator: ${useEmulator})`);
