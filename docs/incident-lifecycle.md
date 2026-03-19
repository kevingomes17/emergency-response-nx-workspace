# Incident Lifecycle — Sequence Diagrams

## 1. Incident Creation (Field App — Public User)

```mermaid
sequenceDiagram
    actor Public as Public User
    participant FA as Field App
    participant FS as Firestore
    participant CF as Cloud Functions
    participant FCM as Firebase Cloud Messaging

    Public->>FA: Fill report form (type, description)
    FA->>FA: Get device location (Geolocation API)
    FA->>FS: Write incident doc<br/>(severity: "medium", status: "reported")

    FS-->>CF: onIncidentCreated trigger
    CF->>CF: evaluateEscalation(incident, rules)
    CF->>CF: Determine actions based on severity

    alt Severity = critical (auto_dispatch: true)
        CF->>CF: Notify supervisors
        CF->>FS: Create alert doc (target: supervisor)
        CF->>FS: Query available resource by type
        CF->>FS: Batch write:<br/>Resource → dispatched<br/>Incident → dispatched + assigned_units
        FS-->>CF: onDocumentCreated (alert)
        CF->>FCM: Send push to supervisor FCM tokens
    else Severity = high / medium / low
        CF->>CF: Notify dispatchers
        CF->>FS: Create alert doc (target: dispatcher)
        FS-->>CF: onDocumentCreated (alert)
        CF->>FCM: Send push to dispatcher FCM tokens
    end
```

## 2. Incident Creation (HTTP Ingestion Endpoint)

```mermaid
sequenceDiagram
    actor Ext as External System
    participant API as ingestIncident (HTTP)
    participant Sev as scoreSeverity()
    participant FS as Firestore
    participant CF as Cloud Functions

    Ext->>API: POST /ingestIncident<br/>{type, location, description,<br/>casualties, affected_area, ...}
    API->>API: Validate input
    API->>Sev: scoreSeverity({type, casualties,<br/>affectedArea, hazardousMaterials,<br/>structuralDamage})
    Sev-->>API: severity (critical|high|medium|low)
    API->>FS: Write incident doc<br/>(computed severity, status: "reported")
    API-->>Ext: 201 {incident_id, severity, status}

    Note over FS,CF: Same onIncidentCreated flow<br/>as Field App (see Diagram 1)
```

## 3. Manual Resource Assignment (Control Room)

```mermaid
sequenceDiagram
    actor Disp as Dispatcher
    participant CR as Control Room App
    participant IS as IncidentService
    participant FS as Firestore
    participant CF as Cloud Functions

    Disp->>CR: Open incident detail page
    CR->>FS: Subscribe to incident + available resources
    FS-->>CR: Real-time incident data + resource list

    Disp->>CR: Click "Assign" on a resource
    CR->>IS: assignResource(incidentId, unitId)
    IS->>FS: updateDoc(incident):<br/>assigned_units += unitId<br/>status → "dispatched"
    IS->>FS: updateDoc(resource):<br/>status → "dispatched"<br/>assigned_incident → incidentId

    FS-->>CF: onIncidentUpdated trigger
    CF->>CF: Status changed → re-evaluate escalation
    CF->>FS: Create escalation alert (if applicable)

    Note over IS,FS: These are two sequential writes,<br/>NOT an atomic batch
```

## 4. Manual Resource Unassignment (Control Room)

```mermaid
sequenceDiagram
    actor Disp as Dispatcher
    participant CR as Control Room App
    participant IS as IncidentService
    participant FS as Firestore

    Disp->>CR: Click "Unassign" on assigned resource
    CR->>IS: unassignResource(incidentId, unitId, currentUnits)
    IS->>FS: updateDoc(incident):<br/>assigned_units -= unitId
    IS->>FS: updateDoc(resource):<br/>status → "available"<br/>assigned_incident → ""
```

## 5. Incident Status Transitions (Control Room)

```mermaid
sequenceDiagram
    actor Disp as Dispatcher
    participant CR as Control Room App
    participant IS as IncidentService
    participant FS as Firestore
    participant CF as Cloud Functions

    Note over Disp,CF: Acknowledge
    Disp->>CR: Click "Acknowledge"
    CR->>IS: acknowledgeIncident(id)
    IS->>FS: status → "acknowledged"

    Note over Disp,CF: Mark In Progress
    Disp->>CR: Click "In Progress"
    CR->>IS: updateIncidentStatus(id, "in_progress")
    IS->>FS: status → "in_progress"

    Note over Disp,CF: Resolve
    Disp->>CR: Click "Resolve"
    CR->>IS: resolveIncident(id)
    IS->>FS: status → "resolved"<br/>resolved_at → now

    FS-->>CF: onIncidentUpdated trigger (each change)
    CF->>CF: evaluateEscalation → no actions<br/>(resolved/closed incidents are skipped)
```

## 6. Periodic Escalation (Scheduled Cloud Function)

```mermaid
sequenceDiagram
    participant Sched as Cloud Scheduler
    participant CF as periodicEscalation
    participant FS as Firestore
    participant FCM as Firebase Cloud Messaging

    Sched->>CF: Trigger every 2 minutes
    CF->>FS: Query all incidents<br/>where status == "reported"
    FS-->>CF: List of unacknowledged incidents

    loop For each reported incident
        CF->>CF: evaluateEscalation(incident, rules, now)
        CF->>CF: Check minutes since created_at

        alt Escalation threshold exceeded
            CF->>CF: Determine new escalation level + target role
            CF->>FS: Batch: update escalation_level<br/>+ create escalation alert
        end
    end

    CF->>FS: Commit batch

    Note over FS,FCM: Each new alert doc triggers<br/>sendNotification → FCM push
```

## 7. Incident Status State Machine

```mermaid
stateDiagram-v2
    [*] --> reported : Incident created<br/>(Field App or HTTP API)

    reported --> acknowledged : Dispatcher acknowledges
    reported --> dispatched : Resource assigned<br/>(manual or auto-dispatch)

    acknowledged --> dispatched : Resource assigned
    acknowledged --> in_progress : Dispatcher marks in progress

    dispatched --> in_progress : Dispatcher marks in progress
    dispatched --> acknowledged : Resource unassigned<br/>(no units remaining)

    in_progress --> resolved : Dispatcher resolves

    resolved --> closed : Admin closes

    closed --> [*]

    note right of reported
        Escalation runs while
        incident stays in this state.
        Thresholds vary by severity.
    end note
```

## 8. Resource Status State Machine

```mermaid
stateDiagram-v2
    [*] --> available : Resource created

    available --> dispatched : Assigned to incident<br/>(auto-dispatch or manual)
    available --> offline : Taken offline<br/>(Control Room)

    dispatched --> en_route : Status updated<br/>(Control Room)
    dispatched --> available : Unassigned from incident

    en_route --> on_scene : Status updated<br/>(Control Room)
    en_route --> available : Unassigned from incident

    on_scene --> available : Incident resolved /<br/>unassigned
    on_scene --> offline : Taken offline

    offline --> available : Brought back online

    note right of dispatched
        Resource cannot be deleted
        while dispatched, en_route,
        or on_scene.
    end note
```
