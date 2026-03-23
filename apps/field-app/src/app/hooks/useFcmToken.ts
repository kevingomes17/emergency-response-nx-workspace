import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import {
  requestNotificationPermission,
  getFcmToken,
  registerTokenForUser,
  removeTokenForUser,
  onTokenRefresh,
} from '../fcm';

export function useFcmToken(userId: string | null) {
  const tokenRef = useRef<string | null>(null);
  const prevUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    // FCM is not available on web — @react-native-firebase requires native modules
    if (Platform.OS === 'web') return;

    if (!userId) {
      // User logged out — clean up token from previous user
      if (prevUserIdRef.current && tokenRef.current) {
        removeTokenForUser(prevUserIdRef.current, tokenRef.current).catch(
          (err) => console.warn('[fcm] Failed to remove token on logout:', err)
        );
        tokenRef.current = null;
      }
      prevUserIdRef.current = null;
      return;
    }

    let cancelled = false;

    async function setup() {
      // If switching users, remove token from previous user first
      if (prevUserIdRef.current && prevUserIdRef.current !== userId && tokenRef.current) {
        await removeTokenForUser(prevUserIdRef.current, tokenRef.current).catch(
          (err) => console.warn('[fcm] Failed to remove token from previous user:', err)
        );
      }

      const granted = await requestNotificationPermission();
      if (!granted || cancelled) return;

      const token = await getFcmToken();
      if (cancelled) return;

      tokenRef.current = token;
      prevUserIdRef.current = userId;

      await registerTokenForUser(userId, token).catch((err) =>
        console.warn('[fcm] Failed to register token:', err)
      );
    }

    setup();

    const unsubRefresh = onTokenRefresh(async (newToken) => {
      if (!userId) return;

      const oldToken = tokenRef.current;
      tokenRef.current = newToken;

      if (oldToken) {
        await removeTokenForUser(userId, oldToken).catch((err) =>
          console.warn('[fcm] Failed to remove old token:', err)
        );
      }
      await registerTokenForUser(userId, newToken).catch((err) =>
        console.warn('[fcm] Failed to register refreshed token:', err)
      );
    });

    return () => {
      cancelled = true;
      unsubRefresh();

      // Clean up token from Firestore on unmount
      if (userId && tokenRef.current) {
        removeTokenForUser(userId, tokenRef.current).catch((err) =>
          console.warn('[fcm] Failed to remove token on unmount:', err)
        );
        tokenRef.current = null;
      }
    };
  }, [userId]);
}
