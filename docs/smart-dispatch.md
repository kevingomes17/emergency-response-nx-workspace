# Smart Dispatch — Supabase/PostGIS Calculation

## Overview

Smart Dispatch replaces the naive "first available" resource selection with proximity-based dispatch using PostGIS geospatial queries. Supabase acts as the geospatial computation engine while Firestore remains the real-time source of truth.

## Architecture

```
Incident Created (Firestore)
        │
        ▼
Cloud Function (onIncidentCreated)
        │
        ├──► Supabase RPC: calculate_dispatch()
        │         │
        │         ├── Find incident's service zone (ST_Intersects)
        │         ├── Calculate distance to each available vehicle (ST_Distance)
        │         ├── Apply boundary-crossing penalty
        │         └── Return ranked candidates
        │
        ├──► Verify top candidate in Firestore (still available?)
        │
        └──► Dispatch: update Firestore (Resource → dispatched, Incident → assigned)
```

## The `calculate_dispatch` SQL Function

**Location:** `supabase/migrations/002_create_dispatch_function.sql`

**Signature:**
```sql
calculate_dispatch(
  inc_lat FLOAT,          -- Incident latitude
  inc_lng FLOAT,          -- Incident longitude
  resource_type TEXT,     -- e.g. 'fire_truck', 'ambulance'
  penalty_meters FLOAT    -- Default: 5000 (5km)
)
RETURNS TABLE (vehicle_id TEXT, distance_meters FLOAT, weighted_cost FLOAT)
```

### Step-by-step Calculation

1. **Create incident point** — Convert lat/lng to a PostGIS geography point:
   ```sql
   ST_SetSRID(ST_MakePoint(inc_lng, inc_lat), 4326)::geography
   ```

2. **Find incident zone** — Determine which service zone (if any) contains the incident:
   ```sql
   SELECT id FROM service_zones WHERE ST_Intersects(boundary, incident_point)
   ```

3. **Filter vehicles** — Only consider vehicles where:
   - `status = 'available'`
   - `type = resource_type` (e.g. fire → fire_truck, medical → ambulance)

4. **Calculate distance** — Straight-line geographic distance in meters:
   ```sql
   ST_Distance(vehicle.location, incident_point)
   ```

5. **Apply boundary penalty** — Add `penalty_meters` (default 5km) if the vehicle is in a different zone than the incident:
   ```
   weighted_cost = distance_meters + penalty (if cross-boundary)
   weighted_cost = distance_meters           (if same zone or no zone)
   ```

6. **Rank and return** — Sort all candidates by `weighted_cost ASC` (nearest/cheapest first).

### Penalty Logic

| Scenario | Penalty |
|----------|---------|
| Incident has no zone (outside all boundaries) | 0 |
| Vehicle is in the **same** zone as the incident | 0 |
| Vehicle is in a **different** zone | +5000m (configurable) |

This encourages dispatching local vehicles while still allowing cross-boundary dispatch when a nearby vehicle in another zone is significantly closer.

### Example

```
Incident: fire at (41.882, -87.623) → The Loop, Chicago
Available fire trucks:
  ft-001: 800m away, in The Loop       → cost = 800
  ft-002: 600m away, in Lincoln Park   → cost = 600 + 5000 = 5600

Result: ft-001 dispatched (lower weighted cost despite being farther)
```

## Fallback Behavior

If the Supabase RPC call fails (network error, Supabase downtime), the system falls back to **naive dispatch** — picks the first available resource of matching type from Firestore with no proximity logic. This ensures incidents are never left unassigned due to infrastructure issues.

**Code:** `apps/cloud-functions/src/triggers.ts` — `autoDispatch()` → `naiveDispatch()`

## Vehicle Location Sync

Vehicle locations are synced from Firestore to Supabase whenever the `ingestResource` HTTP endpoint is called:

```
Field App (GPS update) → ingestResource (Cloud Function)
    ├── Write to Firestore (source of truth)
    └── Upsert to Supabase vehicles table (for geospatial queries)
```

The Supabase sync is non-blocking — if it fails, the Firestore write still succeeds.

**Code:** `apps/cloud-functions/src/ingestion.ts`

## Service Zones

Service zones are geographic boundaries (MULTIPOLYGON) stored in Supabase with a city and priority score. They are managed via the **Settings → Service Zones** tab in the control-room app.

**Schema:**
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Auto-generated |
| `name` | TEXT | Zone name (e.g. "The Loop") |
| `city` | TEXT | City (e.g. "Chicago") |
| `priority_score` | INT (1-5) | Risk level |
| `boundary` | GEOGRAPHY(MULTIPOLYGON) | Geographic boundary |

Vehicles are **not** assigned to zones. Zone membership is computed dynamically at dispatch time using `ST_Intersects`.

## Resource Type Mapping

The dispatch function filters by vehicle type based on the incident:

| Incident Type | Vehicle Type |
|---------------|-------------|
| `fire` | `fire_truck` |
| `medical` | `ambulance` |
| `security` | `police` |
| `water_leakage` | `maintenance` |
| `power_failure` | `electrician` |

**Defined in:** `libs/shared/data-models/src/lib/data-models.ts` — `INCIDENT_RESOURCE_MAP`
