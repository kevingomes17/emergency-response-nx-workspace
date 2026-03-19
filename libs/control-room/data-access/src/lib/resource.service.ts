import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  Firestore,
  collection,
  collectionData,
  query,
  where,
} from '@angular/fire/firestore';
import { Resource, COLLECTIONS } from '@emergency-response/shared/data-models';

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
}
