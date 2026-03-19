import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { db, collection, doc, updateDoc } from '../firebase';
import { setDoc } from 'firebase/firestore';

type IncidentType = 'fire' | 'medical' | 'security' | 'water_leakage' | 'power_failure';

const INCIDENT_TYPES: { key: IncidentType; label: string; icon: string }[] = [
  { key: 'fire', label: 'Fire', icon: '🔥' },
  { key: 'medical', label: 'Medical', icon: '🏥' },
  { key: 'security', label: 'Security', icon: '🚨' },
  { key: 'water_leakage', label: 'Water Leak', icon: '💧' },
  { key: 'power_failure', label: 'Power Failure', icon: '⚡' },
];

interface Props {
  reporterName: string;
  reporterEmail: string;
  onSubmitted: () => void;
}

export const ReportIncidentScreen: React.FC<Props> = ({ reporterName, reporterEmail, onSubmitted }) => {
  const [selectedType, setSelectedType] = useState<IncidentType | null>(null);
  const [description, setDescription] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [locationStatus, setLocationStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationStatus('error');
      setLat('37.7749');
      setLng('-122.4194');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLat(position.coords.latitude.toFixed(6));
        setLng(position.coords.longitude.toFixed(6));
        setLocationStatus('success');
      },
      () => {
        setLocationStatus('error');
        setLat('37.7749');
        setLng('-122.4194');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const canSubmit = selectedType && description.trim().length > 0;

  const handleSubmit = async () => {
    if (!canSubmit || !selectedType) return;

    setSubmitting(true);
    try {
      const now = new Date().toISOString();
      const incidentRef = doc(collection(db, 'incidents'));

      await setDoc(incidentRef, {
        incident_id: incidentRef.id,
        type: selectedType,
        severity: 'medium', // default; cloud function can re-score
        status: 'reported',
        location: { lat: parseFloat(lat) || 0, lng: parseFloat(lng) || 0 },
        description: description.trim(),
        reported_by: reporterName,
        reporter_email: reporterEmail,
        assigned_units: [],
        escalation_level: 0,
        created_at: now,
        updated_at: now,
      });

      setSelectedType(null);
      setDescription('');
      onSubmitted();
    } catch (err) {
      console.error('Failed to submit incident:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.header}>Report an Emergency</Text>
      <Text style={styles.subtitle}>Select the type and describe the situation</Text>

      <Text style={styles.label}>Type of Emergency</Text>
      <View style={styles.typeGrid}>
        {INCIDENT_TYPES.map((t) => {
          const isSelected = selectedType === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              style={[styles.typeCard, isSelected && styles.typeCardSelected]}
              onPress={() => setSelectedType(t.key)}
              activeOpacity={0.7}
            >
              <Text style={styles.typeIcon}>{t.icon}</Text>
              <Text style={[styles.typeLabel, isSelected && styles.typeLabelSelected]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.label}>Description</Text>
      <TextInput
        style={styles.textInput}
        value={description}
        onChangeText={setDescription}
        placeholder="What is happening? Include details..."
        placeholderTextColor="#555"
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />

      <Text style={styles.label}>Your Location</Text>
      <View style={styles.locationCard}>
        {locationStatus === 'loading' ? (
          <View style={styles.locationLoading}>
            <ActivityIndicator size="small" color="#6c8cff" />
            <Text style={styles.locationLoadingText}>Detecting your location...</Text>
          </View>
        ) : (
          <>
            <View style={styles.locationHeader}>
              <Text style={styles.locationIcon}>📍</Text>
              <Text style={locationStatus === 'success' ? styles.locationDetected : styles.locationFallback}>
                {locationStatus === 'success' ? 'Location detected' : 'Using default location (GPS unavailable)'}
              </Text>
            </View>
            <View style={styles.locationRow}>
              <View style={styles.locationField}>
                <Text style={styles.locationLabel}>Lat</Text>
                <TextInput
                  style={styles.locationInput}
                  value={lat}
                  onChangeText={setLat}
                  keyboardType="numeric"
                  placeholderTextColor="#555"
                />
              </View>
              <View style={styles.locationField}>
                <Text style={styles.locationLabel}>Lng</Text>
                <TextInput
                  style={styles.locationInput}
                  value={lng}
                  onChangeText={setLng}
                  keyboardType="numeric"
                  placeholderTextColor="#555"
                />
              </View>
            </View>
          </>
        )}
      </View>

      <TouchableOpacity
        style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={!canSubmit || submitting}
        activeOpacity={0.7}
      >
        <Text style={styles.submitButtonText}>
          {submitting ? 'Submitting...' : 'Submit Report'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121220' },
  content: { padding: 16, paddingBottom: 40 },
  header: { fontSize: 28, fontWeight: '700', color: '#e0e0e0', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#888', marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '600', color: '#aaa', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  typeCard: {
    width: '30%', backgroundColor: '#1e1e2e', borderRadius: 12,
    padding: 14, alignItems: 'center', borderWidth: 2, borderColor: 'transparent',
  },
  typeCardSelected: { borderColor: '#6c8cff', backgroundColor: '#1e1e3e' },
  typeIcon: { fontSize: 28, marginBottom: 6 },
  typeLabel: { fontSize: 12, color: '#888', fontWeight: '600' },
  typeLabelSelected: { color: '#6c8cff' },
  textInput: {
    backgroundColor: '#1e1e2e', borderRadius: 10, padding: 14,
    color: '#e0e0e0', fontSize: 14, minHeight: 100, marginBottom: 24,
    borderWidth: 1, borderColor: '#2a2a3e',
  },
  locationCard: {
    backgroundColor: '#1e1e2e', borderRadius: 12, padding: 16,
    marginBottom: 32, borderWidth: 1, borderColor: '#2a2a3e',
  },
  locationLoading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  locationLoadingText: { fontSize: 14, color: '#888' },
  locationHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  locationIcon: { fontSize: 18, marginRight: 8 },
  locationDetected: { fontSize: 13, color: '#4caf50', fontWeight: '600' },
  locationFallback: { fontSize: 13, color: '#ff9800', fontWeight: '600' },
  locationRow: { flexDirection: 'row', gap: 12 },
  locationField: { flex: 1 },
  locationLabel: { fontSize: 12, color: '#666', marginBottom: 4 },
  locationInput: {
    backgroundColor: '#151525', borderRadius: 8, padding: 12,
    color: '#e0e0e0', fontSize: 14, borderWidth: 1, borderColor: '#2a2a3e',
  },
  submitButton: {
    backgroundColor: '#d32f2f', borderRadius: 12, paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: { opacity: 0.4 },
  submitButtonText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
