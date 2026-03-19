import { Component, inject } from '@angular/core';
import { AsyncPipe, DatePipe, TitleCasePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { switchMap } from 'rxjs';
import {
  IncidentService,
  ResourceService,
} from '@emergency-response/control-room/data-access';
import {
  SeverityBadge,
  StatusBadge,
} from '@emergency-response/control-room/ui-components';
import { Incident, Resource } from '@emergency-response/shared/data-models';

@Component({
  selector: 'er-incident-detail-page',
  standalone: true,
  imports: [AsyncPipe, DatePipe, TitleCasePipe, SeverityBadge, StatusBadge],
  templateUrl: './incident-detail-page.html',
  styleUrl: './incident-detail-page.css',
})
export class IncidentDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly incidentService = inject(IncidentService);
  private readonly resourceService = inject(ResourceService);

  readonly incident$ = this.route.paramMap.pipe(
    switchMap((params) => this.incidentService.getIncident(params.get('id')!))
  );

  readonly availableResources$ = this.resourceService.getAvailableResources();

  async acknowledge(incident: Incident): Promise<void> {
    await this.incidentService.acknowledgeIncident(incident.incident_id);
  }

  async dispatch(incident: Incident): Promise<void> {
    await this.incidentService.updateIncidentStatus(
      incident.incident_id,
      'dispatched'
    );
  }

  async resolve(incident: Incident): Promise<void> {
    await this.incidentService.resolveIncident(incident.incident_id);
  }

  async escalate(incident: Incident): Promise<void> {
    await this.incidentService.escalateIncident(
      incident.incident_id,
      incident.escalation_level + 1
    );
  }

  async assignResource(incident: Incident, unitId: string): Promise<void> {
    await this.incidentService.assignResource(incident.incident_id, unitId);
  }

  async unassignResource(incident: Incident, unitId: string): Promise<void> {
    await this.incidentService.unassignResource(
      incident.incident_id,
      unitId,
      incident.assigned_units
    );
  }

  goBack(): void {
    this.router.navigate(['/']);
  }
}
