import { Component, input } from '@angular/core';
import { Severity } from '@emergency-response/shared/data-models';

@Component({
  selector: 'er-severity-badge',
  imports: [],
  template: `<span class="badge" [class]="'badge--' + severity()">{{ severity() }}</span>`,
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
      .badge--critical {
        background-color: #d32f2f;
      }
      .badge--high {
        background-color: #f57c00;
      }
      .badge--medium {
        background-color: #fbc02d;
        color: #333;
      }
      .badge--low {
        background-color: #388e3c;
      }
    `,
  ],
})
export class SeverityBadge {
  readonly severity = input.required<Severity>();
}
