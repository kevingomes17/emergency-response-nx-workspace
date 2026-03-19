import { Component, computed, input } from '@angular/core';
import { IncidentStatus } from '@emergency-response/shared/data-models';

@Component({
  selector: 'er-status-badge',
  imports: [],
  template: `<span class="badge" [class]="'badge--' + status()">{{ label() }}</span>`,
  styles: [
    `
      .badge {
        display: inline-block;
        padding: 0.2em 0.6em;
        border-radius: 4px;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: #fff;
      }
      .badge--reported {
        background-color: #1565c0;
      }
      .badge--acknowledged {
        background-color: #6a1b9a;
      }
      .badge--dispatched {
        background-color: #f57c00;
      }
      .badge--in_progress {
        background-color: #0277bd;
      }
      .badge--resolved {
        background-color: #388e3c;
      }
      .badge--closed {
        background-color: #757575;
      }
    `,
  ],
})
export class StatusBadge {
  readonly status = input.required<IncidentStatus>();

  protected readonly label = computed(() => this.status().replace(/_/g, ' '));
}
