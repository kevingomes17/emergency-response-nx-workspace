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
import { environment } from './environment';

const app = initializeApp(environment.firebase, 'field-app');
const db = getFirestore(app);

if (environment.useEmulator) {
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
