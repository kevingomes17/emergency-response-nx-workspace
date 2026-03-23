# System Architecture — UML Component Diagram

```mermaid
C4Component
  title Emergency Response Dispatch System — Component Architecture
```

```mermaid
graph TB
  subgraph CLIENTS["Client Applications"]
    direction LR
    CR["<b>Control Room</b><br/><i>Angular Web App</i><br/>━━━━━━━━━━━━━━━<br/>Dashboard & Map View<br/>Incident Management<br/>Resource Dispatch<br/>Alert Monitoring<br/>Settings Management"]
    FA["<b>Field App</b><br/><i>React Native</i><br/><i>iOS / Android / Web</i><br/>━━━━━━━━━━━━━━━<br/>Incident Reporting<br/>Assignment Tracking<br/>Push Notifications<br/>Role-based Access"]
  end

  subgraph GCP["Google Cloud Platform"]
    direction TB
    CF["<b>Cloud Functions</b><br/><i>Node.js 22</i><br/>━━━━━━━━━━━━━━━<br/>ingestIncident (HTTP)<br/>ingestResource (HTTP)<br/>onIncidentCreated<br/>onIncidentUpdated<br/>periodicEscalation<br/>sendNotification"]
    FS["<b>Cloud Firestore</b><br/><i>NoSQL Document DB</i><br/>━━━━━━━━━━━━━━━<br/>incidents<br/>resources<br/>alerts<br/>users<br/>escalation_rules<br/>service_zones"]
    FCM["<b>Firebase Cloud<br/>Messaging</b><br/>━━━━━━━━━━━━━━━<br/>Push Notifications<br/>to Mobile Devices"]
  end

  subgraph SUPA["Supabase"]
    direction TB
    PG["<b>PostgreSQL + PostGIS</b><br/><i>Geospatial Engine</i><br/>━━━━━━━━━━━━━━━<br/>vehicles (location sync)<br/>service_zones (polygons)<br/>calculate_dispatch() RPC<br/>GIST Spatial Indexes"]
  end

  %% Real-time data sync
  CR <-->|"Real-time Sync<br/><i>onSnapshot listeners</i>"| FS
  FA <-->|"Real-time Sync<br/><i>onSnapshot listeners</i>"| FS

  %% Cloud Function triggers
  FS -->|"Firestore Triggers<br/><i>onCreate / onUpdate</i>"| CF
  CF -->|"Write incidents,<br/>resources, alerts"| FS

  %% Push notifications
  CF -->|"Send push<br/>notifications"| FCM
  FCM -->|"PUSH"| FA

  %% Supabase integration
  CF -->|"RPC: calculate_dispatch()<br/>Upsert: vehicle locations"| PG
  CR -->|"Read: service_zones_view<br/><i>via anon key</i>"| PG

  %% External ingestion
  EXT["<b>External Systems</b><br/><i>IoT Sensors, CCTV,<br/>Third-party APIs</i>"] -->|"HTTP POST<br/>ingestIncident<br/>ingestResource"| CF

  %% Styling
  classDef client fill:#1e3a5f,stroke:#4a9eff,color:#fff,stroke-width:2px
  classDef gcp fill:#2d1b4e,stroke:#9c7cff,color:#fff,stroke-width:2px
  classDef supa fill:#1b3d2f,stroke:#3ecf8e,color:#fff,stroke-width:2px
  classDef external fill:#3d2d1b,stroke:#ff9800,color:#fff,stroke-width:2px

  class CR,FA client
  class CF,FS,FCM gcp
  class PG supa
  class EXT external
```

## Data Flow Summary

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          DATA FLOW OVERVIEW                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  INGESTION                                                              │
│  ─────────                                                              │
│  Field App / External ──HTTP POST──► Cloud Functions ──► Firestore      │
│                                           │                             │
│  REAL-TIME SYNC                           │                             │
│  ──────────────                           │                             │
│  Firestore ◄──onSnapshot──► Control Room  │                             │
│  Firestore ◄──onSnapshot──► Field App     │                             │
│                                           │                             │
│  SMART DISPATCH                           │                             │
│  ──────────────                           ▼                             │
│  Firestore trigger ──► Cloud Function ──RPC──► Supabase PostGIS         │
│                              │                   │                      │
│                              │         calculate_dispatch()             │
│                              │         (distance + zone penalty)        │
│                              │                   │                      │
│                              ◄───ranked vehicles─┘                      │
│                              │                                          │
│                              ▼                                          │
│                         Firestore (assign vehicle to incident)          │
│                              │                                          │
│  NOTIFICATIONS               ▼                                          │
│  ─────────────          Alert doc created                               │
│                              │                                          │
│                              ▼                                          │
│                    Cloud Function (sendNotification)                     │
│                              │                                          │
│                              ▼                                          │
│                    Firebase Cloud Messaging ──PUSH──► Field App          │
│                                                                         │
│  ESCALATION                                                             │
│  ──────────                                                             │
│  Cloud Scheduler (every 2 min) ──► periodicEscalation()                 │
│                                         │                               │
│                                         ▼                               │
│                              Check unacknowledged incidents              │
│                              Escalate: supervisor → manager → director  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Technology | Responsibility |
|-----------|-----------|----------------|
| **Control Room** | Angular 20, Leaflet, RxJS | Dispatcher dashboard, map visualization, incident/resource management, service zone CRUD |
| **Field App** | React Native 0.79 | Citizen incident reporting, responder assignments, push notifications, multi-role access |
| **Cloud Firestore** | Firebase NoSQL | Real-time source of truth for incidents, resources, alerts, users, escalation rules |
| **Cloud Functions** | Node.js 22, Firebase Functions v2 | Event-driven backend: ingestion, dispatch, escalation, notifications, Supabase sync |
| **Supabase (PostGIS)** | PostgreSQL 15 + PostGIS | Geospatial dispatch engine: distance calculations, service zone boundaries, spatial indexing |
| **Firebase Cloud Messaging** | FCM | Push notifications to iOS/Android field responders |

## Key Integration Patterns

| Pattern | Implementation |
|---------|---------------|
| **Real-time Sync** | Firestore `onSnapshot` listeners in both client apps |
| **Event-driven Backend** | Firestore triggers (`onDocumentCreated`, `onDocumentUpdated`) invoke Cloud Functions |
| **Geospatial RPC** | Cloud Functions call Supabase `calculate_dispatch()` via REST API |
| **Graceful Degradation** | If Supabase is unavailable, dispatch falls back to naive first-available logic |
| **Non-blocking Sync** | Vehicle location sync to Supabase is fire-and-forget; Firestore writes always succeed |
