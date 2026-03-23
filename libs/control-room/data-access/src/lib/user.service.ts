import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  Firestore,
  collection,
  collectionData,
} from '@angular/fire/firestore';
import { User, COLLECTIONS } from '@emergency-response/shared/data-models';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly firestore = inject(Firestore);

  readonly users$: Observable<User[]> = collectionData(
    collection(this.firestore, COLLECTIONS.USERS),
    { idField: 'uid' }
  ) as Observable<User[]>;
}
