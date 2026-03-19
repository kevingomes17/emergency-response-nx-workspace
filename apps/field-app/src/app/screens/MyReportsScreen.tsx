import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { db, collection, onSnapshot } from '../firebase';

interface Incident {
  incident_id: string;
  type: string;
  severity: string;
  status: string;
  location: { lat: number; lng: number };
  description?: string;
  created_at: string;
}

const typeIcons: Record<string, string> = {
  fire: '🔥', medical: '🏥', security: '🚨', water_leakage: '💧', power_failure: '⚡',
};

const severityColors: Record<string, string> = {
  critical: '#d32f2f', high: '#f44336', medium: '#ff9800', low: '#4caf50',
};

const statusLabels: Record<string, { label: string; color: string }> = {
  reported: { label: 'Reported', color: '#888' },
  acknowledged: { label: 'Acknowledged', color: '#2196f3' },
  dispatched: { label: 'Help Dispatched', color: '#ff9800' },
  in_progress: { label: 'In Progress', color: '#ff9800' },
  en_route: { label: 'Help En Route', color: '#2196f3' },
  on_scene: { label: 'Help On Scene', color: '#4caf50' },
  resolved: { label: 'Resolved', color: '#4caf50' },
  closed: { label: 'Closed', color: '#666' },
};

function timeAgo(isoString: string): string {
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
  const diffMin = Math.floor((Date.now() - d.getTime()) / 60_000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

interface Props {
  reporterEmail: string;
}

export const MyReportsScreen: React.FC<Props> = ({ reporterEmail }) => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'incidents'),
      (snap) => {
        const all = snap.docs.map((d) => ({ ...d.data(), incident_id: d.id } as Incident));
        const mine = all
          .filter((i) => (i as Record<string, unknown>)['reporter_email'] === reporterEmail)
          .sort((a, b) => b.created_at.localeCompare(a.created_at));
        setIncidents(mine);
        setLoading(false);
      },
      (error) => {
        console.error('[field-app] My reports error:', error);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [reporterEmail]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6c8cff" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.header}>My Reports</Text>
      <Text style={styles.subtitle}>{incidents.length} reports submitted</Text>

      {incidents.length === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📝</Text>
          <Text style={styles.emptyText}>No reports yet</Text>
          <Text style={styles.emptyHint}>
            Go to the Report tab to submit an emergency report
          </Text>
        </View>
      )}

      {incidents.map((incident) => {
        const status = statusLabels[incident.status] ?? { label: incident.status, color: '#888' };
        return (
          <View key={incident.incident_id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.typeIcon}>{typeIcons[incident.type] ?? '📋'}</Text>
              <View style={styles.cardHeaderText}>
                <Text style={styles.cardTitle}>
                  {incident.type.replace('_', ' ').toUpperCase()}
                </Text>
                <Text style={styles.timeText}>{timeAgo(incident.created_at)}</Text>
              </View>
              <View style={[styles.severityBadge, { backgroundColor: severityColors[incident.severity] ?? '#888' }]}>
                <Text style={styles.severityText}>{incident.severity.toUpperCase()}</Text>
              </View>
            </View>

            {incident.description ? (
              <Text style={styles.description} numberOfLines={2}>{incident.description}</Text>
            ) : null}

            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: status.color }]} />
              <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121220' },
  content: { padding: 16, paddingBottom: 32 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121220' },
  header: { fontSize: 28, fontWeight: '700', color: '#e0e0e0', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#888', marginBottom: 20 },
  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#888', marginBottom: 4 },
  emptyHint: { fontSize: 14, color: '#555', textAlign: 'center' },
  card: {
    backgroundColor: '#1e1e2e', borderRadius: 12, padding: 16, marginBottom: 12,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  typeIcon: { fontSize: 24, marginRight: 10 },
  cardHeaderText: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#e0e0e0' },
  timeText: { fontSize: 11, color: '#666', marginTop: 2 },
  severityBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, marginLeft: 8 },
  severityText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  description: { fontSize: 13, color: '#aaa', lineHeight: 18, marginBottom: 10 },
  statusRow: { flexDirection: 'row', alignItems: 'center' },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  statusText: { fontSize: 14, fontWeight: '600' },
});
