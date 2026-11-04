import React, { useState, useEffect } from 'react';
import {
  Radio, Compass, Waves, Shield, AlertTriangle, CheckCircle2,
  MapPin, Clock, Users, Zap, Navigation, Activity, LogOut,
  ExternalLink, LifeBuoy, Anchor, Send
} from 'lucide-react';
import { fetchMissionHistory, updateMissionHistoryStatus, dispatchRescueMission } from '../api/client';

const STATUS_COLORS = {
  dispatched:   { bg: 'bg-[#35D6F2]/10', text: 'text-[#35D6F2]', border: 'border-[#35D6F2]/30', dot: 'bg-[#35D6F2]' },
  en_route:     { bg: 'bg-[#FF8A24]/10', text: 'text-[#FF8A24]', border: 'border-[#FF8A24]/30', dot: 'bg-[#FF8A24]' },
  acknowledged: { bg: 'bg-[#FF8A24]/10', text: 'text-[#FF8A24]', border: 'border-[#FF8A24]/30', dot: 'bg-[#FF8A24]' },
  completed:    { bg: 'bg-[#10B981]/10', text: 'text-[#10B981]', border: 'border-[#10B981]/30', dot: 'bg-[#10B981]' },
  pending:      { bg: 'bg-[#FF8A24]/10', text: 'text-[#FF8A24]', border: 'border-[#FF8A24]/30', dot: 'bg-[#FF8A24]' },
};

function getRealGps(coords) {
  // Base North Haven coastal reference: 41.3850° N, 70.5280° W
  if (!coords || coords.length < 2) return { lat: 41.3850, lon: -70.5280, str: "41.3850° N, 70.5280° W", url: "https://www.google.com/maps?q=41.3850,-70.5280" };
  const lat = (41.3850 + (coords[1] || 0) * 0.00008).toFixed(4);
  const lon = (-70.5280 + (coords[0] || 0) * 0.00009).toFixed(4);
  return {
    lat,
    lon,
    str: `${Math.abs(lat)}° N, ${Math.abs(lon)}° W`,
    url: `https://www.google.com/maps?q=${lat},${lon}`
  };
}

export default function FieldRescueScreen({ currentUser, onLogout }) {
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const [toast, setToast] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadMissions = async () => {
    try {
      const res = await fetchMissionHistory();
      setMissions(res.mission_history || []);
    } catch (e) {
      console.warn('Failed to load mission history', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async (missionId) => {
    setActionLoading(missionId);
    try {
      await updateMissionHistoryStatus(missionId, 'en_route', 'Rescue unit accepted dispatch and is en route');
      showToast(`Dispatch ${missionId} Accepted — Unit En Route to Target GPS!`, 'success');
      await loadMissions();
    } catch (err) {
      showToast(`Error accepting dispatch: ${err.message}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmEvacuation = async (missionId) => {
    setActionLoading(missionId);
    try {
      await updateMissionHistoryStatus(missionId, 'completed', 'All victims evacuated safely to high ground');
      showToast(`Target Evacuation Confirmed for ${missionId}! Victims safely secured.`, 'success');
      await loadMissions();
    } catch (err) {
      showToast(`Error confirming evacuation: ${err.message}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeployDirectBoat = async () => {
    setActionLoading('direct-boat');
    try {
      await dispatchRescueMission({
        action: 'DISPATCH_RESCUE_BOAT',
        sector: 'North Haven Coastal Sector #04',
        status: 'en_route',
        notes: 'Direct emergency launch from Field Rescue Portal',
        asset: 'RESCUE FLEET • Alpha Watercraft Unit',
        victims_count: 4,
        flood_depth_m: 1.85,
        waypoint_coords: [-90.0, -10.0]
      });
      showToast('RESCUE FLEET • Alpha Watercraft Unit Deployed to Sector #04!', 'success');
      await loadMissions();
    } catch (err) {
      showToast(`Deployment error: ${err.message}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  useEffect(() => {
    loadMissions();
    const interval = setInterval(() => {
      setTick(t => t + 1);
      loadMissions();
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const criticalCount = missions.filter(m => m.action === 'DISPATCH_RESCUE_BOAT').length;
  const lifelineCount = missions.filter(m => m.action === 'DISPATCH_LIFELINE_DRONE').length;

  return (
    <div className="min-h-screen bg-[#0B1220] text-slate-100 overflow-hidden flex flex-col">
      {/* BG glow */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#35D6F2]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#FF4D5D]/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Top Bar */}
      <header className="px-6 py-4 border-b border-[#22354E] bg-[#111C2D]/90 backdrop-blur-md flex items-center justify-between z-10 relative">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#35D6F2] to-[#A855F7] flex items-center justify-center">
            <Radio className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-lg tracking-wider text-white">RESQ</span>
              <span className="font-black text-lg text-[#35D6F2]">FLY</span>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-[#35D6F2]/15 text-[#35D6F2] border border-[#35D6F2]/30 font-bold">FIELD UNIT</span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono uppercase tracking-tight">Tactical Field Rescue Dashboard</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Live pulse */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#172438] border border-[#22354E] text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-[#35D6F2] animate-pulse" />
            <span className="text-[#35D6F2]">LIVE DISPATCH FEED</span>
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-white">{currentUser?.name}</p>
            <p className="text-[10px] text-slate-400 font-mono">{currentUser?.gov_id} · {currentUser?.department}</p>
          </div>
          <button
            onClick={onLogout}
            className="p-2 rounded-xl bg-[#172438] border border-[#22354E] hover:border-[#FF4D5D]/50 text-slate-400 hover:text-[#FF4D5D] transition-colors cursor-pointer"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 relative z-10">
        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Dispatches', value: missions.length, icon: <Zap className="w-5 h-5" />, color: 'text-[#FF8A24]' },
            { label: 'Rescue Boats Sent', value: criticalCount, icon: <AlertTriangle className="w-5 h-5" />, color: 'text-[#FF4D5D]' },
            { label: 'Lifeline Drops', value: lifelineCount, icon: <Navigation className="w-5 h-5" />, color: 'text-[#35D6F2]' },
            { label: 'Completed', value: missions.filter(m => m.status === 'completed').length, icon: <CheckCircle2 className="w-5 h-5" />, color: 'text-[#10B981]' },
          ].map((stat, i) => (
            <div key={i} className="bg-[#172438] border border-[#22354E] rounded-2xl p-4">
              <div className={`${stat.color} mb-2`}>{stat.icon}</div>
              <p className="text-2xl font-black text-white">{stat.value}</p>
              <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Toast Notification */}
        {toast && (
          <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-2xl shadow-2xl border text-sm font-bold flex items-center gap-3 backdrop-blur-md animate-fade-in ${
            toast.type === 'error'
              ? 'bg-[#FF4D5D]/20 border-[#FF4D5D] text-white shadow-[#FF4D5D]/20'
              : 'bg-[#10B981]/20 border-[#10B981] text-white shadow-[#10B981]/20'
          }`}>
            <CheckCircle2 className={`w-5 h-5 ${toast.type === 'error' ? 'text-[#FF4D5D]' : 'text-[#10B981]'}`} />
            <span>{toast.message}</span>
          </div>
        )}

        {/* Current Scenario Alert */}
        <div className="mb-6 p-4 rounded-2xl bg-[#FF4D5D]/10 border border-[#FF4D5D]/30 flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[#FF4D5D] mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-bold text-[#FF4D5D]">ACTIVE: North Haven Coastal Inundation — Halloween Flood Event</p>
              <p className="text-xs text-slate-400 font-mono mt-1">Multi-sector patrol active. AI-generated dispatch alerts appear below in real time. Acknowledge each mission on arrival at GPS coordinates.</p>
            </div>
          </div>
          <button
            onClick={handleDeployDirectBoat}
            disabled={actionLoading === 'direct-boat'}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#FF8A24] to-[#A855F7] hover:brightness-110 text-white font-extrabold text-xs shadow-md shadow-[#FF8A24]/20 transition-all border border-[#FF8A24]/40 flex items-center gap-2 cursor-pointer shrink-0"
          >
            <Anchor className="w-4 h-4 text-white" />
            <span>{actionLoading === 'direct-boat' ? 'Deploying...' : 'Deploy Rescue Boat Now'}</span>
          </button>
        </div>

        {/* Mission Dispatch Feed */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-black text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#35D6F2]" />AI Dispatch Alerts
            </h2>
            <span className="text-[10px] font-mono text-slate-500">Auto-refresh every 3s • Tick #{tick}</span>
          </div>

          {loading && missions.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <Radio className="w-8 h-8 mx-auto mb-2 animate-pulse text-[#35D6F2]" />
              <p className="text-sm font-mono">Waiting for AI patrol dispatch signals…</p>
            </div>
          ) : missions.length === 0 ? (
            <div className="text-center py-16 text-slate-600">
              <Shield className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm font-mono">No dispatches yet. Patrol scanning sectors…</p>
              <div className="mt-3">
                <button
                  onClick={handleDeployDirectBoat}
                  className="px-4 py-2 rounded-xl bg-[#35D6F2] text-slate-950 font-bold text-xs hover:bg-[#35D6F2]/90 cursor-pointer shadow-md inline-flex items-center gap-2"
                >
                  <Anchor className="w-4 h-4" />
                  <span>Initiate First Rescue Watercraft Dispatch</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {missions.map((m, idx) => {
                const sc = STATUS_COLORS[m.status] || STATUS_COLORS.pending;
                const isRescue = m.action === 'DISPATCH_RESCUE_BOAT' || (m.flood_depth_m || 0) >= 1.5;
                const urgency = isRescue ? 'CRITICAL' : 'HIGH';
                const gps = getRealGps(m.waypoint_coords);
                const assetName = isRescue
                  ? 'RESCUE FLEET • Alpha Watercraft Unit'
                  : 'Drone Charlie • Rapid Air-Drop Relief';
                const isLoading = actionLoading === m.id;

                return (
                  <div
                    key={m.id || idx}
                    className={`bg-[#172438] border-2 ${isRescue ? 'border-[#FF4D5D]/60 shadow-lg shadow-[#FF4D5D]/10' : 'border-[#35D6F2]/40'} rounded-2xl p-5 hover:shadow-xl transition-all`}
                  >
                    {/* Header Row: Action, Urgency Badge, Mode, Timestamp */}
                    <div className="flex items-start justify-between gap-3 flex-wrap border-b border-[#22354E] pb-3 mb-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${isRescue ? 'bg-[#FF4D5D]/20 border border-[#FF4D5D]/40' : 'bg-[#35D6F2]/15 border border-[#35D6F2]/40'}`}>
                          {isRescue
                            ? <LifeBuoy className="w-6 h-6 text-[#FF4D5D] animate-spin-slow" />
                            : <Navigation className="w-6 h-6 text-[#35D6F2]" />
                          }
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-sm font-black tracking-wide ${isRescue ? 'text-[#FF4D5D]' : 'text-[#35D6F2]'}`}>
                              {m.action}
                            </span>
                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-black border uppercase tracking-wider ${
                              urgency === 'CRITICAL'
                                ? 'bg-[#FF4D5D]/20 text-[#FF4D5D] border-[#FF4D5D]/60 animate-pulse'
                                : 'bg-amber-500/20 text-amber-400 border-amber-500/50'
                            }`}>
                              URGENCY: {urgency}
                            </span>
                            <span className={`text-[9px] font-mono px-2 py-0.5 rounded border ${sc.bg} ${sc.text} ${sc.border}`}>
                              <span className={`inline-block w-1.5 h-1.5 rounded-full ${sc.dot} mr-1`} />{m.status.toUpperCase()}
                            </span>
                            <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-[#111C2D] border border-[#22354E] text-slate-400">
                              {m.mode === 'auto' ? '⚡ AUTONOMOUS' : '👤 MANUAL COORDINATOR'}
                            </span>
                          </div>
                          <h3 className="text-base font-black text-white mt-1">
                            {m.sector}
                          </h3>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[11px] font-mono font-bold text-[#FF8A24] bg-[#FF8A24]/10 px-2 py-0.5 rounded border border-[#FF8A24]/30 block">
                          {m.id}
                        </span>
                        <p className="text-[10px] text-slate-400 font-mono mt-1">
                          {new Date(m.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>

                    {/* Prominent Survivor Count & Asset Callout */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                      <div className="p-3 rounded-xl bg-[#111C2D] border border-[#22354E] flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <Users className="w-5 h-5 text-[#FF8A24]" />
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase font-mono block">Survivor Status:</span>
                            <span className="text-sm font-black text-white">
                              Confirmed Victims: {m.victims_count}
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#FF4D5D]/15 text-[#FF4D5D] border border-[#FF4D5D]/30 font-bold">
                          {isRescue ? 'Immediate Extraction' : 'Supplies Needed'}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-[#111C2D] border border-[#22354E] flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <Anchor className="w-5 h-5 text-[#35D6F2]" />
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase font-mono block">Dispatched Asset:</span>
                            <span className="text-xs font-bold text-[#35D6F2] font-mono">
                              {assetName}
                            </span>
                          </div>
                        </div>
                        <span className="text-[9px] font-mono text-slate-500">
                          {m.drone_callsign}
                        </span>
                      </div>
                    </div>

                    {/* Exact GPS Coordinates & Live Map Direct Link */}
                    <div className="p-3 rounded-xl bg-gradient-to-r from-[#111C2D] via-[#172438] to-[#111C2D] border border-[#35D6F2]/30 flex flex-wrap items-center justify-between gap-3 font-mono text-xs mb-3">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-[#35D6F2] shrink-0" />
                        <div>
                          <span className="text-slate-400 text-[10px] uppercase block">Exact Target Coordinates:</span>
                          <span className="text-white font-black text-sm tracking-wide">
                            {gps.str}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-slate-400">
                          Depth: <strong className={m.flood_depth_m >= 1.5 ? 'text-[#FF4D5D]' : 'text-[#35D6F2]'}>{m.flood_depth_m?.toFixed(2)}m</strong>
                        </span>

                        <a
                          href={gps.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#35D6F2] hover:bg-[#35D6F2]/90 text-slate-950 font-black text-xs transition-all shadow-md shadow-[#35D6F2]/20 cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-slate-950" />
                          <span>View on Direct Map</span>
                        </a>
                      </div>
                    </div>

                    {/* Operational Action CTA */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {m.status === 'dispatched' && (
                        <>
                          <button
                            onClick={() => handleAcknowledge(m.id)}
                            disabled={isLoading}
                            className="flex-1 min-w-[200px] py-2.5 px-4 rounded-xl bg-[#10B981] hover:bg-[#10B981]/90 text-slate-950 text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-[#10B981]/20"
                          >
                            <CheckCircle2 className="w-4 h-4 text-slate-950" />
                            <span>{isLoading ? 'Updating...' : 'Accept Dispatch & En Route to GPS'}</span>
                          </button>
                          <button
                            onClick={() => handleDeployDirectBoat()}
                            disabled={actionLoading === 'direct-boat'}
                            className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#FF8A24] to-[#A855F7] hover:brightness-110 text-white text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-[#FF8A24]/20"
                          >
                            <Anchor className="w-4 h-4 text-white" />
                            <span>Deploy Rescue Boat</span>
                          </button>
                        </>
                      )}

                      {(m.status === 'en_route' || m.status === 'acknowledged') && (
                        <button
                          onClick={() => handleConfirmEvacuation(m.id)}
                          disabled={isLoading}
                          className="flex-1 py-2.5 px-4 rounded-xl bg-[#10B981] hover:bg-[#10B981]/90 text-slate-950 text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-[#10B981]/20"
                        >
                          <CheckCircle2 className="w-4 h-4 text-slate-950" />
                          <span>{isLoading ? 'Updating...' : 'Confirm Target Evacuation (Mission Complete)'}</span>
                        </button>
                      )}

                      {m.status === 'completed' && (
                        <div className="flex-1 py-2.5 px-4 rounded-xl bg-[#10B981]/15 border border-[#10B981]/40 text-[#10B981] text-xs font-bold flex items-center justify-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                          <span>Evacuation Confirmed • Survivors Secured</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
