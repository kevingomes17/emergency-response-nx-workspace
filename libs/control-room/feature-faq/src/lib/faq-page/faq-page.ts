import { Component } from '@angular/core';

interface FaqSection {
  title: string;
  items: { question: string; answer: string }[];
}

@Component({
  selector: 'er-faq-page',
  standalone: true,
  template: `
    <div class="faq-page">
      <header class="faq-header">
        <h1>FAQ</h1>
        <p class="subtitle">How severity scoring, alerts, and escalation work</p>
      </header>

      @for (section of sections; track section.title) {
        <section class="faq-section">
          <h2 class="section-title">{{ section.title }}</h2>
          @for (item of section.items; track item.question) {
            <details class="faq-item">
              <summary class="faq-question">{{ item.question }}</summary>
              <div class="faq-answer" [innerHTML]="item.answer"></div>
            </details>
          }
        </section>
      }
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

    .faq-page {
      max-width: 800px;
      margin: 0 auto;
      padding: 1rem;
      padding-bottom: 5rem;
    }

    .faq-header {
      padding: 1.5rem 0 1rem;
    }

    .faq-header h1 {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 700;
    }

    .subtitle {
      margin: 0.25rem 0 0;
      color: #a0a0b8;
      font-size: 0.85rem;
    }

    .faq-section {
      margin-bottom: 1.5rem;
    }

    .section-title {
      font-size: 0.8rem;
      font-weight: 600;
      color: #6c8cff;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 0 0 0.75rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid #2e2e3e;
    }

    .faq-item {
      background: #1e1e2e;
      border: 1px solid #2e2e3e;
      border-radius: 10px;
      margin-bottom: 0.5rem;
      overflow: hidden;
    }

    .faq-question {
      padding: 0.85rem 1rem;
      font-weight: 600;
      font-size: 0.9rem;
      cursor: pointer;
      list-style: none;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .faq-question::-webkit-details-marker {
      display: none;
    }

    .faq-question::before {
      content: '\\25B6';
      font-size: 0.6rem;
      color: #6c8cff;
      transition: transform 0.2s;
    }

    .faq-item[open] > .faq-question::before {
      transform: rotate(90deg);
    }

    .faq-answer {
      padding: 0 1rem 1rem;
      color: #a0a0b8;
      font-size: 0.85rem;
      line-height: 1.6;
    }

    :host ::ng-deep .faq-answer table {
      width: 100%;
      border-collapse: collapse;
      margin: 0.75rem 0;
      font-size: 0.8rem;
    }

    :host ::ng-deep .faq-answer th,
    :host ::ng-deep .faq-answer td {
      padding: 0.5rem 0.75rem;
      text-align: left;
      border: 1px solid #2e2e3e;
    }

    :host ::ng-deep .faq-answer th {
      background: #16162a;
      color: #c0c0d8;
      font-weight: 600;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    :host ::ng-deep .faq-answer td {
      color: #a0a0b8;
    }

    :host ::ng-deep .faq-answer code {
      background: #16162a;
      padding: 0.15rem 0.4rem;
      border-radius: 4px;
      font-size: 0.8rem;
      color: #c0c0d8;
    }

    :host ::ng-deep .faq-answer p {
      margin: 0.5rem 0;
    }

    @media (min-width: 640px) {
      .faq-page {
        padding: 1.5rem;
        padding-bottom: 5rem;
      }

      .faq-header h1 {
        font-size: 1.75rem;
      }
    }
  `,
})
export class FaqPage {
  readonly sections: FaqSection[] = [
    {
      title: 'Severity Scoring',
      items: [
        {
          question: 'How is incident severity determined?',
          answer: `
            <p>Severity is computed automatically using a <strong>point-based scoring system</strong>.
            A base score is assigned by incident type, then modifiers are added based on situational factors.
            The total score maps to a severity level.</p>
          `,
        },
        {
          question: 'What are the base scores by incident type?',
          answer: `
            <table>
              <thead><tr><th>Type</th><th>Base Score</th></tr></thead>
              <tbody>
                <tr><td>Fire</td><td>3</td></tr>
                <tr><td>Medical</td><td>2</td></tr>
                <tr><td>Security</td><td>2</td></tr>
                <tr><td>Water Leak</td><td>1</td></tr>
                <tr><td>Power Failure</td><td>1</td></tr>
              </tbody>
            </table>
          `,
        },
        {
          question: 'What modifiers affect the score?',
          answer: `
            <table>
              <thead><tr><th>Factor</th><th>Condition</th><th>Points</th></tr></thead>
              <tbody>
                <tr><td>Casualties</td><td>5 or more</td><td>+3</td></tr>
                <tr><td>Casualties</td><td>1 to 4</td><td>+2</td></tr>
                <tr><td>Affected area</td><td>Large</td><td>+2</td></tr>
                <tr><td>Affected area</td><td>Medium</td><td>+1</td></tr>
                <tr><td>Hazardous materials</td><td>Present</td><td>+2</td></tr>
                <tr><td>Structural damage</td><td>Present</td><td>+1</td></tr>
              </tbody>
            </table>
          `,
        },
        {
          question: 'How does the total score map to severity?',
          answer: `
            <table>
              <thead><tr><th>Total Score</th><th>Severity</th></tr></thead>
              <tbody>
                <tr><td>7+</td><td>Critical</td></tr>
                <tr><td>5 &ndash; 6</td><td>High</td></tr>
                <tr><td>3 &ndash; 4</td><td>Medium</td></tr>
                <tr><td>0 &ndash; 2</td><td>Low</td></tr>
              </tbody>
            </table>
            <p>Example: a <strong>Fire</strong> (3) with <strong>2 casualties</strong> (+2) and
            <strong>hazardous materials</strong> (+2) = score 7 &rarr; <strong>Critical</strong>.</p>
          `,
        },
      ],
    },
    {
      title: 'Alerts & Notifications',
      items: [
        {
          question: 'How are alerts generated?',
          answer: `
            <p>Alerts are created automatically by cloud functions in response to incidents:</p>
            <p><strong>1. On incident creation</strong> &mdash; escalation rules are evaluated and initial
            alerts are sent to the appropriate roles (e.g. supervisors for critical, dispatchers for others).</p>
            <p><strong>2. On incident update</strong> &mdash; if the status changes, rules are re-evaluated
            and new escalation alerts may be created.</p>
            <p><strong>3. Periodic check</strong> &mdash; every 2 minutes, a scheduled function checks all
            unacknowledged <code>reported</code> incidents and creates escalation alerts if time thresholds are exceeded.</p>
          `,
        },
        {
          question: 'How are push notifications delivered?',
          answer: `
            <p>When an alert document is created in Firestore, a trigger function collects FCM tokens from
            target users and roles, deduplicates them, and sends a multicast push notification via
            Firebase Cloud Messaging.</p>
          `,
        },
      ],
    },
    {
      title: 'Escalation Rules',
      items: [
        {
          question: 'Who gets notified for each severity level?',
          answer: `
            <table>
              <thead><tr><th>Severity</th><th>Notify</th><th>Auto-dispatch</th></tr></thead>
              <tbody>
                <tr><td>Critical</td><td>Supervisor</td><td>Yes</td></tr>
                <tr><td>High</td><td>Dispatcher</td><td>No</td></tr>
                <tr><td>Medium</td><td>Dispatcher</td><td>No</td></tr>
                <tr><td>Low</td><td>Dispatcher</td><td>No</td></tr>
              </tbody>
            </table>
          `,
        },
        {
          question: 'What are the escalation timelines?',
          answer: `
            <table>
              <thead><tr><th>Severity</th><th>Escalation</th></tr></thead>
              <tbody>
                <tr><td>Critical</td><td>2 min &rarr; Manager, 5 min &rarr; Director</td></tr>
                <tr><td>High</td><td>5 min &rarr; Supervisor, 10 min &rarr; Manager</td></tr>
                <tr><td>Medium</td><td>15 min &rarr; Supervisor</td></tr>
                <tr><td>Low</td><td>30 min &rarr; Supervisor</td></tr>
              </tbody>
            </table>
            <p>Escalation only applies to incidents that remain in <code>reported</code> status
            (unacknowledged). Once acknowledged or resolved, escalation stops.</p>
          `,
        },
      ],
    },
  ];
}
