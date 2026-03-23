import { Component, inject, signal } from '@angular/core';
import { AsyncPipe, DatePipe, TitleCasePipe } from '@angular/common';
import { AlertService } from '@emergency-response/control-room/data-access';
import { Alert, AlertPriority } from '@emergency-response/shared/data-models';
import { map, Observable, combineLatest, BehaviorSubject } from 'rxjs';

@Component({
  selector: 'er-alerts-page',
  standalone: true,
  imports: [AsyncPipe, DatePipe, TitleCasePipe],
  template: `
    <div class="alerts-page">
      <header class="alerts-header">
        <h1>Alert Feed</h1>
      </header>

      <div class="filter-bar">
        @for (f of filters; track f.value) {
          <button
            class="filter-btn"
            [class.active]="activeFilter() === f.value"
            (click)="setFilter(f.value)"
          >
            {{ f.label }}
          </button>
        }
      </div>

      <div class="alert-list">
        @for (alert of filteredAlerts$ | async; track alert.alert_id) {
          <article class="alert-card">
            <div class="alert-card-header">
              <span class="alert-title">{{ alert.title }}</span>
              <span class="priority-badge" [class]="alert.priority">
                {{ alert.priority | titlecase }}
              </span>
            </div>
            <p class="alert-body">{{ alert.body }}</p>
            @if (alert.target_roles.length > 0 || alert.target_user_ids.length > 0) {
              <div class="alert-recipients">
                <span class="recipients-label">Sent to:</span>
                @for (role of alert.target_roles; track role) {
                  <span class="recipient-badge role">{{ role | titlecase }}</span>
                }
                @for (uid of alert.target_user_ids; track uid) {
                  <span class="recipient-badge user">{{ uid }}</span>
                }
              </div>
            }
            <div class="alert-footer">
              <time class="alert-time">{{ alert.created_at | date:'short' }}</time>
              @if (!alert.acknowledged) {
                <button class="ack-btn" (click)="acknowledge(alert)">Acknowledge</button>
              } @else {
                <span class="ack-label">Acknowledged</span>
              }
            </div>
          </article>
        } @empty {
          <p class="empty-state">No alerts</p>
        }
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
      min-height: 100vh;
      background: #121220;
      color: #ffffff;
      font-family: system-ui, -apple-system, sans-serif;
    }

    .alerts-page {
      max-width: 800px;
      margin: 0 auto;
      padding: 1rem;
    }

    .alerts-header {
      padding: 1.5rem 0 1rem;
    }

    .alerts-header h1 {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 700;
    }

    /* Filter bar */
    .filter-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-bottom: 1.5rem;
    }

    .filter-btn {
      padding: 0.4rem 0.9rem;
      border: 1px solid #2e2e3e;
      border-radius: 9999px;
      background: #1e1e2e;
      color: #a0a0b8;
      font-size: 0.8rem;
      font-weight: 500;
      cursor: pointer;
      transition: border-color 0.2s, color 0.2s;
    }

    .filter-btn:hover {
      border-color: #6366f1;
      color: #ffffff;
    }

    .filter-btn.active {
      background: #6366f1;
      border-color: #6366f1;
      color: #ffffff;
    }

    /* Alert list */
    .alert-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .alert-card {
      background: #1e1e2e;
      border: 1px solid #2e2e3e;
      border-radius: 10px;
      padding: 1rem;
    }

    .alert-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }

    .alert-title {
      font-weight: 600;
      font-size: 0.95rem;
    }

    .priority-badge {
      display: inline-block;
      padding: 0.2rem 0.6rem;
      border-radius: 9999px;
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .priority-badge.urgent { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
    .priority-badge.high   { background: rgba(249, 115, 22, 0.2); color: #f97316; }
    .priority-badge.normal { background: rgba(59, 130, 246, 0.2); color: #60a5fa; }
    .priority-badge.low    { background: rgba(34, 197, 94, 0.2);  color: #22c55e; }

    .alert-body {
      color: #a0a0b8;
      font-size: 0.85rem;
      margin: 0 0 0.75rem 0;
      line-height: 1.4;
    }

    .alert-recipients {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.35rem;
      margin-bottom: 0.75rem;
    }

    .recipients-label {
      font-size: 0.72rem;
      color: #6b6b80;
      font-weight: 500;
    }

    .recipient-badge {
      font-size: 0.68rem;
      font-weight: 600;
      padding: 0.15rem 0.5rem;
      border-radius: 4px;
    }

    .recipient-badge.role {
      background: rgba(99, 102, 241, 0.15);
      color: #818cf8;
    }

    .recipient-badge.user {
      background: rgba(34, 197, 94, 0.15);
      color: #22c55e;
    }

    .alert-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .alert-time {
      color: #6b6b80;
      font-size: 0.75rem;
    }

    .ack-btn {
      padding: 0.35rem 0.75rem;
      border: none;
      border-radius: 6px;
      background: #3b82f6;
      color: #ffffff;
      font-size: 0.78rem;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.2s;
    }

    .ack-btn:hover {
      opacity: 0.85;
    }

    .ack-label {
      color: #22c55e;
      font-size: 0.78rem;
      font-weight: 500;
    }

    .empty-state {
      text-align: center;
      color: #6b6b80;
      padding: 3rem 1rem;
      font-size: 0.95rem;
    }

    @media (min-width: 640px) {
      .alerts-page {
        padding: 1.5rem;
      }

      .alerts-header h1 {
        font-size: 1.75rem;
      }
    }
  `,
})
export class AlertsPage {
  private readonly alertService = inject(AlertService);
  private readonly filterSubject = new BehaviorSubject<AlertPriority | 'all'>('all');

  readonly activeFilter = signal<AlertPriority | 'all'>('all');

  readonly filters: { label: string; value: AlertPriority | 'all' }[] = [
    { label: 'All', value: 'all' },
    { label: 'Urgent', value: 'urgent' },
    { label: 'High', value: 'high' },
    { label: 'Normal', value: 'normal' },
    { label: 'Low', value: 'low' },
  ];

  readonly filteredAlerts$: Observable<Alert[]> = combineLatest([
    this.alertService.alerts$,
    this.filterSubject,
  ]).pipe(
    map(([alerts, filter]) =>
      filter === 'all'
        ? alerts
        : alerts.filter((a) => a.priority === filter)
    )
  );

  setFilter(value: AlertPriority | 'all'): void {
    this.activeFilter.set(value);
    this.filterSubject.next(value);
  }

  async acknowledge(alert: Alert): Promise<void> {
    await this.alertService.acknowledgeAlert(alert.alert_id);
  }
}
