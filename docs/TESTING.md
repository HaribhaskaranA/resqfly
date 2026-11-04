# Testing Guide & Verification — RESQFLY

This document describes the automated test suite, verification procedures, and repeatable judge demonstration scenario.

---

## 1. Automated Test Suite

RESQFLY includes automated tests covering all critical simulation, pathfinding, and decision engines:

### Run Backend Unit Tests
```powershell
python "C:\Users\HARIBHASKARAN A\.gemini\antigravity\scratch\resqfly\tests\test_backend.py"
```

### Coverage Checklist
- [x] **API Health & Adapter**: Verifies local mode fallback and dual-mode state reporting.
- [x] **Drone Fleet Retrieval**: Validates all 4 specialized virtual drones (Scout, Guardian, Lifeline, Relay).
- [x] **Shelter Risk Calculation**: Validates Low (dry) vs Critical (>80/100) scoring when flood breaches foundation and roads submerge.
- [x] **Emergency Priority Engine**: Validates 0-100 explainable priority formula with medical and vulnerable person weights.
- [x] **Intelligent Mission Assignment**: Verifies suitability index formula $S = 0.35P + 0.25L + 0.20D + 0.20C$ selecting Lifeline for cargo drops.
- [x] **Payload Constraint Rejection**: Verifies rejection when cargo exceeds drone maximum payload.
- [x] **Low-Battery Rejection**: Verifies rejection when projected battery after roundtrip falls below 20% safe buffer.
- [x] **Dynamic Flood Submersion**: Tests flood elevation updates and building inundation counts.
- [x] **Mission Tick & Delivery Completion**: Validates autonomous flight progression, waypoint tracking, and cargo delivery.

---

## 2. API Endpoints Verification

Verify all REST endpoints via PowerShell:

```powershell
# 1. Health check
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/health"

# 2. Multi-drone fleet
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/drones"

# 3. Shelter risk assessment
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/shelters"

# 4. Emergency relief requests
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/requests"

# 5. Computer Vision inference (OpenCV / YOLO)
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/detection/analyze" -Method Post
```

---

## 3. Repeatable Judge Demonstration Walkthrough

Click the **"Judge Demo Walkthrough"** button at the top of the sidebar in the UI to run the 9-step scenario:

1. **Step 1: Initiate Flood Surge** — Set flood water to 2.80m; observe low-lying village roads submerging.
2. **Step 2: Launch SCOUT Drone** — SCOUT-ALPHA executes aerial scan of Zone 3 and confirms 25 stranded residents.
3. **Step 3: Launch GUARDIAN Shelter Assessment** — GUARDIAN-BRAVO inspects North Haven School; risk score surges to 82/100 (Critical alert).
4. **Step 4: Inspect Relief Shortage** — View shortage in water and first-aid kits across West Pier.
5. **Step 5: Run Intelligent Mission Assignment** — The algorithm evaluates candidate drones and selects LIFELINE-CHARLIE ($S=89.0/100$), documenting why Scout & Relay were rejected due to payload capacity.
6. **Step 6: Deliver Supplies in 3D Village** — Watch LIFELINE-CHARLIE fly across the flooded village, deliver supplies to the rooftop, and return.
7. **Step 7: Deploy RELAY Route Monitoring** — RELAY-DELTA maps a dry evacuation corridor to Regional Hospital.
8. **Step 8: Rescue Coordinator Verification** — Human coordinator verifies the shelter alert and authorizes high-ground transfer.
9. **Step 9: Analytics & Telemetry Review** — Review fleet utilization charts, battery curves, and AWS CloudWatch event streams.
