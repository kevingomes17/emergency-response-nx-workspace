import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { db, collection, query, where, orderBy, onSnapshot } from '../firebase';

export type IncidentType = 'fire' | 'medical' | 'security' | 'water_leakage' | 'power_failure';
export type IncidentSeverity = 'critical' | 'high' | 'medium' | 'low';
export type IncidentStatus = 'reported' | 'acknowledged' | 'dispatched' | 'in_progress' | 'en_route' | 'on_scene' | 'resolved' | 'closed';

export interface Incident {
  incident_id: string;
  type: IncidentType;
  severity: IncidentSeverity;
  status: IncidentStatus;
  location: { lat: number; lng: number };
  description?: string;
  reported_by?: string;
  assigned_units: string[];
  escalation_level: number;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
}

const severityColors: Record<IncidentSeverity, string> = {
  critical: '#d32f2f',
  high: '#f44336',
  medium: '#ff9800',
  low: '#4caf50',
};

const typeIcons: Record<IncidentType, string> = {
  fire: '🔥',
  medical: '🏥',
  security: '🚨',
  water_leakage: '💧',
  power_failure: '⚡',
};

const statusLabels: Record<string, string> = {
  reported: 'Reported',
  acknowledged: 'Acknowledged',
  dispatched: 'Dispatched',
  in_progress: 'In Progress',
  en_route: 'En Route',
  on_scene: 'On Scene',
  resolved: 'Resolved',
  closed: 'Closed',
};

interface Props {
  unitId?: string;
  onSelectIncident: (incident: Incident) => void;
}

export const AssignmentsScreen: React.FC<Props> = ({ unitId, onSelectIncident }) => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!unitId) {
      setIncidents([]);
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      collection(db, 'incidents'),
      (snapshot) => {
        const all = snapshot.docs.map((d) => ({
          ...d.data(),
          incident_id: d.id,
        })) as Incident[];
        const filtered = all
          .filter((i) => i.assigned_units?.includes(unitId))
          .sort((a, b) => b.created_at.localeCompare(a.created_at));
        setIncidents(filtered);
        setLoading(false);
      },
      (error) => {
        console.error('[field-app] Firestore error:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [unitId]);

  const activeIncidents = incidents.filter(
    (i) => i.status !== 'resolved' && i.status !== 'closed'
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6c8cff" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.header}>Active Assignments</Text>
      <Text style={styles.subtitle}>
        {activeIncidents.length} active incidents
      </Text>

      {activeIncidents.length === 0 && (
        <Text style={styles.emptyText}>No active incidents</Text>
      )}

      {activeIncidents.map((incident) => (
        <TouchableOpacity
          key={incident.incident_id}
          style={[
            styles.card,
            { borderLeftColor: severityColors[incident.severity] },
          ]}
          onPress={() => onSelectIncident(incident)}
          activeOpacity={0.7}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.typeIcon}>
              {typeIcons[incident.type] ?? '📋'}
            </Text>
            <View style={styles.cardHeaderText}>
              <Text style={styles.incidentId}>{incident.incident_id}</Text>
              <Text style={styles.cardTitle}>
                {incident.type.replace('_', ' ').toUpperCase()} Incident
              </Text>
            </View>
            <View
              style={[
                styles.severityBadge,
                { backgroundColor: severityColors[incident.severity] },
              ]}
            >
              <Text style={styles.severityText}>
                {incident.severity.toUpperCase()}
              </Text>
            </View>
          </View>

          {incident.description ? (
            <Text style={styles.description} numberOfLines={2}>
              {incident.description}
            </Text>
          ) : null}

          <View style={styles.cardFooter}>
            <View style={styles.statusPill}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>
                {statusLabels[incident.status] ?? incident.status}
              </Text>
            </View>
            <Text style={styles.location}>
              {incident.location.lat.toFixed(4)}, {incident.location.lng.toFixed(4)}
            </Text>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121220' },
  content: { padding: 16, paddingBottom: 32 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121220' },
  header: { fontSize: 28, fontWeight: '700', color: '#e0e0e0', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#888', marginBottom: 20 },
  emptyText: { fontSize: 16, color: '#666', textAlign: 'center', paddingTop: 40 },
  card: {
    backgroundColor: '#1e1e2e', borderRadius: 12, padding: 16,
    marginBottom: 12, borderLeftWidth: 3, borderLeftColor: '#f44336',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  typeIcon: { fontSize: 24, marginRight: 10 },
  cardHeaderText: { flex: 1 },
  incidentId: { fontSize: 11, color: '#666', fontFamily: 'Courier New', marginBottom: 2 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#e0e0e0' },
  severityBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, marginLeft: 8 },
  severityText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  description: { fontSize: 13, color: '#aaa', lineHeight: 18, marginBottom: 12 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#2a2a3e',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4caf50', marginRight: 6 },
  statusText: { fontSize: 12, color: '#e0e0e0' },
  location: { fontSize: 11, color: '#666', flex: 1, textAlign: 'right', marginLeft: 8 },
});
