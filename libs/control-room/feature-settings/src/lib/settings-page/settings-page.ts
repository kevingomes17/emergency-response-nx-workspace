import { Component, inject, signal } from '@angular/core';
import { AsyncPipe, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ResourceService,
  ServiceZoneService,
  UserService,
} from '@emergency-response/control-room/data-access';
import {
  Resource,
  ResourceStatus,
  ResourceType,
  ServiceZone,
  User,
  UserRole,
} from '@emergency-response/shared/data-models';
import { map, Observable, combineLatest, BehaviorSubject } from 'rxjs';

type Tab = 'resources' | 'zones' | 'users';
type StatusFilter = ResourceStatus | 'all';
type CityFilter = string;
type RoleFilter = UserRole | 'all';

const USER_ROLES: UserRole[] = [
  'dispatcher',
  'responder',
  'supervisor',
  'manager',
  'director',
  'admin',
];

const ROLE_ICONS: Record<UserRole, string> = {
  dispatcher: '\u{1F4DE}',
  responder: '\u{1F6D1}',
  supervisor: '\u{1F464}',
  manager: '\u{1F465}',
  director: '\u{1F451}',
  admin: '\u{1F6E0}',
};

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

const PRIORITY_COLORS: Record<number, string> = {
  1: '#22c55e',
  2: '#3b82f6',
  3: '#eab308',
  4: '#f97316',
  5: '#ef4444',
};

@Component({
  selector: 'er-settings-page',
  standalone: true,
  imports: [AsyncPipe, TitleCasePipe, FormsModule],
  template: `
    <div class="page">
      <header class="page-header">
        <div>
          <h1>Settings</h1>
          <p class="subtitle">Manage resources, service zones, and users</p>
        </div>
      </header>

      <!-- Tab bar -->
      <div class="tab-bar">
        <button
          class="tab-btn"
          [class.active]="activeTab() === 'resources'"
          (click)="activeTab.set('resources')"
        >
          Resources
        </button>
        <button
          class="tab-btn"
          [class.active]="activeTab() === 'zones'"
          (click)="activeTab.set('zones')"
        >
          Service Zones
        </button>
        <button
          class="tab-btn"
          [class.active]="activeTab() === 'users'"
          (click)="activeTab.set('users')"
        >
          Users
        </button>
      </div>

      <!-- ═══════ RESOURCES TAB ═══════ -->
      @if (activeTab() === 'resources') {
        <div class="tab-content">
          <div class="section-header">
            <button class="add-btn" (click)="showAddResource.set(!showAddResource())">
              {{ showAddResource() ? 'Cancel' : '+ Add Resource' }}
            </button>
          </div>

          @if (showAddResource()) {
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
            @for (f of resourceFilters; track f.value) {
              <button
                class="filter-btn"
                [class.active]="activeResourceFilter() === f.value"
                (click)="setResourceFilter(f.value)"
              >
                {{ f.label }}
              </button>
            }
          </div>

          <div class="item-list">
            @for (resource of filteredResources$ | async; track resource.unit_id) {
              <article class="item-row">
                <div class="item-info">
                  <span class="item-icon">{{ typeIcon(resource.type) }}</span>
                  <div>
                    <div class="item-title">{{ resource.unit_id }}</div>
                    <div class="item-subtitle">{{ resource.type.replace('_', ' ') | titlecase }}</div>
                  </div>
                </div>
                <div class="item-details">
                  <span class="capacity-badge">Cap: {{ resource.capacity }}</span>
                  @if (resource.assigned_incident) {
                    <span class="assigned-badge">{{ resource.assigned_incident }}</span>
                  }
                </div>
                <div class="item-actions">
                  <select
                    class="status-select"
                    [class]="'status--' + resource.status"
                    [ngModel]="resource.status"
                    (ngModelChange)="updateResourceStatus(resource.unit_id, $event)"
                  >
                    @for (s of statuses; track s) {
                      <option [value]="s">{{ s.replace('_', ' ') | titlecase }}</option>
                    }
                  </select>
                  <button
                    class="delete-btn"
                    (click)="deleteResource(resource)"
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
      }

      <!-- ═══════ SERVICE ZONES TAB ═══════ -->
      @if (activeTab() === 'zones') {
        <div class="tab-content">
          <div class="section-header">
            <button class="add-btn" (click)="showAddZone.set(!showAddZone())">
              {{ showAddZone() ? 'Cancel' : '+ Add Zone' }}
            </button>
          </div>

          @if (showAddZone()) {
            <form class="add-form" (ngSubmit)="addZone()">
              <div class="form-row">
                <div class="form-field">
                  <label class="form-label">Name</label>
                  <input
                    class="form-input"
                    [(ngModel)]="newZoneName"
                    name="zoneName"
                    placeholder="e.g. Downtown"
                    required
                  />
                </div>
                <div class="form-field">
                  <label class="form-label">City</label>
                  <input
                    class="form-input"
                    [(ngModel)]="newZoneCity"
                    name="zoneCity"
                    placeholder="e.g. Chicago"
                    required
                  />
                </div>
                <div class="form-field">
                  <label class="form-label">Priority (1-5)</label>
                  <input
                    class="form-input"
                    type="number"
                    [(ngModel)]="newZonePriority"
                    name="zonePriority"
                    min="1"
                    max="5"
                  />
                </div>
              </div>
              <div class="form-row">
                <div class="form-field">
                  <label class="form-label">SW Latitude</label>
                  <input class="form-input" type="number" step="any" [(ngModel)]="newSwLat" name="swLat" />
                </div>
                <div class="form-field">
                  <label class="form-label">SW Longitude</label>
                  <input class="form-input" type="number" step="any" [(ngModel)]="newSwLng" name="swLng" />
                </div>
                <div class="form-field">
                  <label class="form-label">NE Latitude</label>
                  <input class="form-input" type="number" step="any" [(ngModel)]="newNeLat" name="neLat" />
                </div>
                <div class="form-field">
                  <label class="form-label">NE Longitude</label>
                  <input class="form-input" type="number" step="any" [(ngModel)]="newNeLng" name="neLng" />
                </div>
              </div>
              <div class="form-row">
                <div class="form-field form-submit">
                  <button
                    class="submit-btn"
                    type="submit"
                    [disabled]="!newZoneName.trim() || !newZoneCity.trim()"
                  >
                    Create Zone
                  </button>
                </div>
              </div>
            </form>
          }

          <div class="filter-bar">
            @for (f of zoneFilters$ | async; track f) {
              <button
                class="filter-btn"
                [class.active]="activeCityFilter() === f"
                (click)="setCityFilter(f)"
              >
                {{ f }}
              </button>
            }
          </div>

          <div class="item-list">
            @for (zone of filteredZones$ | async; track zone.id) {
              <article class="item-row">
                <div class="item-info">
                  <span class="item-icon zone-icon">
                    <span class="material-icons-outlined">map</span>
                  </span>
                  <div>
                    <div class="item-title">{{ zone.name }}</div>
                    <div class="item-subtitle">{{ zone.city }}</div>
                  </div>
                </div>
                <div class="item-details">
                  <span
                    class="priority-badge"
                    [style.background]="priorityColor(zone.priority_score) + '22'"
                    [style.color]="priorityColor(zone.priority_score)"
                  >
                    P{{ zone.priority_score }}
                  </span>
                </div>
                <div class="item-actions">
                  <select
                    class="status-select"
                    [ngModel]="zone.priority_score"
                    (ngModelChange)="updateZonePriority(zone.id, +$event)"
                  >
                    @for (p of priorities; track p) {
                      <option [value]="p">Priority {{ p }}</option>
                    }
                  </select>
                  <button
                    class="delete-btn"
                    (click)="deleteZone(zone.id)"
                    title="Remove zone"
                  >
                    &#x2715;
                  </button>
                </div>
              </article>
            } @empty {
              <p class="empty-state">No service zones found</p>
            }
          </div>
        </div>
      }

      <!-- ═══════ USERS TAB ═══════ -->
      @if (activeTab() === 'users') {
        <div class="tab-content">
          <div class="filter-bar">
            @for (f of roleFilters; track f.value) {
              <button
                class="filter-btn"
                [class.active]="activeRoleFilter() === f.value"
                (click)="setRoleFilter(f.value)"
              >
                {{ f.label }}
              </button>
            }
          </div>

          <div class="item-list">
            @for (user of filteredUsers$ | async; track user.uid) {
              <article class="item-row">
                <div class="item-info">
                  <span class="item-icon">{{ roleIcon(user.role) }}</span>
                  <div>
                    <div class="item-title">{{ user.display_name }}</div>
                    <div class="item-subtitle">{{ user.uid }}</div>
                  </div>
                </div>
                <div class="item-details">
                  <span class="role-badge">{{ user.role | titlecase }}</span>
                  @if (user.assigned_unit) {
                    <span class="assigned-badge">{{ user.assigned_unit }}</span>
                  }
                  <span class="status-dot" [class.active]="user.is_active" [class.inactive]="!user.is_active">
                    {{ user.is_active ? 'Active' : 'Inactive' }}
                  </span>
                </div>
              </article>
            } @empty {
              <p class="empty-state">No users found</p>
            }
          </div>
        </div>
      }
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

    /* Tabs */
    .tab-bar {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1.25rem;
      border-bottom: 1px solid #2e2e3e;
      padding-bottom: 0.75rem;
    }

    .tab-btn {
      padding: 0.5rem 1.25rem;
      border: 1px solid #2e2e3e;
      border-radius: 8px;
      background: #1e1e2e;
      color: #a0a0b8;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      transition: border-color 0.2s, color 0.2s, background 0.2s;
    }

    .tab-btn:hover {
      border-color: #6366f1;
      color: #ffffff;
    }

    .tab-btn.active {
      background: #6366f1;
      border-color: #6366f1;
      color: #ffffff;
    }

    /* Section header */
    .section-header {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 1rem;
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

    /* Item list */
    .item-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .item-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      background: #1e1e2e;
      border: 1px solid #2e2e3e;
      border-radius: 10px;
      padding: 0.85rem 1rem;
    }

    .item-info {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      min-width: 0;
    }

    .item-icon {
      font-size: 1.5rem;
    }

    .zone-icon {
      color: #6366f1;
    }

    .item-title {
      font-weight: 600;
      font-size: 0.9rem;
    }

    .item-subtitle {
      font-size: 0.75rem;
      color: #a0a0b8;
    }

    .item-details {
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

    .priority-badge {
      font-size: 0.72rem;
      font-weight: 600;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
    }

    .item-actions {
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

    .role-badge {
      font-size: 0.72rem;
      font-weight: 600;
      color: #818cf8;
      background: rgba(99, 102, 241, 0.15);
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
    }

    .status-dot {
      font-size: 0.68rem;
      font-weight: 500;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
    }

    .status-dot.active {
      color: #22c55e;
      background: rgba(34, 197, 94, 0.15);
    }

    .status-dot.inactive {
      color: #737373;
      background: rgba(115, 115, 115, 0.15);
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

      .item-row {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.75rem;
      }

      .item-actions {
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
export class SettingsPage {
  private readonly resourceService = inject(ResourceService);
  private readonly zoneService = inject(ServiceZoneService);
  private readonly userService = inject(UserService);

  // ── Tab state ──
  readonly activeTab = signal<Tab>('resources');

  // ── Resources state ──
  private readonly resourceFilterSubject = new BehaviorSubject<StatusFilter>('all');
  readonly activeResourceFilter = signal<StatusFilter>('all');
  readonly showAddResource = signal(false);
  readonly resourceTypes = RESOURCE_TYPES;
  readonly statuses = RESOURCE_STATUSES;

  newUnitId = '';
  newType: ResourceType = 'ambulance';
  newCapacity = 1;
  newLat = 41.8781;
  newLng = -87.6298;

  readonly resourceFilters: { label: string; value: StatusFilter }[] = [
    { label: 'All', value: 'all' },
    { label: 'Available', value: 'available' },
    { label: 'Dispatched', value: 'dispatched' },
    { label: 'En Route', value: 'en_route' },
    { label: 'On Scene', value: 'on_scene' },
    { label: 'Offline', value: 'offline' },
  ];

  readonly filteredResources$: Observable<Resource[]> = combineLatest([
    this.resourceService.resources$,
    this.resourceFilterSubject,
  ]).pipe(
    map(([resources, filter]) =>
      filter === 'all'
        ? resources
        : resources.filter((r) => r.status === filter)
    )
  );

  // ── Service Zones state ──
  private readonly cityFilterSubject = new BehaviorSubject<CityFilter>('All');
  readonly activeCityFilter = signal<CityFilter>('All');
  readonly showAddZone = signal(false);
  readonly priorities = [1, 2, 3, 4, 5];

  newZoneName = '';
  newZoneCity = '';
  newZonePriority = 1;
  newSwLat = 0;
  newSwLng = 0;
  newNeLat = 0;
  newNeLng = 0;

  readonly zoneFilters$: Observable<string[]> = this.zoneService.zones$.pipe(
    map((zones) => {
      const cities = [...new Set(zones.map((z) => z.city))].sort();
      return ['All', ...cities];
    })
  );

  readonly filteredZones$: Observable<ServiceZone[]> = combineLatest([
    this.zoneService.zones$,
    this.cityFilterSubject,
  ]).pipe(
    map(([zones, city]) =>
      city === 'All' ? zones : zones.filter((z) => z.city === city)
    )
  );

  // ── Users state ──
  private readonly roleFilterSubject = new BehaviorSubject<RoleFilter>('all');
  readonly activeRoleFilter = signal<RoleFilter>('all');

  readonly roleFilters: { label: string; value: RoleFilter }[] = [
    { label: 'All', value: 'all' },
    { label: 'Dispatcher', value: 'dispatcher' },
    { label: 'Responder', value: 'responder' },
    { label: 'Supervisor', value: 'supervisor' },
    { label: 'Manager', value: 'manager' },
    { label: 'Director', value: 'director' },
    { label: 'Admin', value: 'admin' },
  ];

  readonly filteredUsers$: Observable<User[]> = combineLatest([
    this.userService.users$,
    this.roleFilterSubject,
  ]).pipe(
    map(([users, filter]) =>
      filter === 'all'
        ? users
        : users.filter((u) => u.role === filter)
    )
  );

  // ── Resource methods ──
  typeIcon(type: ResourceType): string {
    return TYPE_ICONS[type];
  }

  setResourceFilter(value: StatusFilter): void {
    this.activeResourceFilter.set(value);
    this.resourceFilterSubject.next(value);
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
    this.showAddResource.set(false);
  }

  async updateResourceStatus(unitId: string, status: ResourceStatus): Promise<void> {
    await this.resourceService.updateResourceStatus(unitId, status);
  }

  async deleteResource(resource: Resource): Promise<void> {
    await this.resourceService.deleteResource(resource.unit_id);
  }

  // ── Zone methods ──
  priorityColor(priority: number): string {
    return PRIORITY_COLORS[priority] ?? '#a0a0b8';
  }

  setCityFilter(city: string): void {
    this.activeCityFilter.set(city);
    this.cityFilterSubject.next(city);
  }

  async addZone(): Promise<void> {
    const name = this.newZoneName.trim();
    const city = this.newZoneCity.trim();
    if (!name || !city) return;

    await this.zoneService.addZone({
      name,
      city,
      priority_score: this.newZonePriority,
      sw_lat: this.newSwLat,
      sw_lng: this.newSwLng,
      ne_lat: this.newNeLat,
      ne_lng: this.newNeLng,
    });

    this.newZoneName = '';
    this.newZoneCity = '';
    this.newZonePriority = 1;
    this.newSwLat = 0;
    this.newSwLng = 0;
    this.newNeLat = 0;
    this.newNeLng = 0;
    this.showAddZone.set(false);
  }

  async updateZonePriority(id: string, priority: number): Promise<void> {
    await this.zoneService.updateZonePriority(id, priority);
  }

  async deleteZone(id: string): Promise<void> {
    await this.zoneService.deleteZone(id);
  }

  // ── User methods ──
  roleIcon(role: UserRole): string {
    return ROLE_ICONS[role] ?? '\u{1F464}';
  }

  setRoleFilter(value: RoleFilter): void {
    this.activeRoleFilter.set(value);
    this.roleFilterSubject.next(value);
  }
}
