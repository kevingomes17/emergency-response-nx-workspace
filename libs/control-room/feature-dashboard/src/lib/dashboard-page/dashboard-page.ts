import { Component, computed, inject, signal } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { Router } from '@angular/router';
import { map } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  IncidentService,
  ResourceService,
} from '@emergency-response/control-room/data-access';
import {
  StatCard,
  IncidentCard,
  ResourceCard,
} from '@emergency-response/control-room/ui-components';
import { Incident, Severity } from '@emergency-response/shared/data-models';

type FilterType = Severity | 'resources' | null;

@Component({
  selector: 'er-dashboard-page',
  standalone: true,
  imports: [AsyncPipe, StatCard, IncidentCard, ResourceCard],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.css',
})
export class DashboardPage {
  private readonly incidentService = inject(IncidentService);
  private readonly resourceService = inject(ResourceService);
  private readonly router = inject(Router);

  readonly incidents$ = this.incidentService.incidents$;
  readonly resources$ = this.resourceService.resources$;
  readonly availableResources$ = this.resourceService.getAvailableResources();

  private readonly allIncidents = toSignal(this.incidents$, { initialValue: [] as Incident[] });

  readonly activeFilter = signal<FilterType>(null);

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

  readonly resourceCount = toSignal(
    this.availableResources$.pipe(map((list) => list.length)),
    { initialValue: 0 }
  );

  readonly filteredIncidents = computed(() => {
    const filter = this.activeFilter();
    const incidents = this.allIncidents();
    if (!filter || filter === 'resources') return incidents;
    return incidents.filter(
      (i) => i.severity === filter && i.status !== 'resolved' && i.status !== 'closed'
    );
  });

  readonly showResources = computed(() => this.activeFilter() === 'resources');

  toggleFilter(filter: FilterType): void {
    this.activeFilter.update((current) => current === filter ? null : filter);
  }

  onIncidentSelect(incidentId: string): void {
    this.router.navigate(['/incidents', incidentId]);
  }

  private countBySeverity(incidents: Incident[], severity: Severity): number {
    return incidents.filter(
      (i) => i.severity === severity && i.status !== 'resolved' && i.status !== 'closed'
    ).length;
  }
}
