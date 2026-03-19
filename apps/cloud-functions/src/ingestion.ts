import { onRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import type {
  Incident,
  Resource,
  IncidentType,
  ResourceType,
  ResourceStatus,
} from '@emergency-response/shared/data-models';
import { COLLECTIONS } from '@emergency-response/shared/data-models';
import { scoreSeverity } from '@emergency-response/shared/util-severity';

const db = admin.firestore();

const VALID_INCIDENT_TYPES: IncidentType[] = [
  'fire', 'medical', 'security', 'water_leakage', 'power_failure',
];

const VALID_RESOURCE_TYPES: ResourceType[] = [
  'ambulance', 'fire_truck', 'police', 'maintenance', 'electrician',
];

const VALID_RESOURCE_STATUSES: ResourceStatus[] = [
  'available', 'dispatched', 'en_route', 'on_scene', 'offline',
];

export const ingestIncident = onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { type, location, description, reported_by, casualties, affected_area, hazardous_materials, structural_damage } = req.body;

  if (!type || !VALID_INCIDENT_TYPES.includes(type)) {
    res.status(400).json({ error: `Invalid incident type. Must be one of: ${VALID_INCIDENT_TYPES.join(', ')}` });
    return;
  }

  if (!location?.lat || !location?.lng) {
    res.status(400).json({ error: 'Location with lat and lng is required' });
    return;
  }

  const severity = scoreSeverity({
    type,
    casualties,
    affectedArea: affected_area,
    hazardousMaterials: hazardous_materials,
    structuralDamage: structural_damage,
  });

  const now = new Date().toISOString();
  const docRef = db.collection(COLLECTIONS.INCIDENTS).doc();

  const incident: Incident = {
    incident_id: docRef.id,
    type,
    severity,
    status: 'reported',
    location: { lat: location.lat, lng: location.lng },
    description: description || '',
    reported_by: reported_by || 'anonymous',
    assigned_units: [],
    escalation_level: 0,
    created_at: now,
    updated_at: now,
  };

  await docRef.set(incident);

  res.status(201).json({ incident_id: incident.incident_id, severity, status: 'reported' });
});

export const ingestResource = onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { unit_id, type, status, location, capacity } = req.body;

  if (!unit_id) {
    res.status(400).json({ error: 'unit_id is required' });
    return;
  }

  if (!type || !VALID_RESOURCE_TYPES.includes(type)) {
    res.status(400).json({ error: `Invalid resource type. Must be one of: ${VALID_RESOURCE_TYPES.join(', ')}` });
    return;
  }

  if (status && !VALID_RESOURCE_STATUSES.includes(status)) {
    res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_RESOURCE_STATUSES.join(', ')}` });
    return;
  }

  if (!location?.lat || !location?.lng) {
    res.status(400).json({ error: 'Location with lat and lng is required' });
    return;
  }

  const now = new Date().toISOString();
  const docRef = db.collection(COLLECTIONS.RESOURCES).doc(unit_id);

  const resource: Resource = {
    unit_id,
    type,
    status: status || 'available',
    location: { lat: location.lat, lng: location.lng },
    capacity: capacity || 1,
    last_updated: now,
  };

  await docRef.set(resource, { merge: true });

  res.status(200).json({ unit_id: resource.unit_id, status: resource.status });
});
