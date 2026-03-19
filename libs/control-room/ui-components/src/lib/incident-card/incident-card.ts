import { Component, computed, input, output } from '@angular/core';
import { Incident, IncidentType } from '@emergency-response/shared/data-models';
import { SeverityBadge } from '../severity-badge/severity-badge';
import { StatusBadge } from '../status-badge/status-badge';

const TYPE_ICONS: Record<IncidentType, string> = {
  fire: '\uD83D\uDD25',
  medical: '\uD83C\uDFE5',
  security: '\uD83D\uDEA8',
  water_leakage: '\uD83D\uDCA7',
  power_failure: '\u26A1',
};

@Component({
  selector: 'er-incident-card',
  imports: [SeverityBadge, StatusBadge],
  template: `
    <article class="card" tabindex="0" role="button" (click)="selectIncident.emit(incident().incident_id)">
      <header class="card__header">
        <span class="card__icon">{{ icon() }}</span>
        <div class="card__badges">
          <er-severity-badge [severity]="incident().severity" />
          <er-status-badge [status]="incident().status" />
        </div>
      </header>

      <div class="card__body">
        <p class="card__location">
          {{ incident().location.lat.toFixed(4) }},
          {{ incident().location.lng.toFixed(4) }}
        </p>
        <p class="card__time">{{ timeSince() }}</p>
        @if (incident().description) {
          <p class="card__description">{{ incident().description }}</p>
        }
      </div>
    </article>
  `,
  styles: [
    `
      .card {
        background: #fff;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        padding: 1rem;
        cursor: pointer;
        transition: box-shadow 0.2s;
      }
      .card:hover {
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
      }
      .card__header {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.75rem;
      }
      .card__icon {
        font-size: 1.5rem;
      }
      .card__badges {
        display: flex;
        gap: 0.4rem;
        flex-wrap: wrap;
        margin-left: auto;
      }
      .card__body {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }
      .card__location {
        margin: 0;
        font-size: 0.85rem;
        color: #555;
      }
      .card__time {
        margin: 0;
        font-size: 0.75rem;
        color: #999;
      }
      .card__description {
        margin: 0.5rem 0 0;
        font-size: 0.875rem;
        color: #333;
        line-height: 1.4;
      }
    `,
  ],
})
export class IncidentCard {
  readonly incident = input.required<Incident>();
  readonly selectIncident = output<string>();

  protected readonly icon = computed(() => TYPE_ICONS[this.incident().type]);

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
