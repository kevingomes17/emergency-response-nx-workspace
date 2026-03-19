import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  updateDoc,
  query,
  orderBy,
} from '@angular/fire/firestore';
import { Alert, COLLECTIONS } from '@emergency-response/shared/data-models';

@Injectable({ providedIn: 'root' })
export class AlertService {
  private readonly firestore = inject(Firestore);

  readonly alerts$: Observable<Alert[]> = collectionData(
    query(
      collection(this.firestore, COLLECTIONS.ALERTS),
      orderBy('created_at', 'desc')
    ),
    { idField: 'alert_id' }
  ) as Observable<Alert[]>;

  acknowledgeAlert(alertId: string): Promise<void> {
    return updateDoc(doc(this.firestore, COLLECTIONS.ALERTS, alertId), {
      acknowledged: true,
    });
  }
}
