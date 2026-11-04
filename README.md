# 🎃 RESQFLY — Intelligent Multi-Drone Disaster Rescue & Relief System

> **Tagline:** *"Every Location Matters. Every Life Matters."*  
> **Theme:** Halloween Night Rescue  
> **Scenario:** Severe coastal storm surge and flooding during a fictional Halloween-night gale in North Haven coastal village.

---

## 🚁 Project Overview

**RESQFLY** is a full-stack, cloud-architected disaster rescue and humanitarian relief platform. It coordinates a fleet of four specialized autonomous virtual drones to locate stranded people in flood zones, evaluate building and shelter vulnerability, optimize emergency supply drops, and support human rescue coordinators through transparent, explainable decision-support algorithms.

The application blends a cinematic, professional **Halloween operations center aesthetic** (midnight navy, charcoal, pumpkin orange, glowing cyan navigation lights, and atmospheric mist) with disaster response engineering.

---

## 🌟 Key Features

1. **Interactive 3D Coastal Flood Simulation (Three.js & React Three Fiber)**:
   - 40 3D village structures including houses, North Haven Community School, Saint Jude Coastal Chapel, Harborview Regional Emergency Hospital, and Coastal Outpost Base.
   - Dynamic, undulating floodwater surface with interactive elevation slider (0.0m – 6.0m).
   - Inundation calculations identifying submerged roads and isolated rooftops in real time.
   - Click-to-inspect 3D buildings and drones with live telemetry sidebars.

2. **Specialized Multi-Drone Fleet**:
   - **DRONE 01 — SCOUT (Search & Recon)**: Aerial FLIR/optical scanning, crowd size estimation.
   - **DRONE 02 — GUARDIAN (Shelter Monitoring)**: Altimetry, flood surge trend tracking, building vulnerability indicators.
   - **DRONE 03 — LIFELINE (Emergency Relief Delivery)**: 15kg heavy-lift winch for water canisters, rations, and trauma packs.
   - **DRONE 04 — RELAY (Communications & Route Mapping)**: High-altitude mesh repeater mapping safe ground evacuation corridors.

3. **Intelligent Mission Assignment Engine**:
   - Evaluates multi-criteria suitability formula:
     $$\mathbf{S = 0.35P + 0.25L + 0.20D + 0.20C}$$
     - $P$ = Battery suitability (accounting for roundtrip flight + 20% mandatory reserve)
     - $L$ = Payload capacity suitability vs cargo requirements
     - $D$ = Proximity distance suitability
     - $C$ = Capability suitability matching drone specialty
   - Strict hard constraints: Rejects low-battery or overburdened drones with full explainability.
   - Generates collision-free 3D waypoints using A* pathfinding.

4. **Transparent Shelter Risk Assessment Engine**:
   - Computes an explainable 0–100 advisory risk score based on:
     - Foundation elevation vs local floodwater depth
     - Flood surge trend (rising penalty)
     - Isolation penalty from submerged road access
     - Overcrowding vs rated shelter capacity
     - Food, drinking water, and medicine reserves
     - Reported structural integrity issues
   - Categorized into Low (0–29), Moderate (30–59), High (60–79), and Critical (80–100).
   - Prominent advisory disclaimer: Decision-support tool, not a structural safety certification.

5. **AI Human Detection Center (OpenCV & YOLO)**:
   - Computer vision inference pipeline identifying person silhouettes from aerial drone footage.
   - Tactical bounding boxes, confidence tags, and estimated group sizes.
   - Human coordinator verification controls (Approve vs Reject False Positive).
   - Clearly distinguishes sample video AI inferences from synthetic 3D simulation detections.

6. **AWS Cloud Integration & Dual-Mode Adapter**:
   - **AWS IoT Core**: Documented MQTT taxonomy (`resqfly/drone/{drone_id}/telemetry` and `resqfly/drone/{drone_id}/command`).
   - **Amazon DynamoDB**: Persistence for drones, missions, shelters, requests, and alerts.
   - **AWS Lambda**: Serverless event handlers for telemetry, mission dispatch, and alert notifications.
   - **Amazon S3**: Secure evidence artifact storage.
   - **Amazon Cognito**: Role-based access control.
   - **Amazon CloudWatch**: Operational fleet metrics and logging.
   - **Dual-Mode Adapter**: Runs seamlessly in Local Simulation Mode without cloud credentials, or in AWS-Connected Mode when credentials are provided. Never displays fake cloud status.

---

## 🖥️ The 9 Required Application Screens

| Screen | Name | Description |
|---|---|---|
| **Screen 1** | **Login & Portal** | Role-based authentication (Rescue Coordinator, Operations Admin, Field Viewer) and 1-Click Instant Demo Launch. |
| **Screen 2** | **Command Dashboard** | Active disaster KPIs, 3D village preview, fleet status, and critical alerts ticker. |
| **Screen 3** | **3D Disaster Simulator** | Full-screen interactive 3D coastal village, rising floodwater controls, drone trails, and building inspection. |
| **Screen 4** | **Fleet Management** | 4 drone telemetry cards, live battery gauges, speed, altitude, payload, and raw AWS IoT MQTT payload inspector. |
| **Screen 5** | **Human Detection Center** | Aerial video/image inference via OpenCV/YOLO, bounding box canvas, confidence scores, and verification actions. |
| **Screen 6** | **Shelter Safety Center** | Shelter vulnerability list, 0–100 risk meters, 6 contributing factor breakdown, and evacuation review. |
| **Screen 7** | **Relief Management** | Emergency SOS requests, supply inventory tracking (water, rations, first-aid, sat-beacons), and intelligent mission assignment. |
| **Screen 8** | **Rescue Coordination** | High-ground designated shelter diversion plans (School to Hospital), rescue boat dispatch, and alert approvals. |
| **Screen 9** | **Mission Analytics** | Recharts visual graphs, flood risk curves, fleet battery usage, and AWS CloudWatch structured event logs. |

---

## ⚡ Quick Start (Single Command)

### Run Unified Server
```powershell
# Navigate to project directory
cd "C:\Users\HARIBHASKARAN A\.gemini\antigravity\scratch\resqfly"

# Launch the unified server
python run_resqfly.py
```

Open your browser to:
👉 **`http://localhost:8000`**

- **Frontend App**: `http://localhost:8000/`
- **REST APIs**: `http://localhost:8000/api/*`
- **Swagger Documentation**: `http://localhost:8000/docs`
- **WebSocket Telemetry**: `ws://localhost:8000/ws/telemetry`

---

## 🧪 Automated Testing

Run the automated test suite covering all core engines:
```powershell
python "C:\Users\HARIBHASKARAN A\.gemini\antigravity\scratch\resqfly\tests\test_backend.py"
```

All 9 test suites verify:
- API health & Local Cloud Adapter
- Drone retrieval
- Shelter risk calculation (Low vs Critical)
- Emergency priority calculation
- Intelligent mission assignment (Lifeline selected for cargo)
- Payload constraint rejection
- Low-battery reserve constraint rejection
- Dynamic flood elevation updates
- Autonomous mission progression and delivery completion

---

## 🎬 Repeatable Judge Demonstration Scenario

Click the **"Judge Demo Walkthrough"** button at the top of the sidebar to execute the 9-step scenario:

1. **Step 1: Initiate Flood Surge** — Water level surges to 2.80m; low-lying village roads become submerged.
2. **Step 2: Launch SCOUT Drone** — SCOUT-ALPHA executes aerial scan of Zone 3 and confirms 25 stranded residents.
3. **Step 3: Launch GUARDIAN Shelter Assessment** — GUARDIAN-BRAVO evaluates North Haven Community School; risk score spikes to 82/100 (Critical Alert).
4. **Step 4: Inspect Relief Shortage** — View shortage in water and trauma kits for isolated residents.
5. **Step 5: Run Intelligent Mission Assignment** — Evaluates suitability index $S = 0.35P + 0.25L + 0.20D + 0.20C$; selects LIFELINE-CHARLIE and explains why Scout & Relay were rejected.
6. **Step 6: Deliver Supplies in 3D Village** — Watch LIFELINE-CHARLIE fly across the 3D village, deliver cargo to the rooftop, and return to base.
7. **Step 7: Deploy RELAY Route Monitoring** — RELAY-DELTA maps a dry evacuation corridor to Regional Hospital.
8. **Step 8: Rescue Coordinator Verification** — Human coordinator verifies the shelter alert and authorizes high-ground transfer.
9. **Step 9: Analytics & Telemetry Review** — Review fleet utilization charts, battery curves, and AWS CloudWatch event streams.

---

## 📁 Repository Directory Structure

```
resqfly/
├── frontend/                     # React + Vite + Tailwind + Three.js application
│   ├── src/
│   │   ├── api/                  # REST & WebSocket telemetry client
│   │   ├── components/           # FloodScene3D, Navigation, Header, DemoControlModal
│   │   ├── screens/              # 9 Full Application Screens
│   │   ├── App.jsx               # Main application container
│   │   └── main.jsx
│   ├── dist/                     # Optimized production bundle
│   └── vite.config.js
├── backend/                      # FastAPI Operational Core
│   ├── app/
│   │   ├── main.py               # FastAPI entry point, CORS, WebSockets, Static mounting
│   │   ├── models/               # Pydantic schemas (drone, mission, shelter, request, alert)
│   │   ├── core/                 # AI & algorithmic engines (A*, shelter, priority, mission, detection, state)
│   │   ├── aws/                  # AWS Client Adapter (Dual Mode: Local vs Real AWS)
│   │   └── routers/              # REST API endpoints
│   └── requirements.txt
├── aws/                          # AWS Cloud Infrastructure
│   ├── lambda/                   # Python Lambda function handlers
│   └── template.yaml             # CloudFormation / SAM serverless template
├── tests/                        # Automated unit tests
│   └── test_backend.py
├── docs/                         # Detailed documentation
│   ├── AWS_SETUP.md              # Cloud setup & IAM guidance
│   ├── DEPLOYMENT.md             # Container & production deployment
│   └── TESTING.md                # Test execution & scenarios
├── .env.example                  # Environment configuration template
├── run_resqfly.py                # Unified launcher script
└── README.md
```

---

## 🔒 Security & Safety Principles

- Credentials are never hardcoded or exposed to frontend JavaScript.
- All AWS interactions use least-privilege IAM roles and environment variables.
- AI detection results and simulation risk scores are explicitly marked as **advisory decision-support tools** requiring authorized human coordinator validation.
