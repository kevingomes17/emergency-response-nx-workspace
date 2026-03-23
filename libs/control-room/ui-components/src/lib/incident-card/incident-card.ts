import { Component, computed, input, output, signal } from '@angular/core';
import { Incident, IncidentType, Resource, ResourceType } from '@emergency-response/shared/data-models';
import { StatusBadge } from '../status-badge/status-badge';

export type IncidentAction = 'acknowledge' | 'dispatch' | 'resolve' | 'escalate';

const RESOURCE_TYPE_ICONS: Record<ResourceType, string> = {
  fire_truck: '\u{1F692}',
  ambulance: '\u{1F691}',
  police: '\u{1F693}',
  maintenance: '\u{1F527}',
  electrician: '\u{26A1}',
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#d32f2f',
  high: '#f57c00',
  medium: '#fbc02d',
  low: '#388e3c',
};

const TYPE_ICONS: Record<IncidentType, string> = {
  fire: '\uD83D\uDD25',
  medical: '\uD83C\uDFE5',
  security: '\uD83D\uDEA8',
  water_leakage: '\uD83D\uDCA7',
  power_failure: '\u26A1',
};

@Component({
  selector: 'er-incident-card',
  imports: [StatusBadge],
  template: `
    <article class="card" tabindex="0" role="button" (click)="selectIncident.emit(incident().incident_id)">
      <div class="card__row">
        <span class="card__icon">{{ icon() }}</span>
        <p class="card__description">{{ incident().description || (incident().type.replace('_', ' ')) }}</p>
        <span class="card__severity-dot" [style.background]="severityColor()"></span>
        <span class="card__time">{{ timeSince() }}</span>
      </div>
      <div class="card__footer">
        <div class="card__actions">
          <span class="tooltip-wrap">
            <button
              class="action-btn ack"
              (click)="onAction($event, 'acknowledge')"
              [disabled]="incident().status !== 'reported'"
            ><span class="material-icons-outlined action-icon">check_circle</span></button>
            <span class="tooltip">Acknowledge</span>
          </span>
          <span class="tooltip-wrap">
            <button
              class="action-btn dispatch"
              (click)="toggleDispatchPicker($event)"
              [disabled]="incident().assigned_units.length > 0 || isTerminal()"
            ><span class="material-icons-outlined action-icon">local_shipping</span></button>
            <span class="tooltip">Dispatch</span>
          </span>
          <span class="tooltip-wrap">
            <button
              class="action-btn resolve"
              (click)="onAction($event, 'resolve')"
              [disabled]="isTerminal()"
            ><span class="material-icons-outlined action-icon">task_alt</span></button>
            <span class="tooltip">Resolve</span>
          </span>
          <span class="tooltip-wrap">
            <button
              class="action-btn escalate"
              (click)="onAction($event, 'escalate')"
              [disabled]="incident().escalation_level >= 3 || isTerminal()"
            ><span class="material-icons-outlined action-icon">priority_high</span></button>
            <span class="tooltip">Escalate</span>
          </span>
        </div>
      </div>
      @if (showDispatchPicker()) {
        <div class="dispatch-picker" (click)="$event.stopPropagation()">
          <div class="picker-header">
            <span class="picker-title">Select resource to dispatch</span>
            <button class="picker-close" (click)="showDispatchPicker.set(false)">&times;</button>
          </div>
          <div class="picker-list">
            @for (res of availableResources(); track res.unit_id) {
              <button class="picker-item" (click)="dispatchResource(res.unit_id)">
                <span class="picker-icon">{{ resourceIcon(res.type) }}</span>
                <span class="picker-id">{{ res.unit_id }}</span>
                <span class="picker-type">{{ res.type.replace('_', ' ') }}</span>
              </button>
            } @empty {
              <p class="picker-empty">No available resources</p>
            }
          </div>
        </div>
      }
    </article>
  `,
  styles: [
    `
      .card {
        background: #fff;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        padding: 0.65rem 0.85rem;
        cursor: pointer;
        transition: box-shadow 0.2s;
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
      }
      .card:hover {
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
      }
      .card__row {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .card__icon {
        font-size: 1.2rem;
        flex-shrink: 0;
      }
      .card__description {
        margin: 0;
        font-size: 0.85rem;
        color: #333;
        line-height: 1.3;
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .card__time {
        font-size: 0.72rem;
        color: #999;
        flex-shrink: 0;
        white-space: nowrap;
      }
      .card__footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-left: 1.7rem;
      }
      .card__severity-dot {
        width: 10px;
        height: 10px;
        border-radius: 2px;
        flex-shrink: 0;
      }
      .card__actions {
        display: flex;
        gap: 0.3rem;
      }
      .action-btn {
        padding: 0.25rem;
        border-radius: 3px;
        cursor: pointer;
        transition: opacity 0.15s;
        color: #fff;
        border: none;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        line-height: 1;
      }
      .action-icon {
        font-size: 15px;
      }
      .action-btn:disabled {
        opacity: 0.25;
        cursor: default;
      }
      .action-btn.ack {
        background: #2196f3;
      }
      .action-btn.dispatch {
        background: #f57c00;
      }
      .action-btn.resolve {
        background: #388e3c;
      }
      .action-btn.escalate {
        background: #d32f2f;
      }
      .action-btn:hover:not(:disabled) {
        opacity: 0.8;
      }
      .tooltip-wrap {
        position: relative;
        display: inline-flex;
      }
      .tooltip {
        position: absolute;
        bottom: calc(100% + 6px);
        left: 50%;
        transform: translateX(-50%);
        background: #222;
        color: #fff;
        font-size: 0.65rem;
        font-weight: 500;
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        white-space: nowrap;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.15s;
        z-index: 10;
      }
      .tooltip::after {
        content: '';
        position: absolute;
        top: 100%;
        left: 50%;
        transform: translateX(-50%);
        border: 4px solid transparent;
        border-top-color: #222;
      }
      .tooltip-wrap:hover .tooltip {
        opacity: 1;
      }
      .dispatch-picker {
        background: #f0f0f5;
        border: 1px solid #d0d0d0;
        border-radius: 6px;
        padding: 0.5rem;
        margin-top: 0.25rem;
      }
      .picker-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.4rem;
      }
      .picker-title {
        font-size: 0.72rem;
        font-weight: 600;
        color: #555;
        text-transform: uppercase;
        letter-spacing: 0.03em;
      }
      .picker-close {
        background: none;
        border: none;
        font-size: 1rem;
        color: #999;
        cursor: pointer;
        padding: 0 0.2rem;
        line-height: 1;
      }
      .picker-close:hover {
        color: #333;
      }
      .picker-list {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }
      .picker-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.4rem 0.6rem;
        border: 1px solid #d0d0d8;
        border-radius: 5px;
        background: #fff;
        cursor: pointer;
        transition: background 0.15s, border-color 0.15s;
        text-align: left;
      }
      .picker-item:hover {
        background: #e8e8f0;
        border-color: #f57c00;
      }
      .picker-icon {
        font-size: 1.1rem;
      }
      .picker-id {
        font-size: 0.8rem;
        font-weight: 600;
        color: #333;
      }
      .picker-type {
        font-size: 0.72rem;
        color: #888;
        text-transform: capitalize;
      }
      .picker-empty {
        margin: 0;
        font-size: 0.78rem;
        color: #999;
        text-align: center;
        padding: 0.5rem;
      }
    `,
  ],
})
export class IncidentCard {
  readonly incident = input.required<Incident>();
  readonly availableResources = input<Resource[]>([]);
  readonly selectIncident = output<string>();
  readonly action = output<{ incidentId: string; action: IncidentAction }>();
  readonly dispatchResource$ = output<{ incidentId: string; unitId: string }>();

  protected readonly showDispatchPicker = signal(false);

  protected readonly icon = computed(() => TYPE_ICONS[this.incident().type]);
  protected readonly severityColor = computed(() => SEVERITY_COLORS[this.incident().severity] ?? '#888');

  protected readonly isTerminal = computed(() => {
    const s = this.incident().status;
    return s === 'resolved' || s === 'closed';
  });

  protected onAction(event: Event, act: IncidentAction): void {
    event.stopPropagation();
    this.action.emit({ incidentId: this.incident().incident_id, action: act });
  }

  protected toggleDispatchPicker(event: Event): void {
    event.stopPropagation();
    this.showDispatchPicker.update((v) => !v);
  }

  protected dispatchResource(unitId: string): void {
    this.dispatchResource$.emit({ incidentId: this.incident().incident_id, unitId });
    this.showDispatchPicker.set(false);
  }

  protected resourceIcon(type: ResourceType): string {
    return RESOURCE_TYPE_ICONS[type] ?? '\u{1F698}';
  }

  protected readonly timeSince = computed(() => {
    const raw = this.incident().created_at;
    if (!raw) return '';

    // Handle Firestore Timestamp objects (with seconds/nanoseconds)
    const created =
      typeof raw === 'object' && 'seconds' in (raw as Record<string, unknown>)
        ? new Date((raw as unknown as { seconds: number }).seconds * 1000)
        : new Date(raw);

    if (isNaN(created.getTime())) return '';

    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    if (diffMs < 0) return 'Just now';

    const diffMins = Math.floor(diffMs / 60_000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  });
}
