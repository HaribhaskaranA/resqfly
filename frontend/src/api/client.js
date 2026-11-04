/**
 * RESQFLY API & WebSocket Telemetry Client
 */

const API_BASE = '/api';

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  return res.json();
}

export async function fetchDisasters() {
  const res = await fetch(`${API_BASE}/disasters`);
  return res.json();
}

export async function fetchDrones() {
  const res = await fetch(`${API_BASE}/drones`);
  return res.json();
}

export async function launchDrone(droneId) {
  const res = await fetch(`${API_BASE}/drones/${droneId}/launch`, { method: 'POST' });
  return res.json();
}

export async function fetchMissions() {
  const res = await fetch(`${API_BASE}/missions`);
  return res.json();
}

export async function assignMission(payload) {
  const res = await fetch(`${API_BASE}/missions/assign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json();
}

export async function fetchShelters() {
  const res = await fetch(`${API_BASE}/shelters`);
  return res.json();
}

export async function verifyShelter(shelterId, payload = {}) {
  const res = await fetch(`${API_BASE}/shelters/${shelterId}/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json();
}

export async function fetchRequests() {
  const res = await fetch(`${API_BASE}/requests`);
  return res.json();
}

export async function fetchInventory() {
  const res = await fetch(`${API_BASE}/requests/inventory`);
  return res.json();
}

export async function createEmergencyRequest(payload) {
  const res = await fetch(`${API_BASE}/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json();
}

export async function fetchAlerts() {
  const res = await fetch(`${API_BASE}/alerts`);
  return res.json();
}

export async function acknowledgeAlert(alertId) {
  const res = await fetch(`${API_BASE}/alerts/${alertId}/acknowledge`, { method: 'POST' });
  return res.json();
}

export async function fetchSimulationState() {
  const res = await fetch(`${API_BASE}/simulation/state`);
  return res.json();
}

export async function setFloodLevel(level) {
  const res = await fetch(`${API_BASE}/simulation/flood-level`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ level })
  });
  return res.json();
}

export async function startSimulation() {
  const res = await fetch(`${API_BASE}/simulation/start`, { method: 'POST' });
  return res.json();
}

export async function pauseSimulation() {
  const res = await fetch(`${API_BASE}/simulation/pause`, { method: 'POST' });
  return res.json();
}

export async function resetSimulation() {
  const res = await fetch(`${API_BASE}/simulation/reset`, { method: 'POST' });
  return res.json();
}

export async function analyzeDetectionFrame(formData) {
  const res = await fetch(`${API_BASE}/detection/analyze`, {
    method: 'POST',
    body: formData
  });
  return res.json();
}

export async function fetchTriageHealth() {
  const res = await fetch(`${API_BASE}/detection/health`);
  return res.json();
}

export async function processMultimodalTriage(formData) {
  const res = await fetch(`${API_BASE}/detection/multimodal-triage`, {
    method: 'POST',
    body: formData
  });
  return res.json();
}

export async function fetchPatrolStream(step = 0) {
  const res = await fetch(`${API_BASE}/detection/patrol-stream?step=${step}`);
  return res.json();
}

export async function fetchObservations() {
  const res = await fetch(`${API_BASE}/detection/observations`);
  return res.json();
}

export async function verifyObservation(obsId, payload) {
  const res = await fetch(`${API_BASE}/detection/observations/${obsId}/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json();
}

export async function fetchAnalytics() {
  const res = await fetch(`${API_BASE}/analytics`);
  return res.json();
}

export async function fetchCloudStatus() {
  const res = await fetch(`${API_BASE}/cloud/status`);
  return res.json();
}

export async function fetchIncidentBrief(prompt) {
  const res = await fetch(`${API_BASE}/ai/incident-brief`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  });
  return res.json();
}

// ─── Auth API ─────────────────────────────────────────────────────────────────

export async function authRegister(payload) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json();
}

export async function authVerifyOTP(govId, otpCode) {
  const res = await fetch(`${API_BASE}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ gov_id: govId, otp_code: otpCode })
  });
  return res.json();
}

export async function authLogin(govId, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ gov_id: govId, password })
  });
  return res.json();
}

export async function authMe(token) {
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return res.json();
}

export async function authLogout(token) {
  const res = await fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return res.json();
}

// ─── Mission History & Auto Dispatch ─────────────────────────────────────────

export async function fetchMissionHistory() {
  const res = await fetch(`${API_BASE}/detection/mission-history`);
  return res.json();
}

export async function updateMissionHistoryStatus(missionId, status, notes = '') {
  const res = await fetch(`${API_BASE}/detection/mission-history/${missionId}/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, notes })
  });
  return res.json();
}

export async function dispatchRescueMission(payload) {
  const res = await fetch(`${API_BASE}/missions/dispatch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json();
}

export async function patrolDispatch(payload) {
  const res = await fetch(`${API_BASE}/detection/patrol-dispatch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json();
}

// WebSocket telemetry connection with listeners
class TelemetrySocket {
  constructor() {
    this.ws = null;
    this.listeners = new Set();
    this.isConnected = false;
  }

  connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/telemetry`;

    try {
      this.ws = new WebSocket(wsUrl);
      this.ws.onopen = () => {
        this.isConnected = true;
      };
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.listeners.forEach((cb) => cb(data));
        } catch (e) {
          console.error('WS parse error:', e);
        }
      };
      this.ws.onclose = () => {
        this.isConnected = false;
        setTimeout(() => this.connect(), 3000); // Reconnect
      };
      this.ws.onerror = () => {
        this.isConnected = false;
      };
    } catch (e) {
      console.warn('WebSocket connection not ready, will retry.');
    }
  }

  subscribe(callback) {
    this.listeners.add(callback);
    if (!this.isConnected && (!this.ws || this.ws.readyState === WebSocket.CLOSED)) {
      this.connect();
    }
    return () => this.listeners.delete(callback);
  }
}

export const telemetryClient = new TelemetrySocket();
