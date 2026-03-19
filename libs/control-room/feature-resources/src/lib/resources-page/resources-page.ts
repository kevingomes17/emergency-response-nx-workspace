import { Component, inject, signal } from '@angular/core';
import { AsyncPipe, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ResourceService } from '@emergency-response/control-room/data-access';
import {
  Resource,
  ResourceStatus,
  ResourceType,
} from '@emergency-response/shared/data-models';
import { map, Observable, combineLatest, BehaviorSubject } from 'rxjs';

type StatusFilter = ResourceStatus | 'all';

const RESOURCE_TYPES: ResourceType[] = [
  'ambulance',
  'fire_truck',
  'police',
  'maintenance',
  'electrician',
];

const RESOURCE_STATUSES: ResourceStatus[] = [
  'available',
  'dispatched',
  'en_route',
  'on_scene',
  'offline',
];

const TYPE_ICONS: Record<ResourceType, string> = {
  ambulance: '\u{1F691}',
  fire_truck: '\u{1F692}',
  police: '\u{1F693}',
  maintenance: '\u{1F527}',
  electrician: '\u{26A1}',
};

@Component({
  selector: 'er-resources-page',
  standalone: true,
  imports: [AsyncPipe, TitleCasePipe, FormsModule],
  template: `
    <div class="page">
      <header class="page-header">
        <div>
          <h1>Resources</h1>
          <p class="subtitle">Manage units and their availability</p>
        </div>
        <button class="add-btn" (click)="showAddForm.set(!showAddForm())">
          {{ showAddForm() ? 'Cancel' : '+ Add Resource' }}
        </button>
      </header>

      @if (showAddForm()) {
        <form class="add-form" (ngSubmit)="addResource()">
          <div class="form-row">
            <div class="form-field">
              <label class="form-label">Unit ID</label>
              <input
                class="form-input"
                [(ngModel)]="newUnitId"
                name="unitId"
                placeholder="e.g. AMB-007"
                required
              />
            </div>
            <div class="form-field">
              <label class="form-label">Type</label>
              <select class="form-input" [(ngModel)]="newType" name="type">
                @for (t of resourceTypes; track t) {
                  <option [value]="t">{{ t.replace('_', ' ') | titlecase }}</option>
                }
              </select>
            </div>
            <div class="form-field">
              <label class="form-label">Capacity</label>
              <input
                class="form-input"
                type="number"
                [(ngModel)]="newCapacity"
                name="capacity"
                min="1"
              />
            </div>
          </div>
          <div class="form-row">
            <div class="form-field">
              <label class="form-label">Latitude</label>
              <input
                class="form-input"
                type="number"
                step="any"
                [(ngModel)]="newLat"
                name="lat"
              />
            </div>
            <div class="form-field">
              <label class="form-label">Longitude</label>
              <input
                class="form-input"
                type="number"
                step="any"
                [(ngModel)]="newLng"
                name="lng"
              />
            </div>
            <div class="form-field form-submit">
              <button class="submit-btn" type="submit" [disabled]="!newUnitId.trim()">
                Create Resource
              </button>
            </div>
          </div>
        </form>
      }

      <div class="filter-bar">
        @for (f of filters; track f.value) {
          <button
            class="filter-btn"
            [class.active]="activeFilter() === f.value"
            (click)="setFilter(f.value)"
          >
            {{ f.label }}
          </button>
        }
      </div>

      <div class="resource-list">
        @for (resource of filteredResources$ | async; track resource.unit_id) {
          <article class="resource-row">
            <div class="resource-info">
              <span class="resource-icon">{{ typeIcon(resource.type) }}</span>
              <div>
                <div class="resource-id">{{ resource.unit_id }}</div>
                <div class="resource-type">{{ resource.type.replace('_', ' ') | titlecase }}</div>
              </div>
            </div>
            <div class="resource-details">
              <span class="capacity-badge">Cap: {{ resource.capacity }}</span>
              @if (resource.assigned_incident) {
                <span class="assigned-badge">{{ resource.assigned_incident }}</span>
              }
            </div>
            <div class="resource-actions">
              <select
                class="status-select"
                [class]="'status--' + resource.status"
                [ngModel]="resource.status"
                (ngModelChange)="updateStatus(resource.unit_id, $event)"
              >
                @for (s of statuses; track s) {
                  <option [value]="s">{{ s.replace('_', ' ') | titlecase }}</option>
                }
              </select>
              <button
                class="delete-btn"
                (click)="confirmDelete(resource)"
                [disabled]="resource.status === 'dispatched' || resource.status === 'en_route' || resource.status === 'on_scene'"
                title="Remove resource"
              >
                &#x2715;
              </button>
            </div>
          </article>
        } @empty {
          <p class="empty-state">No resources found</p>
        }
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
      min-height: 100vh;
      background: #121220;
      color: #ffffff;
      font-family: system-ui, -apple-system, sans-serif;
    }

    .page {
      max-width: 900px;
      margin: 0 auto;
      padding: 1rem;
      padding-bottom: 5rem;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 1.5rem 0 1rem;
    }

    .page-header h1 {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 700;
    }

    .subtitle {
      margin: 0.25rem 0 0;
      color: #a0a0b8;
      font-size: 0.85rem;
    }

    .add-btn {
      padding: 0.5rem 1rem;
      border: 1px solid #6366f1;
      border-radius: 8px;
      background: transparent;
      color: #6366f1;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
    }

    .add-btn:hover {
      background: #6366f1;
      color: #fff;
    }

    /* Add form */
    .add-form {
      background: #1e1e2e;
      border: 1px solid #2e2e3e;
      border-radius: 10px;
      padding: 1rem;
      margin-bottom: 1.5rem;
    }

    .form-row {
      display: flex;
      gap: 0.75rem;
      margin-bottom: 0.75rem;
    }

    .form-row:last-child {
      margin-bottom: 0;
    }

    .form-field {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
    }

    .form-label {
      font-size: 0.7rem;
      font-weight: 600;
      color: #a0a0b8;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .form-input {
      padding: 0.5rem 0.65rem;
      border: 1px solid #2e2e3e;
      border-radius: 6px;
      background: #151525;
      color: #e0e0e0;
      font-size: 0.85rem;
    }

    .form-input:focus {
      outline: none;
      border-color: #6366f1;
    }

    .form-submit {
      justify-content: flex-end;
    }

    .submit-btn {
      padding: 0.5rem 1.25rem;
      border: none;
      border-radius: 6px;
      background: #6366f1;
      color: #fff;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
    }

    .submit-btn:disabled {
      opacity: 0.4;
      cursor: default;
    }

    /* Filters */
    .filter-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }

    .filter-btn {
      padding: 0.4rem 0.9rem;
      border: 1px solid #2e2e3e;
      border-radius: 9999px;
      background: #1e1e2e;
      color: #a0a0b8;
      font-size: 0.8rem;
      font-weight: 500;
      cursor: pointer;
      transition: border-color 0.2s, color 0.2s;
    }

    .filter-btn:hover {
      border-color: #6366f1;
      color: #ffffff;
    }

    .filter-btn.active {
      background: #6366f1;
      border-color: #6366f1;
      color: #ffffff;
    }

    /* Resource list */
    .resource-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .resource-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      background: #1e1e2e;
      border: 1px solid #2e2e3e;
      border-radius: 10px;
      padding: 0.85rem 1rem;
    }

    .resource-info {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      min-width: 0;
    }

    .resource-icon {
      font-size: 1.5rem;
    }

    .resource-id {
      font-weight: 600;
      font-size: 0.9rem;
    }

    .resource-type {
      font-size: 0.75rem;
      color: #a0a0b8;
    }

    .resource-details {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-shrink: 0;
    }

    .capacity-badge {
      font-size: 0.72rem;
      color: #a0a0b8;
      background: #151525;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
    }

    .assigned-badge {
      font-size: 0.68rem;
      color: #f97316;
      background: rgba(249, 115, 22, 0.15);
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      font-weight: 500;
    }

    .resource-actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-shrink: 0;
    }

    .status-select {
      padding: 0.35rem 0.5rem;
      border: 1px solid #2e2e3e;
      border-radius: 6px;
      background: #151525;
      color: #e0e0e0;
      font-size: 0.78rem;
      font-weight: 600;
      cursor: pointer;
    }

    .status-select:focus {
      outline: none;
      border-color: #6366f1;
    }

    .status--available { color: #22c55e; }
    .status--dispatched { color: #f97316; }
    .status--en_route { color: #3b82f6; }
    .status--on_scene { color: #a855f7; }
    .status--offline { color: #737373; }

    .delete-btn {
      width: 28px;
      height: 28px;
      border: 1px solid #2e2e3e;
      border-radius: 6px;
      background: transparent;
      color: #6b6b80;
      font-size: 0.8rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .delete-btn:hover:not(:disabled) {
      border-color: #ef4444;
      color: #ef4444;
    }

    .delete-btn:disabled {
      opacity: 0.3;
      cursor: default;
    }

    .empty-state {
      text-align: center;
      color: #6b6b80;
      padding: 3rem 1rem;
      font-size: 0.95rem;
    }

    @media (max-width: 640px) {
      .form-row {
        flex-direction: column;
      }

      .resource-row {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.75rem;
      }

      .resource-actions {
        width: 100%;
      }

      .status-select {
        flex: 1;
      }
    }

    @media (min-width: 640px) {
      .page {
        padding: 1.5rem;
        padding-bottom: 5rem;
      }

      .page-header h1 {
        font-size: 1.75rem;
      }
    }
  `,
})
export class ResourcesPage {
  private readonly resourceService = inject(ResourceService);
  private readonly filterSubject = new BehaviorSubject<StatusFilter>('all');

  readonly activeFilter = signal<StatusFilter>('all');
  readonly showAddForm = signal(false);
  readonly resourceTypes = RESOURCE_TYPES;
  readonly statuses = RESOURCE_STATUSES;

  newUnitId = '';
  newType: ResourceType = 'ambulance';
  newCapacity = 1;
  newLat = 37.7749;
  newLng = -122.4194;

  readonly filters: { label: string; value: StatusFilter }[] = [
    { label: 'All', value: 'all' },
    { label: 'Available', value: 'available' },
    { label: 'Dispatched', value: 'dispatched' },
    { label: 'En Route', value: 'en_route' },
    { label: 'On Scene', value: 'on_scene' },
    { label: 'Offline', value: 'offline' },
  ];

  readonly filteredResources$: Observable<Resource[]> = combineLatest([
    this.resourceService.resources$,
    this.filterSubject,
  ]).pipe(
    map(([resources, filter]) =>
      filter === 'all'
        ? resources
        : resources.filter((r) => r.status === filter)
    )
  );

  typeIcon(type: ResourceType): string {
    return TYPE_ICONS[type];
  }

  setFilter(value: StatusFilter): void {
    this.activeFilter.set(value);
    this.filterSubject.next(value);
  }

  async addResource(): Promise<void> {
    const id = this.newUnitId.trim();
    if (!id) return;

    await this.resourceService.addResource({
      unit_id: id,
      type: this.newType,
      capacity: this.newCapacity,
      location: { lat: this.newLat, lng: this.newLng },
    });

    this.newUnitId = '';
    this.newType = 'ambulance';
    this.newCapacity = 1;
    this.showAddForm.set(false);
  }

  async updateStatus(unitId: string, status: ResourceStatus): Promise<void> {
    await this.resourceService.updateResourceStatus(unitId, status);
  }

  async confirmDelete(resource: Resource): Promise<void> {
    await this.resourceService.deleteResource(resource.unit_id);
  }
}
