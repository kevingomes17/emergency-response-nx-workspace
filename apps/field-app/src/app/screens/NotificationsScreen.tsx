import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { db, collection, query, orderBy, onSnapshot, doc, updateDoc } from '../firebase';

interface Alert {
  alert_id: string;
  incident_id: string;
  target_roles: string[];
  priority: 'urgent' | 'high' | 'normal' | 'low';
  title: string;
  body: string;
  acknowledged: boolean;
  created_at: string;
}

const priorityConfig: Record<string, { color: string; label: string; icon: string }> = {
  urgent: { color: '#d32f2f', label: 'URGENT', icon: '🔴' },
  high: { color: '#f44336', label: 'HIGH', icon: '🟠' },
  normal: { color: '#2196f3', label: 'NORMAL', icon: '🔵' },
  low: { color: '#4caf50', label: 'LOW', icon: '🟢' },
};

interface Props {
  userId: string;
  userRole: string;
  onViewIncident?: (incidentId: string) => void;
}

export const NotificationsScreen: React.FC<Props> = ({ userId, userRole, onViewIncident }) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'alerts'),
      (snapshot) => {
        const data = snapshot.docs.map((d) => ({
          ...d.data(),
          alert_id: d.id,
        })) as Alert[];
        const filtered = data.filter(
          (a) =>
            a.target_user_ids?.includes(userId) ||
            a.target_roles?.includes(userRole)
        );
        filtered.sort((a, b) => b.created_at.localeCompare(a.created_at));
        setAlerts(filtered);
        setLoading(false);
      },
      (error) => {
        console.error('[field-app] Alerts error:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId, userRole]);

  const handleAcknowledge = async (alertId: string) => {
    try {
      await updateDoc(doc(db, 'alerts', alertId), { acknowledged: true });
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
    }
  };

  const unacknowledgedCount = alerts.filter((a) => !a.acknowledged).length;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6c8cff" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.header}>Notifications</Text>
      <Text style={styles.subtitle}>
        {unacknowledgedCount} unacknowledged
      </Text>

      {alerts.length === 0 && (
        <Text style={styles.emptyText}>No notifications</Text>
      )}

      {alerts.map((alert) => {
        const config = priorityConfig[alert.priority] ?? priorityConfig['normal'];
        return (
          <View
            key={alert.alert_id}
            style={[
              styles.card,
              !alert.acknowledged && styles.cardUnread,
              { borderLeftColor: config.color },
            ]}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.priorityIcon}>{config.icon}</Text>
              <View style={styles.cardHeaderText}>
                <Text style={styles.cardTitle}>{alert.title}</Text>
                <Text style={styles.timestamp}>
                  {formatTimestamp(alert.created_at)}
                </Text>
              </View>
              <View style={[styles.priorityBadge, { backgroundColor: config.color }]}>
                <Text style={styles.priorityText}>{config.label}</Text>
              </View>
            </View>

            <Text style={styles.message}>{alert.body}</Text>

            <View style={styles.cardActions}>
              {!alert.acknowledged ? (
                <TouchableOpacity
                  style={styles.ackButton}
                  onPress={() => handleAcknowledge(alert.alert_id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.ackButtonText}>Acknowledge</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.ackBadge}>
                  <Text style={styles.ackBadgeText}>Acknowledged</Text>
                </View>
              )}
              {onViewIncident && alert.incident_id && (
                <TouchableOpacity
                  style={styles.viewButton}
                  onPress={() => onViewIncident(alert.incident_id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.viewButtonText}>View Incident</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
};

function formatTimestamp(isoString: string): string {
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return isoString;
  const now = new Date();
  const diffMin = Math.floor((now.getTime() - d.getTime()) / 60_000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hr ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121220' },
  content: { padding: 16, paddingBottom: 32 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121220' },
  header: { fontSize: 28, fontWeight: '700', color: '#e0e0e0', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#888', marginBottom: 20 },
  emptyText: { fontSize: 16, color: '#666', textAlign: 'center', paddingTop: 40 },
  card: {
    backgroundColor: '#1e1e2e', borderRadius: 12, padding: 16,
    marginBottom: 12, borderLeftWidth: 3, borderLeftColor: '#2196f3',
  },
  cardUnread: { backgroundColor: '#1e1e34' },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  priorityIcon: { fontSize: 16, marginRight: 8, marginTop: 2 },
  cardHeaderText: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#e0e0e0' },
  timestamp: { fontSize: 11, color: '#666', marginTop: 2 },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, marginLeft: 8 },
  priorityText: { fontSize: 9, fontWeight: '700', color: '#fff' },
  message: { fontSize: 13, color: '#aaa', lineHeight: 18, marginBottom: 12 },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ackButton: {
    backgroundColor: '#2a2a4e', paddingVertical: 8, paddingHorizontal: 16,
    borderRadius: 6, borderWidth: 1, borderColor: '#3a3a5e',
  },
  ackButtonText: { fontSize: 13, fontWeight: '600', color: '#6c8cff' },
  viewButton: {
    backgroundColor: '#2a2a4e', paddingVertical: 8, paddingHorizontal: 16,
    borderRadius: 6, borderWidth: 1, borderColor: '#3a3a5e',
  },
  viewButtonText: { fontSize: 13, fontWeight: '600', color: '#ff9800' },
  ackBadge: {},
  ackBadgeText: { fontSize: 12, color: '#4caf50', fontWeight: '500' },
});
