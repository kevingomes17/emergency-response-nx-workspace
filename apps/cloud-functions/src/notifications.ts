import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';
import type { Alert, User } from '@emergency-response/shared/data-models';
import { COLLECTIONS } from '@emergency-response/shared/data-models';

const db = admin.firestore();

export const sendNotification = onDocumentCreated(
  `${COLLECTIONS.ALERTS}/{alertId}`,
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const alert = snapshot.data() as Alert;
    const tokens: string[] = [];

    // Collect FCM tokens from targeted users
    if (alert.target_user_ids.length > 0) {
      const userDocs = await Promise.all(
        alert.target_user_ids.map((uid) =>
          db.collection(COLLECTIONS.USERS).doc(uid).get()
        )
      );
      for (const doc of userDocs) {
        if (doc.exists) {
          const user = doc.data() as User;
          tokens.push(...user.fcm_tokens);
        }
      }
    }

    // Collect FCM tokens from targeted roles
    if (alert.target_roles.length > 0) {
      const roleSnapshot = await db
        .collection(COLLECTIONS.USERS)
        .where('role', 'in', alert.target_roles)
        .where('is_active', '==', true)
        .get();

      for (const doc of roleSnapshot.docs) {
        const user = doc.data() as User;
        tokens.push(...user.fcm_tokens);
      }
    }

    // Deduplicate tokens
    const uniqueTokens = [...new Set(tokens)];

    if (uniqueTokens.length === 0) {
      console.log(`No FCM tokens found for alert ${alert.alert_id}`);
      return;
    }

    const message: admin.messaging.MulticastMessage = {
      tokens: uniqueTokens,
      notification: {
        title: alert.title,
        body: alert.body,
      },
      data: {
        alert_id: alert.alert_id,
        incident_id: alert.incident_id,
        priority: alert.priority,
      },
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    console.log(
      `Sent ${response.successCount}/${uniqueTokens.length} notifications for alert ${alert.alert_id}`
    );
  }
);
