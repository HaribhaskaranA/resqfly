import React, { useState, useEffect, useCallback } from 'react';
import Navigation from './components/Navigation';
import Header from './components/Header';
import DemoControlModal from './components/DemoControlModal';

// Auth Screens
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import FieldRescueScreen from './screens/FieldRescueScreen';

// Command Center Screens
import DashboardScreen from './screens/DashboardScreen';
import TerrainMapScreen from './screens/TerrainMapScreen';
import SimulatorScreen from './screens/SimulatorScreen';
import FleetScreen from './screens/FleetScreen';
import DetectionScreen from './screens/DetectionScreen';
import SheltersScreen from './screens/SheltersScreen';
import ReliefScreen from './screens/ReliefScreen';
import RescueScreen from './screens/RescueScreen';
import AnalyticsScreen from './screens/AnalyticsScreen';

import {
  fetchSimulationState,
  fetchDrones,
  fetchShelters,
  fetchRequests,
  fetchInventory,
  fetchAlerts,
  fetchMissions,
  fetchDisasters,
  fetchCloudStatus,
  fetchObservations,
  acknowledgeAlert,
  authLogout,
  telemetryClient
} from './api/client';

// ─── Auth persistence helpers ─────────────────────────────────────────────────
function loadSession() {
  try {
    const raw = localStorage.getItem('resqfly_session');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function saveSession(user) {
  if (user) localStorage.setItem('resqfly_session', JSON.stringify(user));
  else localStorage.removeItem('resqfly_session');
}

export default function App() {
  // Auth state
  const [currentUser, setCurrentUser] = useState(null); // null = logged out
  const [authView, setAuthView] = useState('login');     // 'login' | 'register'
  const [sessionLoaded, setSessionLoaded] = useState(false);

  // App state
  const [activeScreen, setActiveScreen] = useState('dashboard');
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [navCollapsed, setNavCollapsed] = useState(false);

  // Core Data States
  const [simData, setSimData] = useState(null);
  const [drones, setDrones] = useState([]);
  const [shelters, setShelters] = useState([]);
  const [requests, setRequests] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [missions, setMissions] = useState([]);
  const [disasters, setDisasters] = useState([]);
  const [cloudStatus, setCloudStatus] = useState(null);
  const [observations, setObservations] = useState([]);

  // ─── Enforce strict Auth Gate on mount: always greet user with Login Page ──
  useEffect(() => {
    // Strictly require credentials on platform open - unauthenticated visitors see Login
    saveSession(null);
    setCurrentUser(null);
    setAuthView('login');
    setSessionLoaded(true);
  }, []);

  // ─── Login handler ────────────────────────────────────────────────────────
  const handleLogin = (userInfo) => {
    setCurrentUser(userInfo);
    saveSession(userInfo);
    // Redirect to field rescue screen for field personnel
    if (userInfo.role === 'field_rescue') {
      setActiveScreen('dashboard'); // FieldRescueScreen handles its own layout
    } else {
      setActiveScreen('dashboard');
    }
  };

  // ─── Logout handler ───────────────────────────────────────────────────────
  const handleLogout = async () => {
    if (currentUser?.token) {
      try { await authLogout(currentUser.token); } catch (e) {}
    }
    saveSession(null);
    setCurrentUser(null);
    setAuthView('login');
  };

  // ─── Backend data fetch (command center only) ──────────────────────────────
  const refreshFullState = useCallback(async () => {
    try {
      const [simRes, droneRes, shelterRes, reqRes, invRes, alertRes, msnRes, disasterRes, cloudRes, obsRes] = await Promise.all([
        fetchSimulationState(), fetchDrones(), fetchShelters(), fetchRequests(),
        fetchInventory(), fetchAlerts(), fetchMissions(), fetchDisasters(),
        fetchCloudStatus(), fetchObservations()
      ]);
      setSimData(simRes);
      setDrones(droneRes || []);
      setShelters(shelterRes || []);
      setRequests(reqRes || []);
      setInventory(invRes || []);
      setAlerts(alertRes || []);
      setMissions(msnRes || []);
      setDisasters(disasterRes || []);
      setCloudStatus(cloudRes || null);
      setObservations(obsRes || []);
    } catch (e) {
      console.warn('Backend sync note:', e);
    }
  }, []);

  useEffect(() => {
    if (currentUser?.role === 'command_center') {
      refreshFullState();
      const interval = setInterval(refreshFullState, 2500);
      return () => clearInterval(interval);
    }
  }, [refreshFullState, currentUser]);

  // ─── WebSocket Telemetry ──────────────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = telemetryClient.subscribe((payload) => {
      if (payload.drones) setDrones(payload.drones);
      if (payload.flood_water_level !== undefined && simData) {
        setSimData(prev => prev ? {
          ...prev,
          simulation: { ...prev.simulation, flood_water_level: payload.flood_water_level }
        } : prev);
      }
    });
    return unsubscribe;
  }, [simData]);

  const handleAcknowledgeAlert = async (alertId) => {
    await acknowledgeAlert(alertId);
    refreshFullState();
  };

  // ─── Loading / session restore guard ─────────────────────────────────────
  if (!sessionLoaded) return null;

  // ─── Auth Gate: show login/register if no user ────────────────────────────
  if (!currentUser) {
    if (authView === 'register') {
      return <RegisterScreen onSwitchToLogin={() => setAuthView('login')} />;
    }
    return (
      <LoginScreen
        onLogin={handleLogin}
        onSwitchToRegister={() => setAuthView('register')}
      />
    );
  }

  // ─── Field Rescue Role: standalone dashboard ──────────────────────────────
  const isFieldRescue = ['field_rescue', 'rescue_team', 'field_responder'].includes((currentUser.role || '').toLowerCase());
  if (isFieldRescue) {
    return (
      <FieldRescueScreen
        currentUser={currentUser}
        onLogout={handleLogout}
      />
    );
  }

  // ─── Command Center Role: full app layout ─────────────────────────────────
  return (
    <div className="flex h-screen bg-[#0B1220] text-slate-100 overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <Navigation
        activeScreen={activeScreen}
        setActiveScreen={setActiveScreen}
        cloudStatus={cloudStatus}
        onOpenDemoGuide={() => setIsDemoModalOpen(true)}
        collapsed={navCollapsed}
        setCollapsed={setNavCollapsed}
      />

      {/* Main Body */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header
          disaster={disasters[0]}
          simState={simData?.simulation}
          alerts={alerts}
          userRole={currentUser}
          onLogout={handleLogout}
          onOpenAlerts={() => setActiveScreen('rescue')}
          onAcknowledgeAlert={handleAcknowledgeAlert}
        />

        {/* Active Screen Viewport */}
        <main className="flex-1 overflow-hidden relative bg-[#0B1220]">
          {activeScreen === 'dashboard' && (
            <DashboardScreen
              disaster={disasters[0]}
              simState={simData?.simulation}
              drones={drones}
              shelters={shelters}
              requests={requests}
              alerts={alerts}
              missions={missions}
              peopleClusters={simData?.people_clusters || []}
              onNavigate={setActiveScreen}
              onOpenDemoGuide={() => setIsDemoModalOpen(true)}
              onAcknowledgeAlert={handleAcknowledgeAlert}
            />
          )}

          {activeScreen === 'terrain' && (
            <TerrainMapScreen
              drones={drones}
              shelters={shelters}
              simState={simData?.simulation}
              onStateRefresh={refreshFullState}
            />
          )}

          {activeScreen === 'simulator' && (
            <SimulatorScreen
              simState={simData?.simulation ? { ...simData.simulation, buildings: simData.buildings } : null}
              drones={drones}
              shelters={shelters}
              requests={requests}
              peopleClusters={simData?.people_clusters || []}
              missions={missions}
              onStateRefresh={refreshFullState}
            />
          )}

          {activeScreen === 'fleet' && (
            <FleetScreen drones={drones} missions={missions} onStateRefresh={refreshFullState} />
          )}

          {activeScreen === 'detection' && (
            <DetectionScreen observations={observations} onStateRefresh={refreshFullState} />
          )}

          {activeScreen === 'shelters' && (
            <SheltersScreen shelters={shelters} simState={simData?.simulation} onStateRefresh={refreshFullState} />
          )}

          {activeScreen === 'relief' && (
            <ReliefScreen requests={requests} inventory={inventory} onStateRefresh={refreshFullState} onNavigate={setActiveScreen} />
          )}

          {activeScreen === 'rescue' && (
            <RescueScreen shelters={shelters} alerts={alerts} onStateRefresh={refreshFullState} onNavigate={setActiveScreen} />
          )}

          {activeScreen === 'analytics' && (
            <AnalyticsScreen simState={simData?.simulation} drones={drones} cloudStatus={cloudStatus} />
          )}
        </main>
      </div>

      {/* Demo Walkthrough Modal */}
      <DemoControlModal
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
        onNavigate={setActiveScreen}
        onStateRefresh={refreshFullState}
      />
    </div>
  );
}
