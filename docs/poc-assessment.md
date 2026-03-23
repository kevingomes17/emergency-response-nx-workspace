# POC Evaluation Assessment

## 1. Solution Tech Stack: Node.js, MongoDB or equivalent, React Native

| Required | Implemented |
|----------|------------|
| Node.js | Firebase Cloud Functions (Node.js 22) |
| MongoDB or equivalent | Firestore (NoSQL document DB) + Supabase PostgreSQL/PostGIS |
| React Native for Mobile | Field app built with React Native 0.79 (iOS, Android, Web) |

- **Firestore** serves as the real-time NoSQL document database (equivalent to MongoDB), handling incidents, resources, alerts, users, and escalation rules.
- **Supabase (PostgreSQL + PostGIS)** acts as a specialized geospatial computation engine for smart dispatch — distance calculations and service zone boundary queries.
- **Control-room** is an Angular web application for dispatchers. The requirement specifies "React Native for Mobile development", which is met by the field app. The control-room is a desktop dispatcher tool, not a mobile app.

## 2. Use Imagination and Complete the Challenge with Limited Requirements

The POC goes well beyond a basic incident reporting system:

- **Dual-database architecture** — Firestore for real-time data sync + PostGIS for geospatial queries, with Cloud Functions as the integration layer.
- **Smart dispatch with boundary-crossing penalties** — The `calculate_dispatch` PostGIS function ranks vehicles by distance and adds a 5km penalty for cross-zone dispatch, encouraging local resource utilization.
- **Interactive map dashboard** — Leaflet-based map with CartoDB Dark Matter tiles, showing color-coded incident markers, vehicle type icons, and service zone polygon boundaries.
- **Hierarchical dashboard filtering** — Top-level category tabs (Incidents, Resources, Service Zones) with severity/status sub-filters that control both list and map views.
- **Inline dispatch with vehicle picker** — Dispatchers can assign specific vehicles to incidents directly from the dashboard card without navigating to a detail page.
- **Cross-platform field app** — Single React Native codebase runs on iOS, Android, and Web with platform-specific adaptations (permissions, FCM, emulator host).
- **Dual-role mobile app** — Public citizens can report emergencies; field responders (and supervisors, dispatchers, managers, directors) can receive assignments and notifications.

## 3. Real-time Event Handling

- **Firestore `onSnapshot` listeners** in both the field app and control-room — incidents, resources, and alerts update in real-time across all connected clients.
- **Cloud Function triggers** (`onDocumentCreated`, `onDocumentUpdated`) react to data changes instantly, executing dispatch logic, sending notifications, and syncing to Supabase.
- **Periodic escalation** via a scheduled Cloud Function running every 2 minutes, automatically escalating unacknowledged incidents.
- **FCM push notifications** delivered to field responders in real-time when incidents are created, dispatched, or escalated.
- **Supabase vehicle sync** — vehicle location and status changes propagate from Firestore to Supabase on every update, keeping geospatial data current.

## 4. Smart Notification and Escalation Logic

- **Severity-based escalation rules** with configurable time thresholds stored in Firestore (`escalation_rules` collection).
- **Auto-dispatch** for critical incidents — automatically finds and assigns the nearest available vehicle of the correct type.
- **Time-based escalation chain**: reported → supervisor (2 min) → manager (5 min) → director — with configurable thresholds per severity level.
- **"No resource available" alerts** — when auto-dispatch fails to find a matching vehicle, an alert is created targeting both supervisor and manager roles for manual intervention.
- **Role-targeted notifications** — alerts are directed to specific roles (dispatcher, supervisor, manager, director) based on escalation rules.
- **FCM token management** — the field app registers/unregisters device tokens per user, enabling targeted push notifications via Firebase Cloud Messaging.

## 5. Mobile-friendly User Experience

- **React Native field app** with intuitive role selection screen (Public citizen vs Field responder).
- **Tab-based navigation** with Material Icons for a clean, native-feeling interface.
- **Dark theme** throughout for reduced eye strain during emergency operations.
- **GPS location capture** using the device's Geolocation API for accurate incident reporting.
- **Push notification support** via FCM with permission request flow on both iOS and Android.
- **Multi-role login** — responders, dispatchers, supervisors, managers, and directors can all log in to the field app with role-appropriate views.
- **Real-time assignment updates** — responders see incident assignments appear and update live via Firestore listeners.
- **Incident tracking for citizens** — public users can submit reports and track their status in the "My Reports" tab.

## 6. Clear System Design and Architecture Thinking

### Monorepo Structure (Nx Workspace)

```
apps/
  control-room/     — Angular web app (dispatcher dashboard)
  field-app/         — React Native mobile app (responders + citizens)
  cloud-functions/   — Firebase Cloud Functions (backend logic)

libs/
  shared/
    data-models/     — TypeScript interfaces shared across all apps
    util-escalation/ — Escalation evaluation logic
    util-severity/   — Severity scoring function
    util-supabase/   — Supabase client, vehicle sync, dispatch RPC wrapper
  control-room/
    data-access/     — Angular services (Firestore + Supabase)
    ui-components/   — Reusable components (StatCard, IncidentCard, DashboardMap, etc.)
    feature-*/       — Feature modules (dashboard, alerts, settings, incident detail)
```

### Data Flow Architecture

```
Field App (GPS/Report) → Firestore (source of truth)
                              ↓ (triggers)
                      Cloud Functions
                        ├── Evaluate escalation rules
                        ├── Supabase RPC (calculate_dispatch)
                        ├── Assign vehicle (Firestore batch write)
                        ├── Sync vehicle status to Supabase
                        └── Send FCM push notifications
                              ↓ (real-time listeners)
                      Control Room + Field App (live updates)
```

### Key Design Decisions

- **Firestore as source of truth** — all mutations go through Firestore; Supabase is a read-optimized geospatial mirror.
- **Cloud Functions as the sole integration point** — neither the field app nor control-room need direct Supabase access for dispatch logic.
- **Shared libraries** — data models, escalation logic, and Supabase utilities are shared across apps, preventing duplication and ensuring consistency.
- **Service zone management via Supabase** — the control-room reads zones from a Supabase view (`service_zones_view`) that converts PostGIS geography to GeoJSON for client-side rendering.

### Documentation

- `docs/smart-dispatch.md` — detailed dispatch calculation flow, penalty logic, fallback behavior
- `docs/incident-lifecycle.md` — sequence diagrams for incident creation, escalation, and dispatch

## 7. Strong Engineering Judgment and Trade-off Decisions

| Decision | Trade-off | Reasoning |
|----------|-----------|-----------|
| Firestore for real-time, Supabase for geospatial | Added complexity of two databases | Firestore has native real-time listeners; PostGIS has spatial indexes and functions that Firestore lacks. Each database does what it's best at. |
| Non-blocking Supabase syncs | Vehicle location in Supabase can be briefly stale | Firestore writes (source of truth) never fail due to Supabase issues. The dispatch function double-checks Firestore availability before assigning. |
| Graceful fallback to naive dispatch | Naive dispatch ignores proximity | System never leaves a critical incident unassigned. If Supabase is down, the first available vehicle of the correct type is dispatched. |
| Service role key for Cloud Functions, anon key for control-room | Two different access levels | Principle of least privilege — Cloud Functions need full table access; the control-room only needs to read service zones. |
| Database view for zone boundaries | Extra database object to maintain | PostgREST returns geography columns as hex EWKB; the view converts to GeoJSON text, making it directly usable by the Leaflet map without client-side binary parsing. |
| Angular for control-room (not React) | Mixed framework monorepo | The requirement specifies React Native for mobile only. Angular provides strong typing, dependency injection, and RxJS integration ideal for a real-time dispatcher dashboard. |
| Inline dispatch picker on incident cards | Slightly more complex card component | Reduces clicks for dispatchers — they can assign vehicles without navigating to a detail page, critical during high-pressure incidents. |
| Shared seed data file | Coupling between seed scripts | Ensures Firestore and Supabase always have consistent demo data; prevents drift between the two databases. |

## Gaps and Future Enhancements

- **Authentication** — currently uses demo user selection, not Firebase Auth. Production would add Firebase Auth with role-based access control.
- **Firestore security rules** — not configured. Production would enforce read/write rules per collection based on user roles.
- **Unit/integration tests** — not included in the POC. The shared libraries (util-escalation, util-severity) are testable with Vitest.
- **CI/CD pipeline** — not configured. Nx supports `affected` commands for incremental builds and deploys.
- **Distance matrix optimization** — for multiple simultaneous incidents, a global assignment solver (e.g., Google OR-Tools) could minimize total fleet travel time instead of greedy per-incident dispatch.
