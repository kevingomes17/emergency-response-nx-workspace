import '@react-native-firebase/app';
import {
  getMessaging,
  requestPermission,
  getToken,
  onTokenRefresh as onTokenRefreshEvent,
  AuthorizationStatus,
} from '@react-native-firebase/messaging';
import { db, doc, updateDoc, arrayUnion, arrayRemove } from './firebase';

export async function requestNotificationPermission(): Promise<boolean> {
  const messaging = getMessaging();
  const authStatus = await requestPermission(messaging);
  return (
    authStatus === AuthorizationStatus.AUTHORIZED ||
    authStatus === AuthorizationStatus.PROVISIONAL
  );
}

export async function getFcmToken(): Promise<string> {
  const messaging = getMessaging();
  return getToken(messaging);
}

export async function registerTokenForUser(
  userId: string,
  token: string
): Promise<void> {
  await updateDoc(doc(db, 'users', userId), {
    fcm_tokens: arrayUnion(token),
  });
}

export async function removeTokenForUser(
  userId: string,
  token: string
): Promise<void> {
  await updateDoc(doc(db, 'users', userId), {
    fcm_tokens: arrayRemove(token),
  });
}

export function onTokenRefresh(callback: (token: string) => void) {
  const messaging = getMessaging();
  return onTokenRefreshEvent(messaging, callback);
}
