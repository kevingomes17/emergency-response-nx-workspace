import { Component, computed, inject, signal } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { Router } from '@angular/router';
import { map } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  IncidentService,
  ResourceService,
  ServiceZoneService,
} from '@emergency-response/control-room/data-access';
import {
  StatCard,
  IncidentCard,
  ResourceCard,
  DashboardMap,
} from '@emergency-response/control-room/ui-components';
import type { IncidentAction } from '@emergency-response/control-room/ui-components';
import { Incident, Resource, ResourceStatus, Severity, ServiceZone } from '@emergency-response/shared/data-models';

type Category = 'incidents' | 'resources' | 'zones';
type SubFilter = Severity | ResourceStatus | null;

@Component({
  selector: 'er-dashboard-page',
  standalone: true,
  imports: [AsyncPipe, StatCard, IncidentCard, ResourceCard, DashboardMap],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.css',
})
export class DashboardPage {
  private readonly incidentService = inject(IncidentService);
  private readonly resourceService = inject(ResourceService);
  private readonly zoneService = inject(ServiceZoneService);
  private readonly router = inject(Router);

  readonly incidents$ = this.incidentService.incidents$;
  readonly resources$ = this.resourceService.resources$;
  readonly availableResources$ = this.resourceService.getAvailableResources();

  readonly viewMode = signal<'list' | 'map'>('list');
  readonly allResources = toSignal(this.resources$, { initialValue: [] as Resource[] });
  readonly availableResourcesList = toSignal(this.availableResources$, { initialValue: [] as Resource[] });
  readonly serviceZones = toSignal(this.zoneService.zones$, { initialValue: [] as ServiceZone[] });

  private readonly allIncidents = toSignal(this.incidents$, { initialValue: [] as Incident[] });

  // ── Category & sub-filter state ──
  readonly activeCategory = signal<Category>('incidents');
  readonly activeSubFilter = signal<SubFilter>(null);

  // ── Incident counts ──
  readonly incidentCount = computed(() =>
    this.allIncidents().filter((i) => i.status !== 'resolved' && i.status !== 'closed').length
  );
  readonly criticalCount = toSignal(
    this.incidents$.pipe(map((list) => this.countBySeverity(list, 'critical'))),
    { initialValue: 0 }
  );
  readonly highCount = toSignal(
    this.incidents$.pipe(map((list) => this.countBySeverity(list, 'high'))),
    { initialValue: 0 }
  );
  readonly mediumCount = toSignal(
    this.incidents$.pipe(map((list) => this.countBySeverity(list, 'medium'))),
    { initialValue: 0 }
  );
  readonly lowCount = toSignal(
    this.incidents$.pipe(map((list) => this.countBySeverity(list, 'low'))),
    { initialValue: 0 }
  );

  // ── Resource counts ──
  readonly totalResourceCount = computed(() => this.allResources().length);
  readonly availableResourceCount = computed(() =>
    this.allResources().filter((r) => r.status === 'available').length
  );
  readonly dispatchedResourceCount = computed(() =>
    this.allResources().filter((r) => r.status === 'dispatched').length
  );
  readonly offlineResourceCount = computed(() =>
    this.allResources().filter((r) => r.status === 'offline').length
  );

  // ── Zone count ──
  readonly zoneCount = computed(() => this.serviceZones().length);

  // ── Filtered data ──
  readonly filteredIncidents = computed(() => {
    const sub = this.activeSubFilter();
    const incidents = this.allIncidents();
    if (!sub || this.activeCategory() !== 'incidents') return incidents;
    return incidents.filter(
      (i) => i.severity === sub && i.status !== 'resolved' && i.status !== 'closed'
    );
  });

  readonly filteredResources = computed(() => {
    const sub = this.activeSubFilter();
    const resources = this.allResources();
    if (!sub || this.activeCategory() !== 'resources') return resources;
    return resources.filter((r) => r.status === sub);
  });

  setCategory(cat: Category): void {
    this.activeCategory.set(cat);
    this.activeSubFilter.set(null);
    if (cat === 'zones') {
      this.viewMode.set('map');
    }
  }

  toggleSubFilter(sub: SubFilter): void {
    this.activeSubFilter.update((current) => current === sub ? null : sub);
  }

  onIncidentSelect(incidentId: string): void {
    this.router.navigate(['/incidents', incidentId]);
  }

  async onIncidentAction(event: { incidentId: string; action: IncidentAction }): Promise<void> {
    switch (event.action) {
      case 'acknowledge':
        await this.incidentService.acknowledgeIncident(event.incidentId);
        break;
      case 'dispatch':
        await this.incidentService.updateIncidentStatus(event.incidentId, 'dispatched');
        break;
      case 'resolve':
        await this.incidentService.resolveIncident(event.incidentId);
        break;
      case 'escalate': {
        const incidents = this.allIncidents();
        const inc = incidents.find((i) => i.incident_id === event.incidentId);
        if (inc) {
          await this.incidentService.escalateIncident(event.incidentId, inc.escalation_level + 1);
        }
        break;
      }
    }
  }

  async onDispatchResource(event: { incidentId: string; unitId: string }): Promise<void> {
    await this.incidentService.assignResource(event.incidentId, event.unitId);
  }

  private countBySeverity(incidents: Incident[], severity: Severity): number {
    return incidents.filter(
      (i) => i.severity === severity && i.status !== 'resolved' && i.status !== 'closed'
    ).length;
  }
}
