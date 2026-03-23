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
      @if (active()) {
        <span class="stat__active-icon material-icons-outlined">filter_alt</span>
      }
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
        position: relative;
      }
      .stat:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }
      .stat--active {
        outline: 2px solid currentColor;
        outline-offset: -2px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        transform: translateY(-2px);
        background: #f8f8ff;
      }
      .stat__active-icon {
        position: absolute;
        top: 6px;
        right: 6px;
        font-size: 14px;
        color: currentColor;
        opacity: 0.7;
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
