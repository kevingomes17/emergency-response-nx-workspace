import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
} from '@angular/fire/firestore';
import {
  Resource,
  ResourceStatus,
  ResourceType,
  COLLECTIONS,
} from '@emergency-response/shared/data-models';

@Injectable({ providedIn: 'root' })
export class ResourceService {
  private readonly firestore = inject(Firestore);

  readonly resources$: Observable<Resource[]> = collectionData(
    collection(this.firestore, COLLECTIONS.RESOURCES),
    { idField: 'unit_id' }
  ) as Observable<Resource[]>;

  getAvailableResources(): Observable<Resource[]> {
    return collectionData(
      query(
        collection(this.firestore, COLLECTIONS.RESOURCES),
        where('status', '==', 'available')
      ),
      { idField: 'unit_id' }
    ) as Observable<Resource[]>;
  }

  async addResource(data: {
    unit_id: string;
    type: ResourceType;
    capacity: number;
    location: { lat: number; lng: number };
  }): Promise<void> {
    const resource: Resource = {
      unit_id: data.unit_id,
      type: data.type,
      status: 'available',
      location: data.location,
      capacity: data.capacity,
      last_updated: new Date().toISOString(),
    };
    await setDoc(
      doc(this.firestore, COLLECTIONS.RESOURCES, data.unit_id),
      resource
    );
  }

  updateResourceStatus(unitId: string, status: ResourceStatus): Promise<void> {
    return updateDoc(doc(this.firestore, COLLECTIONS.RESOURCES, unitId), {
      status,
      last_updated: new Date().toISOString(),
    });
  }

  deleteResource(unitId: string): Promise<void> {
    return deleteDoc(doc(this.firestore, COLLECTIONS.RESOURCES, unitId));
  }
}
