import { Component, input } from '@angular/core';
import { Resource } from '@emergency-response/shared/data-models';

@Component({
  selector: 'er-resource-card',
  imports: [],
  template: `
    <article class="card">
      <div class="card__type">{{ resource().type.replace('_', ' ') }}</div>
      <span class="card__status" [class]="'card__status--' + resource().status">
        {{ resource().status.replace('_', ' ') }}
      </span>
      <div class="card__capacity">
        Capacity: <strong>{{ resource().capacity }}</strong>
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
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }
      .card__type {
        font-weight: 600;
        font-size: 1rem;
        text-transform: capitalize;
        color: #555;
      }
      .card__status {
        display: inline-block;
        width: fit-content;
        padding: 0.2em 0.6em;
        border-radius: 4px;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        color: #fff;
      }
      .card__status--available {
        background-color: #388e3c;
      }
      .card__status--dispatched {
        background-color: #f57c00;
      }
      .card__status--en_route {
        background-color: #0277bd;
      }
      .card__status--on_scene {
        background-color: #6a1b9a;
      }
      .card__status--offline {
        background-color: #757575;
      }
      .card__capacity {
        font-size: 0.85rem;
        color: #555;
      }
    `,
  ],
})
export class ResourceCard {
  readonly resource = input.required<Resource>();
}
