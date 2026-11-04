# RESQFLY — Operational Guidance Manual & Safety Architecture

## 1. Executive Overview
**RESQFLY** is an autonomous multi-drone disaster rescue, flood altimetry, and human detection platform developed for rapid coastal inundation and extreme weather response (North Haven coastal flood scenario).

---

## 2. Platform Authentication & Security Controls

### Mandatory Auth Gate
- **Initial Landing Route**: Opening the website (`/` or `http://localhost:8000`) strictly routes unauthenticated visitors to the **Login / Register Page**.
- **Role-Based Access Control (RBAC)**:
  - **Disaster Operations Coordinator** (`COORDINATOR` / `command_center`): ID prefix `GOV-DM-XXX`. Access to full 9-panel Command Operations Dashboard, 3D Simulator, and multi-drone fleet telemetry.
  - **Tactical Field Responder** (`RESCUE_TEAM` / `field_rescue`): ID prefix `FR-XXX`. Access to dedicated Field Rescue Portal with mobile dispatch feeds, GPS navigation routing, and on-scene casualty evacuation confirmation.
- **Dedicated AWS Cloud User Database**:
  - Table: `resqfly_users` in AWS DynamoDB (`ap-southeast-2`).
  - Partition Key: `government_id` (String).
  - SHA-256 hashed password verification and OTP 5-minute timed verification lifecycle.

### Pre-Configured Official Demo Credentials
| Role | Government ID | Password | Portal View |
| :--- | :--- | :--- | :--- |
| **Command Coordinator** | `GOV-DM-001` | `Demo@1234` | Full Command Center |
| **Field Rescue Team** | `FR-001` | `Field@1234` | Tactical Field Portal |

---

## 3. Human Detection AI & Triage Center: Operational Guidance

### A. Manual AI Mode
Use this mode when operating as a human incident coordinator or when inspecting custom drone imagery:
1. **Upload Aerial Imagery**:
   - Navigate to the **Human Detection AI** tab.
   - Click `Upload RGB` to select high-resolution optical drone frames, webcam snapshots, or aerial photographs.
   - Click `Upload FLIR` to provide corresponding long-wave infrared (LWIR) thermal heatmaps.
2. **Execute Inference**:
   - Click `Run Triage` or select one of the calibrated scenarios (`Critical (3.8m Flood)`, `Safe Ridge (0.6m Flood)`, or `Clear (0m Depth)`).
   - The custom-trained YOLO aerial model (`resqfly_aerial_best.pt`, 5.4MB) executes person signature detection, computes aspect ratios, localizes coordinates, and estimates localized flood depths against physical landmark reference baselines.
3. **Coordinator Approval Protocol**:
   - In **Manual Approval** mode, automated dispatch triggers (`DISPATCH_RESCUE_BOAT` or `DISPATCH_LIFELINE_DRONE`) remain pending.
   - The coordinator reviews victim bounding boxes, flood submersion percentages, and tactical justifications before clicking **Authorize & Deploy Mission**.

### B. How to Switch to Autonomous Mode
To enable self-orchestrating drone reconnaissance:
1. Locate the **AUTONOMOUS PATROL FEED** switch at the top of the AI Detection Center and toggle it to **`ON`** (active pulsing radar indicator).
2. Set the **Execution Mode Switcher** below the viewports to **`AUTONOMOUS (AUTO-DISPATCH)`**.
3. **Autonomous Cycle**:
   - The scout drone (`Drone Alpha • SCOUT-ALPHA`) cycles through coastal sectors every 3.0 seconds.
   - When confirmed victim signatures or critical flood depths (&gt;3.0m) are detected, missions are automatically dispatched to `resqfly_missions` and published to AWS IoT Core MQTT topic `resqfly/alerts/emergency` without waiting for manual confirmation.

### C. Demo Data Calibration Notice
> **DEMO DATA ENGINE**: Autonomous Patrol Mode currently operates on **realistic calibrated demo scenario feeds** (simulating North Haven coastal bridge, rooftop stranded party, submerged school access, and open waters). This ensures seamless, reproducible, zero-downtime evaluation during demonstrations without requiring active hardware drone camera uplinks in flight.

---

## 4. Standardized Tactical Units & Callsigns

| Tactical Unit | Asset | Team Leader Callsign | Target Sector & GPS Coordinates |
| :--- | :--- | :--- | :--- |
| **RESCUE UNIT-01 [ALPHA WATERCRAFT SQUAD]** | Inshore Rescue Craft (IRC) | `TIDE-LEAD` (Capt. Vance) | Sector 1: Coastal Canal Bridge (`41.3850° N, -70.5280° W`) |
| **RESCUE UNIT-02 [BRAVO AMPHIBIOUS TEAM]** | 6x6 Amphibious Vehicle | `AMPHI-ONE` (Lt. Hayes) | Sector 2: Low-Lying Marsh & School Access (`41.3835° N, -70.5295° W`) |
| **AIR-SUPPORT [LIFELINE-CHARLIE]** | Heavy-Lift Cargo Drone | `AIR-DROP-CHG` (FO Chen) | Sector 3: Isolated Rooftops & Pier #14 (`41.3862° N, -70.5270° W`) |

---

## 5. AWS Cloud Integration Architecture

- **AWS Region**: Strictly configured to **`ap-southeast-2` (Sydney)**.
- **Amazon DynamoDB**:
  - `resqfly_missions`: Mission IDs, sectors, Decimal flood depths, victim counts, coordinates.
  - `resqfly_telemetry`: Real-time streaming drone telemetry packets (latitude, longitude, altitude, speed, battery, status).
  - `resqfly_users`: Government ID credentials, roles, password hashes, and verification timestamps.
- **AWS IoT Core (MQTT)**:
  - Telemetry Topics: `resqfly/telemetry/scout-alpha`, `resqfly/telemetry/lifeline-charlie`, `resqfly/telemetry/{drone_id}`.
  - Emergency Alerts: `resqfly/alerts/emergency`.
  - Quality of Service: QoS 1 over TLS.
- **Endpoint Health**: Available at `GET /api/aws/status`.
