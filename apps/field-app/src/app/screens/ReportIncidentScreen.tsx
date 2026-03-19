import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import { db, collection, doc, updateDoc } from '../firebase';
import { setDoc } from 'firebase/firestore';

type IncidentType = 'fire' | 'medical' | 'security' | 'water_leakage' | 'power_failure';
type AffectedArea = 'small' | 'medium' | 'large';
type Severity = 'critical' | 'high' | 'medium' | 'low';

const BASE_SCORES: Record<IncidentType, number> = {
  fire: 3,
  medical: 2,
  security: 2,
  water_leakage: 1,
  power_failure: 1,
};

function scoreSeverity(input: {
  type: IncidentType;
  casualties?: number;
  affectedArea?: AffectedArea;
  hazardousMaterials?: boolean;
  structuralDamage?: boolean;
}): Severity {
  let score = BASE_SCORES[input.type];
  if (input.casualties && input.casualties > 0) {
    score += input.casualties >= 5 ? 3 : input.casualties >= 1 ? 2 : 0;
  }
  if (input.affectedArea === 'large') score += 2;
  else if (input.affectedArea === 'medium') score += 1;
  if (input.hazardousMaterials) score += 2;
  if (input.structuralDamage) score += 1;
  if (score >= 7) return 'critical';
  if (score >= 5) return 'high';
  if (score >= 3) return 'medium';
  return 'low';
}

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
  const [casualties, setCasualties] = useState('');
  const [affectedArea, setAffectedArea] = useState<AffectedArea>('small');
  const [hazardousMaterials, setHazardousMaterials] = useState(false);
  const [structuralDamage, setStructuralDamage] = useState(false);
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [locationStatus, setLocationStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchLocation = async () => {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'This app needs your location to report emergencies accurately.',
            buttonPositive: 'OK',
          }
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          setLocationStatus('error');
          setLat('37.7749');
          setLng('-122.4194');
          return;
        }
      }

      Geolocation.getCurrentPosition(
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
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    };

    fetchLocation();
  }, []);

  const canSubmit = selectedType && description.trim().length > 0;

  const handleSubmit = async () => {
    if (!canSubmit || !selectedType) return;

    setSubmitting(true);
    try {
      const now = new Date().toISOString();
      const incidentRef = doc(collection(db, 'incidents'));
      const casualtyCount = parseInt(casualties, 10) || 0;

      const severity = scoreSeverity({
        type: selectedType,
        casualties: casualtyCount,
        affectedArea: affectedArea,
        hazardousMaterials,
        structuralDamage,
      });

      await setDoc(incidentRef, {
        incident_id: incidentRef.id,
        type: selectedType,
        severity,
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
      setCasualties('');
      setAffectedArea('small');
      setHazardousMaterials(false);
      setStructuralDamage(false);
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

      <Text style={styles.label}>Situation Details</Text>
      <View style={styles.detailsCard}>
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Casualties</Text>
          <TextInput
            style={styles.fieldInput}
            value={casualties}
            onChangeText={setCasualties}
            placeholder="0"
            placeholderTextColor="#555"
            keyboardType="number-pad"
          />
        </View>

        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Affected Area</Text>
          <View style={styles.segmentRow}>
            {(['small', 'medium', 'large'] as AffectedArea[]).map((size) => (
              <TouchableOpacity
                key={size}
                style={[styles.segmentBtn, affectedArea === size && styles.segmentBtnActive]}
                onPress={() => setAffectedArea(size)}
                activeOpacity={0.7}
              >
                <Text style={[styles.segmentText, affectedArea === size && styles.segmentTextActive]}>
                  {size.charAt(0).toUpperCase() + size.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={styles.toggleRow}
          onPress={() => setHazardousMaterials(!hazardousMaterials)}
          activeOpacity={0.7}
        >
          <Text style={styles.fieldLabel}>Hazardous Materials</Text>
          <View style={[styles.toggle, hazardousMaterials && styles.toggleActive]}>
            <View style={[styles.toggleThumb, hazardousMaterials && styles.toggleThumbActive]} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.toggleRow, { borderBottomWidth: 0 }]}
          onPress={() => setStructuralDamage(!structuralDamage)}
          activeOpacity={0.7}
        >
          <Text style={styles.fieldLabel}>Structural Damage</Text>
          <View style={[styles.toggle, structuralDamage && styles.toggleActive]}>
            <View style={[styles.toggleThumb, structuralDamage && styles.toggleThumbActive]} />
          </View>
        </TouchableOpacity>
      </View>

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
  detailsCard: {
    backgroundColor: '#1e1e2e', borderRadius: 12, padding: 16,
    marginBottom: 24, borderWidth: 1, borderColor: '#2a2a3e',
  },
  fieldRow: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13, color: '#aaa', fontWeight: '500', marginBottom: 8,
  },
  fieldInput: {
    backgroundColor: '#151525', borderRadius: 8, padding: 12,
    color: '#e0e0e0', fontSize: 14, borderWidth: 1, borderColor: '#2a2a3e',
    width: 80,
  },
  segmentRow: {
    flexDirection: 'row', gap: 8,
  },
  segmentBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 8,
    backgroundColor: '#151525', alignItems: 'center',
    borderWidth: 1, borderColor: '#2a2a3e',
  },
  segmentBtnActive: {
    backgroundColor: '#1e1e3e', borderColor: '#6c8cff',
  },
  segmentText: {
    fontSize: 13, color: '#666', fontWeight: '600',
  },
  segmentTextActive: {
    color: '#6c8cff',
  },
  toggleRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#2a2a3e',
  },
  toggle: {
    width: 44, height: 24, borderRadius: 12,
    backgroundColor: '#333', justifyContent: 'center', paddingHorizontal: 2,
  },
  toggleActive: {
    backgroundColor: '#6c8cff',
  },
  toggleThumb: {
    width: 20, height: 20, borderRadius: 10, backgroundColor: '#888',
  },
  toggleThumbActive: {
    alignSelf: 'flex-end', backgroundColor: '#fff',
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
