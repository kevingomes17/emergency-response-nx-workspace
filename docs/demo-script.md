# Demo Script — Emergency Response Dispatch System

> Estimated duration: 10-12 minutes
> Prerequisites: Firebase emulators running, Supabase project with migrations applied, seed data loaded

---

## Pre-Demo Setup

```bash
# Terminal 1: Start Firebase emulators
npm exec nx serve cloud-functions

# Terminal 2: Seed Firestore (with emulator running)
npx ts-node apps/cloud-functions/src/seed.ts

# Terminal 3: Seed Supabase (one-time)
npx ts-node apps/cloud-functions/src/seed-supabase.ts

# Terminal 4: Start Control Room
npm exec nx serve control-room

# Terminal 5: Start Field App (web)
npm exec nx serve field-app
```

Open two browser windows side by side:
- **Left:** Control Room at `http://localhost:4200`
- **Right:** Field App at `http://localhost:4201`

---

## Act 1: System Overview (2 min)

### Control Room Dashboard

> "This is the Emergency Control Room — the dispatcher's command center."

1. Show the **Incidents** tab with severity sub-filter cards (Critical, High, Medium, Low)
2. Click **Resources** tab — show Available, Dispatched, Offline counts
3. Click **Service Zones** tab — map auto-switches, show the 4 Pune zones (Shivajinagar, Hinjewadi, Kothrud, Hadapsar) as colored polygons
4. Switch back to **Incidents**, click **Map** toggle — show incidents as color-coded markers and vehicles as type icons on the dark map
5. Click **Settings** in the nav bar — show the three tabs: Resources, Service Zones, Users

> "The system manages incidents, resources, service zones, and users — all in real-time."

---

## Act 2: Ingest a Real-Time Incident Event (2 min)

### Feature: Real-time event handling

> "Let's see what happens when a citizen reports an emergency."

1. In the **Field App**, select **Report an Emergency**
2. Enter name and email, click Continue
3. Fill in the report form:
   - Type: **Fire**
   - Description: "Smoke coming from warehouse near Kothrud junction"
   - Casualties: 0, Area: Small, No hazardous materials, No structural damage
4. Click **Submit Report**

> "The incident is written to Firestore. Watch the Control Room..."

5. Switch to the **Control Room** — the new incident appears **instantly** in the incident list (real-time Firestore listener)
6. The severity counts update automatically

> "No page refresh needed. Firestore's real-time listeners push updates to all connected clients."

---

## Act 3: Categorize and Prioritize by Severity (1 min)

### Feature: Severity scoring

> "The system automatically scores severity based on multiple factors."

1. Show the incident that was just created — note its computed severity (should be "medium" for a small fire with no casualties)

> "Severity is computed by a scoring function that weighs incident type, casualties, affected area, hazardous materials, and structural damage."

2. Now ingest a **critical** incident via the HTTP API (run in terminal):

```bash
curl -X POST http://127.0.0.1:5001/emergency-response-c6d39/us-central1/ingestIncident \
  -H "Content-Type: application/json" \
  -d '{
    "type": "fire",
    "location": {"lat": 18.532, "lng": 73.849},
    "description": "Multi-story building fire, 3 casualties reported",
    "casualties": 3,
    "affected_area": "large",
    "hazardous_materials": true,
    "structural_damage": true
  }'
```

3. Show the Control Room — new **critical** incident appears immediately
4. Click the **Critical** sub-filter card — only critical incidents are shown

> "The HTTP ingestion endpoint allows external systems — IoT sensors, CCTV analytics, third-party APIs — to feed incidents into the system. Severity is computed server-side."

---

## Act 4: Smart Dispatch with Geospatial Logic (2 min)

### Feature: Alerts, escalation, and smart dispatch

> "For critical incidents, the system auto-dispatches the nearest vehicle."

1. Check the Cloud Functions emulator terminal — show the logs:
   ```
   [autoDispatch] Smart dispatch: type=fire_truck for incident inc-xxx
   [autoDispatch] Dispatched ft-001 (distance: 320m, cost: 320)
   ```

> "The dispatch function called Supabase's PostGIS database. It calculated the distance from each available fire truck to the incident, added a 5km penalty for vehicles outside the incident's service zone, and dispatched the nearest one."

2. In the Control Room, switch to **Map** view — show the dispatched vehicle marker now has an orange status dot (dispatched)
3. Click the **Resources** tab — show the Dispatched count increased

> "If Supabase were unavailable, the system falls back to naive dispatch — it never leaves a critical incident unassigned."

---

## Act 5: Escalation and Notifications (2 min)

### Feature: Trigger alerts and escalation rules

> "When no resource is available, the system alerts supervisors and managers."

1. First, show the **Alerts** page in the Control Room — point out any existing alerts with their "Sent to" badges showing target roles

2. Now create an incident that can't be dispatched (all fire trucks are busy). Run in terminal:

```bash
curl -X POST http://127.0.0.1:5001/emergency-response-c6d39/us-central1/ingestIncident \
  -H "Content-Type: application/json" \
  -d '{
    "type": "fire",
    "location": {"lat": 18.590, "lng": 73.735},
    "description": "Electrical fire in Hinjewadi IT park server room",
    "casualties": 0,
    "affected_area": "medium",
    "hazardous_materials": true,
    "structural_damage": false
  }'
```

3. Check the emulator logs:
   ```
   [naiveDispatch] No available fire_truck resources found
   [alertNoResourceAvailable] No available fire truck resource found for critical fire incident. Manual dispatch required.
   ```

4. Switch to **Alerts** page — show the new alert:
   - Title: "CRITICAL fire incident"
   - Body: "No available fire truck resource found..."
   - Sent to: **Supervisor**, **Manager**

> "The system created an alert targeting supervisors and managers, telling them manual dispatch is needed."

5. Explain periodic escalation:

> "If an incident stays in 'reported' status without acknowledgment, the system escalates automatically — to supervisor after 2 minutes, manager after 5 minutes, director after 10 minutes. A scheduled Cloud Function checks every 2 minutes."

---

## Act 6: Manual Dispatch from Dashboard (1 min)

### Feature: Dispatcher actions

> "The dispatcher can take action directly from the dashboard."

1. On the dashboard incident list, hover over the action buttons — show the tooltips (Acknowledge, Dispatch, Resolve, Escalate)
2. Click **Acknowledge** (check_circle icon) on the un-dispatched incident
3. Click **Dispatch** (truck icon) — the vehicle picker expands showing available vehicles with type icons
4. Select an available vehicle — the incident is now dispatched
5. Show the incident card updates in real-time (status changes, dispatch button becomes disabled)

> "All of this happens in real-time. The field responder assigned to that vehicle would receive a push notification on their mobile device."

---

## Act 7: Mobile-First Field Responder Experience (2 min)

### Feature: Mobile-friendly dashboard for monitoring and action

> "Let's see the responder's perspective."

1. In the **Field App**, go back and select **Field Responder**
2. Select a responder identity (e.g., "Alex Davis" — assigned to ft-001)
3. Show the **Assignments** tab — the dispatched incident appears with severity color, type icon, and description
4. Tap the incident — show the detail view with location coordinates and incident timeline
5. Switch to the **Alerts** tab — show notifications received for this user's role
6. Switch to the **Profile** tab — show the user's name, role, and assigned unit

> "The field app works on iOS, Android, and web from a single React Native codebase. On native devices, responders receive push notifications via Firebase Cloud Messaging."

---

## Act 8: Service Zones and Map Visualization (1 min)

### Feature: Geospatial awareness

1. In the Control Room, click **Service Zones** category — map shows the 4 Pune zone polygons
2. Click a zone polygon — show the popup with name, city, and priority score

> "Service zones define jurisdictional boundaries. The smart dispatch algorithm penalizes cross-boundary dispatch by 5km, encouraging local resource utilization while still allowing cross-zone dispatch when a nearby vehicle in another zone is significantly closer."

3. Switch to **Incidents** on Map view — show all layers: incidents (circles), vehicles (type icons), and zones (polygons) together
4. Click the **Critical** sub-filter — map filters to only critical incidents

> "Dispatchers get full spatial awareness — they can see where incidents are relative to service zones and available resources."

---

## Closing Summary (30 sec)

> "To recap what we've demonstrated:"

| Requirement | Implementation |
|------------|----------------|
| Ingest real-time incident events | Firestore writes + HTTP ingestion endpoint, real-time listeners across all clients |
| Categorize and prioritize by severity | Multi-factor severity scoring (type, casualties, area, hazmat, structural damage) |
| Trigger alerts and escalation rules | Auto-dispatch, time-based escalation, no-resource alerts to supervisor/manager |
| Send live notifications | FCM push to mobile, real-time Firestore updates, role-targeted alerts |
| Mobile-first dashboard | React Native field app (iOS/Android/Web), Angular control room with interactive map |

> "The system uses a dual-database architecture — Firestore for real-time data and PostGIS for geospatial intelligence — connected by Cloud Functions. Everything updates in real-time, scales with Firebase's infrastructure, and gracefully degrades if any component is unavailable."
