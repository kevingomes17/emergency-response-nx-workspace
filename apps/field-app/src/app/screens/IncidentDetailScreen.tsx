import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import type { Incident, IncidentStatus } from './AssignmentsScreen';
import { db, doc, updateDoc } from '../firebase';

const severityColors: Record<string, string> = {
  low: '#4caf50',
  medium: '#ff9800',
  high: '#f44336',
  critical: '#d32f2f',
};

const statusConfig: { key: IncidentStatus; label: string; color: string }[] = [
  { key: 'en_route', label: 'En Route', color: '#2196f3' },
  { key: 'on_scene', label: 'On Scene', color: '#ff9800' },
  { key: 'resolved', label: 'Resolved', color: '#4caf50' },
];

interface Props {
  incident: Incident;
  onBack: () => void;
}

export const IncidentDetailScreen: React.FC<Props> = ({ incident, onBack }) => {
  const [currentStatus, setCurrentStatus] = useState<IncidentStatus>(incident.status);
  const [timeline, setTimeline] = useState([
    { time: formatTime(incident.created_at), event: 'Incident reported', icon: '📞' },
  ]);

  const handleStatusUpdate = async (newStatus: IncidentStatus) => {
    setCurrentStatus(newStatus);

    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const labels: Record<string, string> = {
      en_route: 'Responder en route to scene',
      on_scene: 'Responder arrived on scene',
      resolved: 'Incident marked as resolved',
    };
    const icons: Record<string, string> = {
      en_route: '🚗',
      on_scene: '📍',
      resolved: '✅',
    };

    setTimeline((prev) => [
      ...prev,
      { time: timeStr, event: labels[newStatus], icon: icons[newStatus] },
    ]);

    // Update Firestore
    try {
      const incidentRef = doc(db, 'incidents', incident.incident_id);
      const updateData: Record<string, string> = {
        status: newStatus,
        updated_at: now.toISOString(),
      };
      if (newStatus === 'resolved') {
        updateData['resolved_at'] = now.toISOString();
      }
      await updateDoc(incidentRef, updateData);
    } catch (err) {
      console.error('Failed to update incident status:', err);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Text style={styles.backText}>{'< Back'}</Text>
      </TouchableOpacity>

      <View style={styles.headerSection}>
        <View style={styles.idRow}>
          <Text style={styles.incidentId}>{incident.incident_id}</Text>
          <View
            style={[styles.severityBadge, { backgroundColor: severityColors[incident.severity] }]}
          >
            <Text style={styles.severityText}>{incident.severity.toUpperCase()}</Text>
          </View>
        </View>
        <Text style={styles.title}>
          {incident.type.replace('_', ' ').toUpperCase()} Incident
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Update Status</Text>
        <View style={styles.statusRow}>
          {statusConfig.map((s) => {
            const isActive = currentStatus === s.key;
            const isDisabled = currentStatus === 'resolved' && s.key !== 'resolved';
            return (
              <TouchableOpacity
                key={s.key}
                style={[
                  styles.statusButton,
                  isActive && { backgroundColor: s.color },
                  isDisabled && styles.statusButtonDisabled,
                ]}
                onPress={() => !isDisabled && handleStatusUpdate(s.key)}
                activeOpacity={isDisabled ? 1 : 0.7}
              >
                <Text
                  style={[
                    styles.statusButtonText,
                    isActive && styles.statusButtonTextActive,
                    isDisabled && styles.statusButtonTextDisabled,
                  ]}
                >
                  {s.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Location</Text>
        <View style={styles.locationCard}>
          <Text style={styles.locationIcon}>📍</Text>
          <View style={styles.locationInfo}>
            <Text style={styles.locationCoords}>
              {incident.location.lat.toFixed(4)}, {incident.location.lng.toFixed(4)}
            </Text>
          </View>
        </View>
      </View>

      {incident.description ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.descriptionText}>{incident.description}</Text>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Activity Timeline</Text>
        {timeline.map((entry, index) => (
          <View key={index} style={styles.timelineItem}>
            <View style={styles.timelineLeft}>
              <Text style={styles.timelineIcon}>{entry.icon}</Text>
              {index < timeline.length - 1 && <View style={styles.timelineLine} />}
            </View>
            <View style={styles.timelineContent}>
              <Text style={styles.timelineTime}>{entry.time}</Text>
              <Text style={styles.timelineEvent}>{entry.event}</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

function formatTime(isoString: string): string {
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '--:--';
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121220' },
  content: { padding: 16, paddingBottom: 40 },
  backButton: { paddingVertical: 8, marginBottom: 8 },
  backText: { fontSize: 16, color: '#6c8cff', fontWeight: '500' },
  headerSection: { marginBottom: 24 },
  idRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  incidentId: { fontSize: 13, color: '#666', fontFamily: 'Courier New', marginRight: 10 },
  severityBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  severityText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  title: { fontSize: 24, fontWeight: '700', color: '#e0e0e0', marginBottom: 4 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#e0e0e0', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  statusRow: { flexDirection: 'row', gap: 8 },
  statusButton: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: '#1e1e2e', alignItems: 'center', borderWidth: 1, borderColor: '#2a2a3e' },
  statusButtonDisabled: { opacity: 0.4 },
  statusButtonText: { fontSize: 13, fontWeight: '600', color: '#e0e0e0' },
  statusButtonTextActive: { color: '#fff' },
  statusButtonTextDisabled: { color: '#555' },
  locationCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e1e2e', padding: 16, borderRadius: 10 },
  locationIcon: { fontSize: 24, marginRight: 12 },
  locationInfo: { flex: 1 },
  locationCoords: { fontSize: 12, color: '#666', fontFamily: 'Courier New' },
  descriptionText: { fontSize: 14, color: '#bbb', lineHeight: 20, backgroundColor: '#1e1e2e', padding: 16, borderRadius: 10 },
  timelineItem: { flexDirection: 'row', minHeight: 50 },
  timelineLeft: { alignItems: 'center', width: 36 },
  timelineIcon: { fontSize: 18 },
  timelineLine: { width: 2, flex: 1, backgroundColor: '#2a2a3e', marginVertical: 4 },
  timelineContent: { flex: 1, paddingLeft: 10, paddingBottom: 16 },
  timelineTime: { fontSize: 12, color: '#666', fontFamily: 'Courier New', marginBottom: 2 },
  timelineEvent: { fontSize: 14, color: '#e0e0e0' },
});
