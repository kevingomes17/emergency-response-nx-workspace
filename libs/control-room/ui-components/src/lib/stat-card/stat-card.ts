import { Component, input, output } from '@angular/core';

@Component({
  selector: 'er-stat-card',
  imports: [],
  template: `
    <div
      class="stat"
      [class.stat--active]="active()"
      [style.border-top-color]="color()"
      [style.color]="color()"
      (click)="cardClick.emit()"
    >
      <span class="stat__value">{{ value() }}</span>
      <span class="stat__label">{{ label() }}</span>
    </div>
  `,
  styles: [
    `
      .stat {
        background: #fff;
        border: 1px solid #e0e0e0;
        border-top: 3px solid;
        border-radius: 8px;
        padding: 1.25rem 1rem;
        text-align: center;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        cursor: pointer;
        transition: transform 0.15s, box-shadow 0.15s;
      }
      .stat:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }
      .stat--active {
        outline: 2px solid currentColor;
        outline-offset: -2px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      }
      .stat__value {
        font-size: 2rem;
        font-weight: 700;
        line-height: 1;
      }
      .stat__label {
        font-size: 0.85rem;
        color: #666;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
    `,
  ],
})
export class StatCard {
  readonly label = input.required<string>();
  readonly value = input.required<number | string>();
  readonly color = input<string>('#333');
  readonly active = input<boolean>(false);
  readonly cardClick = output<void>();
}
