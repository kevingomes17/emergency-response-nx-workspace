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
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { Platform } from 'react-native';
import { environment } from './environment';

const app = initializeApp(environment.firebase, 'field-app');
const db = getFirestore(app);

if (environment.useEmulator) {
  const emulatorHost = Platform.OS === 'android' ? '10.0.2.2' : '127.0.0.1';
  connectFirestoreEmulator(db, emulatorHost, 8080);
  console.log(`[field-app] Connected to Firestore emulator at ${emulatorHost}:8080`);
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
  arrayUnion,
  arrayRemove,
};
