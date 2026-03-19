import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  docData,
  updateDoc,
  query,
  orderBy,
  arrayUnion,
} from '@angular/fire/firestore';
import {
  Incident,
  IncidentStatus,
  COLLECTIONS,
} from '@emergency-response/shared/data-models';

@Injectable({ providedIn: 'root' })
export class IncidentService {
  private readonly firestore = inject(Firestore);

  readonly incidents$: Observable<Incident[]> = collectionData(
    query(
      collection(this.firestore, COLLECTIONS.INCIDENTS),
      orderBy('created_at', 'desc')
    ),
    { idField: 'incident_id' }
  ) as Observable<Incident[]>;

  getIncident(id: string): Observable<Incident> {
    return docData(doc(this.firestore, COLLECTIONS.INCIDENTS, id), {
      idField: 'incident_id',
    }) as Observable<Incident>;
  }

  updateIncidentStatus(id: string, status: IncidentStatus): Promise<void> {
    return updateDoc(doc(this.firestore, COLLECTIONS.INCIDENTS, id), {
      status,
      updated_at: new Date().toISOString(),
    });
  }

  acknowledgeIncident(id: string): Promise<void> {
    return this.updateIncidentStatus(id, 'acknowledged');
  }

  resolveIncident(id: string): Promise<void> {
    return updateDoc(doc(this.firestore, COLLECTIONS.INCIDENTS, id), {
      status: 'resolved' as IncidentStatus,
      resolved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  escalateIncident(id: string, level: number): Promise<void> {
    return updateDoc(doc(this.firestore, COLLECTIONS.INCIDENTS, id), {
      escalation_level: level,
      updated_at: new Date().toISOString(),
    });
  }

  async assignResource(incidentId: string, unitId: string): Promise<void> {
    const now = new Date().toISOString();

    // Add unit to incident's assigned_units and set status to dispatched
    await updateDoc(doc(this.firestore, COLLECTIONS.INCIDENTS, incidentId), {
      assigned_units: arrayUnion(unitId),
      status: 'dispatched' as IncidentStatus,
      updated_at: now,
    });

    // Update resource status to dispatched
    await updateDoc(doc(this.firestore, COLLECTIONS.RESOURCES, unitId), {
      status: 'dispatched',
      assigned_incident: incidentId,
      last_updated: now,
    });
  }

  async unassignResource(incidentId: string, unitId: string, currentUnits: string[]): Promise<void> {
    const now = new Date().toISOString();

    await updateDoc(doc(this.firestore, COLLECTIONS.INCIDENTS, incidentId), {
      assigned_units: currentUnits.filter((u) => u !== unitId),
      updated_at: now,
    });

    await updateDoc(doc(this.firestore, COLLECTIONS.RESOURCES, unitId), {
      status: 'available',
      assigned_incident: '',
      last_updated: now,
    });
  }
}
