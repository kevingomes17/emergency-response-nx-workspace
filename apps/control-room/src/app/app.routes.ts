import { Route } from '@angular/router';

export const appRoutes: Route[] = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('@emergency-response/control-room/feature-dashboard').then(
        (m) => m.DashboardPage
      ),
  },
  {
    path: 'incidents/:id',
    loadComponent: () =>
      import('@emergency-response/control-room/feature-incident').then(
        (m) => m.IncidentDetailPage
      ),
  },
  {
    path: 'alerts',
    loadComponent: () =>
      import('@emergency-response/control-room/feature-alerts').then(
        (m) => m.AlertsPage
      ),
  },
  {
    path: 'resources',
    loadComponent: () =>
      import('@emergency-response/control-room/feature-resources').then(
        (m) => m.ResourcesPage
      ),
  },
  {
    path: 'faq',
    loadComponent: () =>
      import('@emergency-response/control-room/feature-faq').then(
        (m) => m.FaqPage
      ),
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
