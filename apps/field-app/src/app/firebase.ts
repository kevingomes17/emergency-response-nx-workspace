import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  connectFirestoreEmulator,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
} from 'firebase/firestore';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const env = (import.meta as any).env ?? {};

const firebaseConfig = {
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  appId: env.VITE_FIREBASE_APP_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
};

// console.log('[field-app] Firebase config:', { projectId: firebaseConfig.projectId, emulator: env.VITE_USE_FIREBASE_EMULATOR });

const app = initializeApp(firebaseConfig, 'field-app');
const db = getFirestore(app);

if (env.VITE_USE_FIREBASE_EMULATOR === 'true') {
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  console.log('[field-app] Connected to Firestore emulator');
}

// Debug: test basic Firestore connectivity
import { getDocs } from 'firebase/firestore';
getDocs(collection(db, 'users')).then((snap) => {
  snap.docs.forEach((d) => console.log('[field-app] DEBUG user:', d.id, d.data()));
}).catch((err) => {
  console.error('[field-app] DEBUG Firestore fetch failed:', err);
});

export {
  db,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
};
