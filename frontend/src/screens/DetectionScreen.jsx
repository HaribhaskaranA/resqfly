import React, { useState, useEffect, useRef } from 'react';
import {
  Eye,
  Upload,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Camera,
  Shield,
  Layers,
  Thermometer,
  Zap,
  Flame,
  Activity,
  Send,
  Navigation,
  FileCheck,
  Video,
  Radio,
  Compass,
  Waves,
  Clock,
  Users,
  History,
  ToggleLeft,
  ToggleRight,
  MapPin,
  BookOpen,
  Info,
  HelpCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import {
  analyzeDetectionFrame,
  verifyObservation,
  processMultimodalTriage,
  fetchPatrolStream,
  fetchTriageHealth,
  assignMission,
  patrolDispatch,
  fetchMissionHistory
} from '../api/client';

export default function DetectionScreen({ observations = [], onStateRefresh }) {
  // Mode selection: 'dual_triage' (New Multi-Modal Sensor Fusion) vs 'single_feed' (Legacy Observation Archive)
  const [activeTab, setActiveTab] = useState('dual_triage');

  // Dual-Stream Triage State
  const [triageLoading, setTriageLoading] = useState(false);
  const [triageResult, setTriageResult] = useState(null);
  const [rgbFile, setRgbFile] = useState(null);
  const [thermalFile, setThermalFile] = useState(null);
  const [dispatchStatus, setDispatchStatus] = useState(null);

  // Autonomous Patrol Stream State
  const [patrolActive, setPatrolActive] = useState(false);
  const [patrolStep, setPatrolStep] = useState(0);
  const patrolIntervalRef = useRef(null);
  const patrolStepRef = useRef(0);

  // Single Feed / Archive State
  const [selectedFile, setSelectedFile] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [previewObs, setPreviewObs] = useState(observations[0] || null);
  const [sourceType, setSourceType] = useState('sample_video_ai');

  // Autonomous / Manual Mode
  const [executionMode, setExecutionMode] = useState('autonomous'); // 'autonomous' | 'manual'
  const [guideOpen, setGuideOpen] = useState(true); // User Operational Guidance panel
  const [missionHistory, setMissionHistory] = useState([]);
  const [manualPendingApproval, setManualPendingApproval] = useState(null); // patrol result awaiting coordinator approval
  const [autoDispatchBanner, setAutoDispatchBanner] = useState(null); // { action, asset, sector }

  // Load default simulated critical triage on initial mount
  useEffect(() => {
    runTriageScenario('critical');
    loadMissionHistory();
  }, []);

  const loadMissionHistory = async () => {
    try {
      const res = await fetchMissionHistory();
      setMissionHistory(res.mission_history || []);
    } catch (e) {}
  };

  // Autonomous Patrol Feed (3-second auto-scanner)
  useEffect(() => {
    if (patrolActive) {
      executePatrolStep(patrolStepRef.current);
      patrolIntervalRef.current = setInterval(() => {
        patrolStepRef.current = (patrolStepRef.current + 1) % 4;
        setPatrolStep(patrolStepRef.current);
        executePatrolStep(patrolStepRef.current);
      }, 3000);
    } else {
      if (patrolIntervalRef.current) {
        clearInterval(patrolIntervalRef.current);
        patrolIntervalRef.current = null;
      }
    }
    return () => {
      if (patrolIntervalRef.current) {
        clearInterval(patrolIntervalRef.current);
      }
    };
  }, [patrolActive]);

  const executePatrolStep = async (step) => {
    setTriageLoading(true);
    setDispatchStatus(null);
    setAutoDispatchBanner(null);
    try {
      const res = await fetchPatrolStream(step);
      setTriageResult(res);

      // Auto-dispatch logic for autonomous mode
      if (executionMode === 'autonomous') {
        const floodDepth = res.flood_depth_meters || 0;
        const victims = res.confirmed_people_count || 0;
        if (victims > 0) {
          // Trigger dispatch via API
          const dispatchRes = await patrolDispatch({ step, mode: 'autonomous', approved: true });
          if (dispatchRes.dispatched) {
            setAutoDispatchBanner({
              action: dispatchRes.dispatch_action,
              asset: dispatchRes.dispatch_asset,
              sector: res.current_sector
            });
            await loadMissionHistory();
            setTimeout(() => setAutoDispatchBanner(null), 5000);
          }
        }
      } else {
        // Manual mode: store pending recommendation for coordinator
        const floodDepth = res.flood_depth_meters || 0;
        const victims = res.confirmed_people_count || 0;
        if (victims > 0) {
          setManualPendingApproval({ step, result: res });
        } else {
          setManualPendingApproval(null);
        }
      }
    } catch (e) {
      console.error('Patrol stream poll error:', e);
    } finally {
      setTriageLoading(false);
    }
  };

  const handleManualApprove = async () => {
    if (!manualPendingApproval) return;
    try {
      const dispatchRes = await patrolDispatch({
        step: manualPendingApproval.step,
        mode: 'manual',
        approved: true
      });
      if (dispatchRes.dispatched) {
        setAutoDispatchBanner({
          action: dispatchRes.dispatch_action,
          asset: dispatchRes.dispatch_asset,
          sector: manualPendingApproval.result.current_sector
        });
        await loadMissionHistory();
        setManualPendingApproval(null);
        setTimeout(() => setAutoDispatchBanner(null), 5000);
      }
    } catch (e) {
      console.error('Manual approve error:', e);
    }
  };

  const runTriageScenario = async (scenarioType) => {
    if (patrolActive) setPatrolActive(false);
    setTriageLoading(true);
    setDispatchStatus(null);
    try {
      const formData = new FormData();
      formData.append('scenario', scenarioType);
      const res = await processMultimodalTriage(formData);
      setTriageResult(res);
    } catch (e) {
      console.error('Failed to run triage scenario:', e);
    } finally {
      setTriageLoading(false);
    }
  };

  const handleCustomTriageSubmit = async (e) => {
    e.preventDefault();
    if (patrolActive) setPatrolActive(false);
    if (!rgbFile && !thermalFile) {
      runTriageScenario('critical');
      return;
    }
    setTriageLoading(true);
    setDispatchStatus(null);
    try {
      const formData = new FormData();
      if (rgbFile) formData.append('rgb_file', rgbFile);
      if (thermalFile) formData.append('thermal_file', thermalFile);
      const res = await processMultimodalTriage(formData);
      setTriageResult(res);
    } catch (e) {
      console.error('Failed to run custom triage:', e);
    } finally {
      setTriageLoading(false);
    }
  };

  const handleExecuteDispatch = async () => {
    if (!triageResult) return;
    setDispatchStatus('dispatching');
    try {
      const missionType = triageResult.drone_mission_dispatch === 'DISPATCH_RESCUE_BOAT'
        ? 'search_and_rescue'
        : triageResult.drone_mission_dispatch === 'DISPATCH_LIFELINE_DRONE'
        ? 'supply_delivery'
        : 'perimeter_recon';

      const payload = {
        type: missionType,
        title: `Auto-Triage Mission: ${triageResult.drone_mission_dispatch}`,
        target_location: { x: -35.0, y: 3.5, z: 42.0 },
        required_payload_kg: missionType === 'supply_delivery' ? 5.0 : 0.0,
        urgency: triageResult.system_status === 'CRITICAL_DANGER' ? 'high' : 'medium'
      };

      await assignMission(payload);
      setDispatchStatus('dispatched');
      onStateRefresh && onStateRefresh();
    } catch (err) {
      console.error('Mission dispatch error:', err);
      setDispatchStatus('error');
    }
  };

  const handleRunSampleInference = async () => {
    setIsAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append('source_type', sourceType);
      formData.append('location_hint', 'Zone 3 - West Canal Bridge Rooftop');
      const obs = await analyzeDetectionFrame(formData);
      setPreviewObs(obs);
      onStateRefresh && onStateRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSelectedFile(file);
    setIsAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('source_type', 'sample_video_ai');
      formData.append('location_hint', 'Field Recon Drone Upload');
      const obs = await analyzeDetectionFrame(formData);
      setPreviewObs(obs);
      onStateRefresh && onStateRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleVerify = async (obsId, status) => {
    await verifyObservation(obsId, {
      status,
      verified_by: 'Rescue Coordinator',
      notes: status === 'verified' ? 'Confirmed visible human signatures on rooftop.' : 'Rejected as debris reflection.'
    });
    if (previewObs && previewObs.id === obsId) {
      setPreviewObs({ ...previewObs, verification_status: status });
    }
    onStateRefresh && onStateRefresh();
  };

  return (
    <div className="p-6 space-y-6 overflow-y-auto max-h-screen bg-[#0B1220]">
      {/* Top Header & Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-white flex items-center gap-2.5">
            <Eye className="w-5 h-5 text-[#35D6F2]" />
            <span>AI Multi-Modal Drone Triage & Human Detection Center</span>
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Dual-Stream Sensor Fusion (RGB Camera + Thermal FLIR IR) & Autonomous Decision Engine for SCOUT and LIFELINE Drones.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center bg-[#111C2D] p-1 rounded-xl border border-[#22354E]">
          <button
            onClick={() => setActiveTab('dual_triage')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
              activeTab === 'dual_triage'
                ? 'bg-gradient-to-r from-[#FF8A24] to-[#FF4D5D] text-white shadow-md shadow-[#FF8A24]/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Dual-Stream Sensor Fusion</span>
          </button>
          <button
            onClick={() => setActiveTab('single_feed')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
              activeTab === 'single_feed'
                ? 'bg-[#35D6F2]/20 text-[#35D6F2] border border-[#35D6F2]/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Single Feed Archive</span>
          </button>
        </div>
      </div>

      {/* Architecture Status Badge & Advisory Banner */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-[#172438] border border-[#22354E]">
        <div className="flex items-center gap-2.5">
          <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-[#35D6F2]/20 text-[#35D6F2] border border-[#35D6F2]/50 flex items-center gap-1.5 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[#35D6F2] animate-pulse" />
            MULTI-MODAL THERMAL-GUIDED FUSION ACTIVE
          </span>
          <span className="text-xs text-slate-300 font-mono hidden md:inline">
            Thermal FLIR Primary Detection → Optical RGB Projection
          </span>
        </div>
        <div className="text-[11px] font-mono text-slate-400">
          Model: <strong className="text-[#35D6F2]">resqfly_aerial_best.pt</strong> • FLIR Lepton 3.5 IR Filter
        </div>
      </div>

      {/* Operational Guidance & Mode Switcher Manual Banner */}
      <div className="rounded-2xl border border-[#35D6F2]/40 bg-[#111C2D]/95 backdrop-blur-md overflow-hidden shadow-2xl">
        <div
          onClick={() => setGuideOpen(!guideOpen)}
          className="p-4 bg-gradient-to-r from-[#172438] via-[#111C2D] to-[#172438] border-b border-[#22354E] flex items-center justify-between cursor-pointer select-none"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#35D6F2]/20 border border-[#35D6F2]/40 flex items-center justify-center text-[#35D6F2]">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-mono font-black text-white uppercase tracking-wider flex items-center gap-2">
                <span>AI Detection Center • Operational Guidance Manual</span>
                <span className="px-2 py-0.5 rounded text-[9px] bg-[#35D6F2]/20 text-[#35D6F2] border border-[#35D6F2]/40">
                  Field Guide
                </span>
              </h2>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                Instructions for Manual AI Mode, Switching to Auto Mode, and Calibrated Demo Data.
              </p>
            </div>
          </div>
          <button className="text-slate-400 hover:text-white transition-colors p-1" title={guideOpen ? "Collapse Manual" : "Expand Manual"}>
            {guideOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>

        {guideOpen && (
          <div className="p-5 space-y-4 text-xs font-mono">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Column 1: Manual AI Mode */}
              <div className="p-4 rounded-xl bg-[#172438] border border-[#22354E] space-y-2.5">
                <div className="flex items-center gap-2 text-[#FF8A24] font-black text-xs uppercase">
                  <Shield className="w-4 h-4" />
                  <span>1. Using Manual AI Mode</span>
                </div>
                <ul className="space-y-2 text-[11px] text-slate-300 list-disc list-inside leading-relaxed">
                  <li><strong className="text-white">Upload Custom Feeds:</strong> Click <code className="text-[#35D6F2] bg-[#0B1220] px-1 rounded">Upload RGB</code> or <code className="text-[#FF8A24] bg-[#0B1220] px-1 rounded">Upload FLIR</code> to upload drone footage, webcam frames, or aerial pictures.</li>
                  <li><strong className="text-white">Run Triage:</strong> Click <code className="text-white bg-[#FF8A24]/30 px-1 rounded">Run Triage</code> or select a calibrated scenario (<span className="text-[#FF4D5D]">Critical</span>, <span className="text-[#10B981]">Safe</span>, <span className="text-[#35D6F2]">Clear</span>).</li>
                  <li><strong className="text-white">Coordinator Review:</strong> In Manual Mode, AI triage alerts remain in review until the Incident Coordinator clicks <strong>Authorize & Deploy Mission</strong>.</li>
                </ul>
              </div>

              {/* Column 2: Switching to Auto Mode */}
              <div className="p-4 rounded-xl bg-[#172438] border border-[#22354E] space-y-2.5">
                <div className="flex items-center gap-2 text-[#10B981] font-black text-xs uppercase">
                  <Zap className="w-4 h-4" />
                  <span>2. How to Switch to Auto Mode</span>
                </div>
                <ul className="space-y-2 text-[11px] text-slate-300 list-disc list-inside leading-relaxed">
                  <li><strong className="text-white">Step 1:</strong> Flip the <strong className="text-white">AUTONOMOUS PATROL FEED</strong> toggle above to <span className="text-[#10B981] font-bold">ON</span> (green pulsing radar icon).</li>
                  <li><strong className="text-white">Step 2:</strong> Set the Execution Mode toggle below to <span className="text-[#10B981] font-bold">AUTONOMOUS (AUTO-DISPATCH)</span>.</li>
                  <li><strong className="text-white">Live Cycle:</strong> The patrol loop cycles through North Haven coastal sectors every 3.0s, computes physical water depth, and auto-dispatches rescue craft without waiting for manual confirmation.</li>
                </ul>
              </div>

              {/* Column 3: Demo Data Notice */}
              <div className="p-4 rounded-xl bg-[#172438] border border-[#35D6F2]/30 space-y-2.5 bg-gradient-to-b from-[#172438] to-[#111C2D]">
                <div className="flex items-center gap-2 text-[#35D6F2] font-black text-xs uppercase">
                  <Info className="w-4 h-4" />
                  <span>3. Demo Data Calibration Notice</span>
                </div>
                <div className="text-[11px] text-slate-300 space-y-2 leading-relaxed">
                  <p>
                    <strong className="text-[#35D6F2]">Active Stream Engine:</strong> Autonomous Mode currently operates on <strong>realistic calibrated demo scenario data</strong>.
                  </p>
                  <p className="text-slate-400">
                    This continuously streams simulated multi-sector telemetry, aerial thermal hotspots, and physical landmark water depths (Bridge, Canal, School, Pier) for full evaluation without requiring live hardware drone cameras in flight.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {activeTab === 'dual_triage' ? (
        /* ================= DUAL-STREAM MULTI-MODAL TRIAGE VIEW ================= */
        <div className="space-y-6">
          {/* Preset Scenario Selectors & Autonomous Patrol Feed Toggle */}
          <div className="panel-card p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Autonomous Patrol Feed Toggle Switch */}
              <div className="flex items-center gap-2.5 bg-[#111C2D] px-3 py-1.5 rounded-xl border border-[#22354E] shadow-inner">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${patrolActive ? 'bg-[#10B981] animate-ping' : 'bg-slate-500'}`} />
                  <Radio className={`w-3.5 h-3.5 ${patrolActive ? 'text-[#10B981]' : 'text-slate-400'}`} />
                  <span className="text-xs font-mono font-bold text-slate-200">
                    AUTONOMOUS PATROL FEED
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setPatrolActive(!patrolActive)}
                  className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors cursor-pointer ${
                    patrolActive ? 'bg-gradient-to-r from-[#10B981] to-[#35D6F2]' : 'bg-slate-700'
                  }`}
                  title={patrolActive ? "Click to Pause Autonomous Patrol" : "Click to Start 3s Autonomous Patrol Stream"}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                      patrolActive ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className="text-[10px] font-mono text-slate-400">
                  {patrolActive ? '3s Auto-Scan' : 'STANDBY'}
                </span>
              </div>

              {/* Scenario manual trigger buttons */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
                <span className="text-slate-500 font-bold uppercase text-[10px] mr-1 hidden sm:inline">Presets:</span>
                <button
                  disabled={triageLoading}
                  onClick={() => runTriageScenario('scene1_village')}
                  className="px-2.5 py-1 rounded-lg bg-[#FF4D5D]/20 hover:bg-[#FF4D5D]/30 text-[#FF4D5D] border border-[#FF4D5D]/50 font-bold flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50 text-[11px]"
                  title="Scene 1: Flooded Village Dual Stream (image_a89758.jpg) - Rescue Boat + Corridor Survivors"
                >
                  <Flame className="w-3 h-3 text-[#FF4D5D]" />
                  <span>Scene 1: Village (a89758)</span>
                </button>
                <button
                  disabled={triageLoading}
                  onClick={() => runTriageScenario('scene2_valley')}
                  className="px-2.5 py-1 rounded-lg bg-[#35D6F2]/20 hover:bg-[#35D6F2]/30 text-[#35D6F2] border border-[#35D6F2]/50 font-bold flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50 text-[11px]"
                  title="Scene 2: River Valley & Helicopter Dual Stream (image_a89723.jpg) - Friendly Heli (AIR-01) + Safe Zone Evacuees"
                >
                  <Radio className="w-3 h-3 text-[#35D6F2]" />
                  <span>Scene 2: Heli & Valley (a89723)</span>
                </button>
                <button
                  disabled={triageLoading}
                  onClick={() => runTriageScenario('clear')}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 font-bold flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50 text-[11px]"
                >
                  <Navigation className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              </div>
            </div>

            {/* Custom Dual-Stream File Form */}
            <form onSubmit={handleCustomTriageSubmit} className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#111C2D] border border-[#22354E] hover:border-[#35D6F2]/50 text-[11px] font-mono text-slate-300 cursor-pointer">
                <Camera className="w-3.5 h-3.5 text-[#35D6F2]" />
                <span>{rgbFile ? rgbFile.name.slice(0, 10) + '...' : 'Upload RGB'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setRgbFile(e.target.files[0])}
                  className="hidden"
                />
              </label>

              <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#111C2D] border border-[#22354E] hover:border-[#FF8A24]/50 text-[11px] font-mono text-slate-300 cursor-pointer">
                <Thermometer className="w-3.5 h-3.5 text-[#FF8A24]" />
                <span>{thermalFile ? thermalFile.name.slice(0, 10) + '...' : 'Upload FLIR'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setThermalFile(e.target.files[0])}
                  className="hidden"
                />
              </label>

              <button
                type="submit"
                disabled={triageLoading}
                className="px-3 py-1.5 rounded-lg bg-[#FF8A24] hover:bg-[#FF8A24]/90 text-slate-950 font-black text-xs transition-all cursor-pointer disabled:opacity-50 shadow-md shadow-[#FF8A24]/20"
              >
                {triageLoading ? 'Processing...' : 'Run Triage'}
              </button>
            </form>
          </div>

          {/* Autonomous Patrol Live Telemetry HUD */}
          {patrolActive && triageResult && (
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-[#10B981]/15 via-[#111C2D] to-[#172438] border border-[#10B981]/40 flex flex-wrap items-center justify-between gap-3 text-xs font-mono shadow-lg">
              <div className="flex items-center gap-2.5 text-[#10B981] font-black">
                <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-ping" />
                <span>AUTONOMOUS PATROL ACTIVE: SCOUT-ALPHA SCANNING</span>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-300">
                <span><strong>SECTOR:</strong> <span className="text-[#35D6F2]">{triageResult.current_sector || 'Patrol Waypoint'}</span></span>
                <span><strong>WAYPOINT:</strong> [{(triageResult.waypoint_coords || [-35.0, 3.5, 42.0]).join(', ')}]</span>
                <span><strong>ALT:</strong> {triageResult.altitude_m || 35.0}m</span>
                <span><strong>HEADING:</strong> {triageResult.heading_deg || 45}°</span>
                <span className="px-2 py-0.5 rounded bg-[#10B981]/20 text-[#10B981] font-bold border border-[#10B981]/40 animate-pulse">
                  AUTO-SCAN INTERVAL: 3.0S
                </span>
              </div>
            </div>
          )}

          {/* Synchronized Dual-Stream Sensor Viewports */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Stream 1: RGB Drone Camera */}
            <div className="panel-card p-4 flex flex-col">
              <div className="flex items-center justify-between mb-3 border-b border-[#22354E] pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#35D6F2] animate-pulse" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-[#35D6F2]" />
                    <span>Stream 1: Optical RGB Camera (Thermal-Projected Overlay)</span>
                  </h2>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#35D6F2]/15 text-[#35D6F2] border border-[#35D6F2]/40">
                  Thermal-Guided Geospatial Projection
                </span>
              </div>

              <div className="min-h-[300px] bg-[#0B1220] rounded-xl overflow-hidden flex items-center justify-center relative border border-[#22354E]">
                {triageResult?.rgb_preview_url ? (
                  <img
                    src={triageResult.rgb_preview_url}
                    alt="RGB Sensor Stream"
                    className="w-full h-auto object-cover rounded-lg"
                  />
                ) : (
                  <div className="text-center p-6 text-slate-500 font-mono text-xs">
                    No RGB feed decoded
                  </div>
                )}
                <div className="absolute bottom-2 left-2 bg-[#0B1220]/80 backdrop-blur px-2.5 py-1 rounded text-[10px] font-mono text-[#35D6F2] border border-[#22354E]">
                  FOV: 84° • ALT: 35.0M • RES: 640x480
                </div>
              </div>
            </div>

            {/* Stream 2: Drone Thermal FLIR IR Camera */}
            <div className="panel-card p-4 flex flex-col">
              <div className="flex items-center justify-between mb-3 border-b border-[#22354E] pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FF8A24] animate-ping" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono flex items-center gap-1.5">
                    <Thermometer className="w-4 h-4 text-[#FF8A24]" />
                    <span>Stream 2: Thermal FLIR IR Camera (Raw Heat Sensor)</span>
                  </h2>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#FF8A24]/15 text-[#FF8A24] border border-[#FF8A24]/40">
                  Body Heat Threshold &gt; 200
                </span>
              </div>

              <div className="min-h-[300px] bg-[#0B1220] rounded-xl overflow-hidden flex items-center justify-center relative border border-[#22354E]">
                {triageResult?.thermal_preview_url ? (
                  <img
                    src={triageResult.thermal_preview_url}
                    alt="FLIR Thermal Stream"
                    className="w-full h-auto object-cover rounded-lg"
                  />
                ) : (
                  <div className="text-center p-6 text-slate-500 font-mono text-xs">
                    No Thermal feed decoded
                  </div>
                )}
                <div className="absolute bottom-2 left-2 bg-[#0B1220]/80 backdrop-blur px-2.5 py-1 rounded text-[10px] font-mono text-[#FF8A24] border border-[#22354E]">
                  SENSOR: FLIR LEPTON 3.5 • BAND: 8-14μm
                </div>
              </div>
            </div>
          </div>

          {/* Autonomous Triage Decision Matrix Panel */}
          {triageResult && (
            <div className="panel-card p-6 space-y-5 border-2 border-[#22354E]">
              {/* Top Banner: Status + Latency */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#22354E] pb-4">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono uppercase text-slate-400 font-bold">
                    Autonomous Triage Evaluation:
                  </span>
                  <span
                    className={`px-4 py-1.5 rounded-xl text-xs font-mono font-black uppercase tracking-wider flex items-center gap-2 border shadow-lg ${
                      triageResult.system_status === 'CRITICAL_DANGER'
                        ? 'bg-[#FF4D5D]/20 text-[#FF4D5D] border-[#FF4D5D]/60 shadow-[#FF4D5D]/20 animate-pulse'
                        : triageResult.system_status === 'SAFE_ZONE'
                        ? 'bg-[#10B981]/20 text-[#10B981] border-[#10B981]/60 shadow-[#10B981]/20'
                        : 'bg-[#35D6F2]/20 text-[#35D6F2] border-[#35D6F2]/60 shadow-[#35D6F2]/20'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-current" />
                    <span>{triageResult.system_status.replace('_', ' ')}</span>
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className="text-slate-500">Processing Latency:</span>
                  <span className="px-2.5 py-1 rounded bg-[#111C2D] border border-[#22354E] text-[#35D6F2] font-bold">
                    {triageResult.processing_time_ms} ms
                  </span>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
                {/* Metric 1: Physical Landmark-based Flood Depth Engine */}
                <div className="p-4 rounded-xl bg-[#111C2D] border border-[#22354E] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 uppercase text-[11px] flex items-center gap-1">
                      <Waves className="w-3.5 h-3.5 text-[#35D6F2]" />
                      <span>Flood Depth (Meters)</span>
                    </span>
                    <span
                      className={`text-lg font-black ${
                        (triageResult.flood_depth_meters || 0) >= 3.0 ? 'text-[#FF4D5D]' : 'text-[#10B981]'
                      }`}
                    >
                      {triageResult.flood_depth_meters !== undefined ? `${triageResult.flood_depth_meters.toFixed(2)}m` : '3.65m'}
                    </span>
                  </div>
                  <div className="text-[10px] bg-[#0B1220] px-2 py-1 rounded border border-[#22354E] text-slate-300 truncate" title={triageResult.landmark_reference || 'Landmark Baseline: 3.0m Light Poles'}>
                    <strong className="text-[#35D6F2]">REF: </strong>
                    <span>{triageResult.landmark_reference || 'Submerged Light Poles (3.0m)'}</span>
                  </div>
                  <span className="text-[9px] text-slate-500 block">
                    Baselines: Ground 0m • Poles 3.0m • 1st Flr 3.5m
                  </span>
                </div>

                {/* Metric 2: Floodwater Submersion Pct */}
                <div className="p-4 rounded-xl bg-[#111C2D] border border-[#22354E] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 uppercase text-[11px]">Flood Surface Spread</span>
                    <span
                      className={`font-black ${
                        triageResult.flood_submersion_pct > 35.0 ? 'text-[#FF4D5D]' : 'text-[#10B981]'
                      }`}
                    >
                      {triageResult.flood_submersion_pct}%
                    </span>
                  </div>

                  {/* Progress Bar with 35% threshold indicator */}
                  <div className="w-full bg-[#0B1220] h-2.5 rounded-full overflow-hidden relative border border-[#22354E]">
                    <div
                      className={`h-full transition-all duration-500 rounded-full ${
                        triageResult.flood_submersion_pct > 35.0
                          ? 'bg-gradient-to-r from-[#FF8A24] to-[#FF4D5D]'
                          : 'bg-gradient-to-r from-[#35D6F2] to-[#10B981]'
                      }`}
                      style={{ width: `${Math.min(100, triageResult.flood_submersion_pct)}%` }}
                    />
                    {/* 35% marker line */}
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-white/70"
                      style={{ left: '35%' }}
                      title="Critical Danger Threshold (35%)"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 block">
                    Danger line: &gt;35.0% surface spread
                  </span>
                </div>

                {/* Metric 3: Confirmed Heat Signatures via Local Contrast */}
                <div className="p-4 rounded-xl bg-[#111C2D] border border-[#22354E] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 uppercase text-[11px]">Victims Confirmed</span>
                    <span className="text-2xl font-black text-white">
                      {triageResult.confirmed_people_count}
                    </span>
                  </div>
                  <span className="text-[10px] text-[#FF8A24] block">
                    FLIR Local Contrast (+3°C to +8°C)
                  </span>
                  <span className="text-[9px] text-slate-500 block">
                    Upright aspect (H ≥ 1.3W) • Area &lt; 600px²
                  </span>
                </div>

                {/* Metric 4: Target Coordinates Grid */}
                <div className="p-4 rounded-xl bg-[#111C2D] border border-[#22354E] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 uppercase text-[11px]">Projected Targets</span>
                    <span className="text-[#35D6F2] font-bold">
                      {triageResult.target_coordinates?.length || 0} Targets
                    </span>
                  </div>
                  <div className="max-h-20 overflow-y-auto pr-1 space-y-1">
                    {triageResult.target_details && triageResult.target_details.length > 0 ? (
                      triageResult.target_details.map((t, idx) => (
                        <div
                          key={idx}
                          className="text-[9px] bg-[#0B1220] px-1.5 py-0.5 rounded border border-[#22354E] text-slate-300 flex items-center justify-between gap-1"
                        >
                          <span
                            className={`font-bold truncate max-w-[140px] ${
                              t.type === 'friendly_aircraft'
                                ? 'text-[#35D6F2]'
                                : t.type === 'tactical_asset'
                                ? 'text-[#00E5FF]'
                                : t.label?.includes('SAFE')
                                ? 'text-[#10B981]'
                                : 'text-[#FF4D5D]'
                            }`}
                            title={t.label}
                          >
                            {t.label?.replace(/ \d+%/, '')}
                          </span>
                          <span className="font-mono text-slate-400 shrink-0">[{t.box.join(', ')}]</span>
                        </div>
                      ))
                    ) : triageResult.target_coordinates && triageResult.target_coordinates.length > 0 ? (
                      triageResult.target_coordinates.map((coords, idx) => (
                        <div
                          key={idx}
                          className="text-[9px] bg-[#0B1220] px-1.5 py-0.5 rounded border border-[#22354E] text-slate-300 flex justify-between"
                        >
                          <span className="text-[#FF8A24]">TGT-{idx + 1}</span>
                          <span>[{coords.join(', ')}]</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-[10px] text-slate-500 italic">None detected</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Tactical Explanation & Action Dispatch Card */}
              <div className="p-4 rounded-xl bg-[#111C2D] border border-[#22354E] space-y-3">
                <div className="flex items-start gap-2.5">
                  <Shield className="w-5 h-5 text-[#FF8A24] shrink-0 mt-0.5" />
                  <div className="space-y-1 flex-1">
                    <span className="text-xs font-mono font-bold uppercase text-slate-300 block">
                      Autonomous Tactical Assessment & Recommendation:
                    </span>
                    <p className="text-xs font-mono text-slate-300 leading-relaxed">
                      {triageResult.tactical_reason}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#22354E] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase">Action:</span>
                      <span className="text-[#FF8A24] font-black">{triageResult.recommended_action}</span>
                    </div>
                    <div className="h-6 w-px bg-[#22354E] hidden sm:block" />
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase">Dispatch Command:</span>
                      <span className="text-[#35D6F2] font-black">{triageResult.drone_mission_dispatch}</span>
                    </div>
                  </div>

                  <button
                    onClick={handleExecuteDispatch}
                    disabled={dispatchStatus === 'dispatching' || dispatchStatus === 'dispatched'}
                    className={`px-5 py-2.5 rounded-xl font-black text-xs font-mono flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg ${
                      dispatchStatus === 'dispatched'
                        ? 'bg-[#10B981] text-slate-950 shadow-[#10B981]/20'
                        : triageResult.system_status === 'CRITICAL_DANGER'
                        ? 'bg-gradient-to-r from-[#FF4D5D] to-[#FF8A24] hover:brightness-110 text-white shadow-[#FF4D5D]/25'
                        : 'bg-gradient-to-r from-[#35D6F2] to-[#2563EB] hover:brightness-110 text-slate-950 shadow-[#35D6F2]/20'
                    }`}
                  >
                    <Send className="w-4 h-4" />
                    <span>
                      {dispatchStatus === 'dispatching'
                        ? 'Executing Dispatch...'
                        : dispatchStatus === 'dispatched'
                        ? 'Dispatch Command Executed ✓'
                        : `Execute ${triageResult.drone_mission_dispatch}`}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Autonomous / Manual Execution Mode Toggle ── */}
          <div className="panel-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${executionMode === 'autonomous' ? 'bg-[#10B981]/15' : 'bg-[#A855F7]/15'}`}>
                  {executionMode === 'autonomous'
                    ? <Zap className="w-5 h-5 text-[#10B981]" />
                    : <Shield className="w-5 h-5 text-[#A855F7]" />
                  }
                </div>
                <div>
                  <p className="text-sm font-black text-white">
                    {executionMode === 'autonomous' ? '⚡ Autonomous Execution Mode' : '👤 Manual Override Mode'}
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono">
                    {executionMode === 'autonomous'
                      ? 'AI automatically dispatches rescue/supply assets when conditions are met.'
                      : 'AI generates recommendations only. Coordinator must approve each dispatch.'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-slate-400">Manual</span>
                <button
                  type="button"
                  onClick={() => setExecutionMode(m => m === 'autonomous' ? 'manual' : 'autonomous')}
                  className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors cursor-pointer ${
                    executionMode === 'autonomous' ? 'bg-gradient-to-r from-[#10B981] to-[#35D6F2]' : 'bg-[#A855F7]'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    executionMode === 'autonomous' ? 'translate-x-7' : 'translate-x-1'
                  }`} />
                </button>
                <span className="text-xs font-mono text-slate-400">Auto</span>
              </div>
            </div>

            {/* Auto-Dispatch Success Banner */}
            {autoDispatchBanner && (
              <div className={`mt-3 p-3 rounded-xl border flex items-center gap-2 text-xs font-mono animate-pulse ${
                autoDispatchBanner.action === 'DISPATCH_RESCUE_BOAT'
                  ? 'bg-[#FF4D5D]/10 border-[#FF4D5D]/40 text-[#FF4D5D]'
                  : 'bg-[#35D6F2]/10 border-[#35D6F2]/40 text-[#35D6F2]'
              }`}>
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>
                  <strong>AUTO-DISPATCHED:</strong> {autoDispatchBanner.action} → {autoDispatchBanner.asset} @ {autoDispatchBanner.sector}
                </span>
              </div>
            )}

            {/* Manual Approval Card */}
            {executionMode === 'manual' && manualPendingApproval && (
              <div className="mt-3 p-3 rounded-xl border border-[#A855F7]/40 bg-[#A855F7]/10">
                <p className="text-xs font-bold text-[#A855F7] mb-2">
                  🧠 AI Recommendation — Awaiting Coordinator Approval
                </p>
                <div className="text-xs font-mono text-slate-300 space-y-1 mb-3">
                  <p><strong>Sector:</strong> {manualPendingApproval.result.current_sector}</p>
                  <p><strong>Victims Detected:</strong> {manualPendingApproval.result.confirmed_people_count}</p>
                  <p><strong>Flood Depth:</strong> {manualPendingApproval.result.flood_depth_meters?.toFixed(2)}m</p>
                  <p><strong>Suggested:</strong> {manualPendingApproval.result.recommended_action}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleManualApprove}
                    className="flex-1 py-2 rounded-xl bg-[#10B981] text-slate-950 font-black text-xs flex items-center justify-center gap-1 cursor-pointer hover:bg-[#10B981]/90"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />Approve & Dispatch
                  </button>
                  <button
                    type="button"
                    onClick={() => setManualPendingApproval(null)}
                    className="flex-1 py-2 rounded-xl bg-[#111C2D] border border-[#22354E] text-slate-400 font-bold text-xs flex items-center justify-center gap-1 cursor-pointer hover:border-[#FF4D5D]/50 hover:text-[#FF4D5D]"
                  >
                    <XCircle className="w-3.5 h-3.5" />Reject Recommendation
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Mission History Table ── */}
          <div className="panel-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-black text-white flex items-center gap-2">
                <History className="w-4 h-4 text-[#FF8A24]" />
                AI Patrol Mission History
              </h2>
              <button
                type="button"
                onClick={loadMissionHistory}
                className="text-[10px] font-mono text-slate-500 hover:text-slate-300 px-2 py-1 rounded-lg border border-[#22354E] hover:border-[#35D6F2]/30 transition-colors cursor-pointer"
              >
                Refresh
              </button>
            </div>

            {missionHistory.length === 0 ? (
              <div className="text-center py-8 text-slate-600">
                <History className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs font-mono">No missions dispatched yet. Enable Autonomous Patrol to generate history.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr className="border-b border-[#22354E]">
                      {['ID', 'Time', 'Sector', 'Mode', 'Asset', 'Flood', 'Victims', 'Status'].map(h => (
                        <th key={h} className="text-left text-[10px] text-slate-500 uppercase tracking-wider pb-2 pr-3 font-bold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1a2d47]">
                    {missionHistory.map((m, i) => (
                      <tr key={m.id || i} className="hover:bg-[#172438]/50 transition-colors">
                        <td className="py-2 pr-3 text-[#FF8A24] font-bold">{m.id}</td>
                        <td className="py-2 pr-3 text-slate-400">{new Date(m.timestamp).toLocaleTimeString()}</td>
                        <td className="py-2 pr-3 text-slate-200 max-w-[120px] truncate" title={m.sector}>{m.sector}</td>
                        <td className="py-2 pr-3">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                            m.mode === 'auto'
                              ? 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30'
                              : 'bg-[#A855F7]/10 text-[#A855F7] border-[#A855F7]/30'
                          }`}>
                            {m.mode === 'auto' ? '⚡ AUTO' : '👤 MANUAL'}
                          </span>
                        </td>
                        <td className="py-2 pr-3 text-slate-300 max-w-[100px] truncate" title={m.dispatched_asset}>{m.dispatched_asset}</td>
                        <td className={`py-2 pr-3 font-bold ${m.flood_depth_m >= 1.5 ? 'text-[#FF4D5D]' : 'text-[#35D6F2]'}`}>
                          {m.flood_depth_m?.toFixed(1)}m
                        </td>
                        <td className="py-2 pr-3 text-[#FF8A24] font-bold">{m.victims_count}</td>
                        <td className="py-2">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#35D6F2]/10 text-[#35D6F2] border border-[#35D6F2]/30">
                            {m.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ================= SINGLE FEED OBSERVATION & ARCHIVE VIEW ================= */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Annotated Video / Image Feed */}
          <div className="lg:col-span-2 panel-card p-5 flex flex-col">
            <div className="flex items-center justify-between mb-3 border-b border-[#22354E] pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#35D6F2] animate-pulse" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
                  Aerial Visual Feed / Inference Viewport
                </h2>
              </div>

              {previewObs && (
                <span
                  className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                    previewObs.source_type === 'sample_video_ai'
                      ? 'bg-blue-950/80 border-blue-500/40 text-blue-300'
                      : 'bg-purple-950/80 border-purple-500/40 text-purple-300'
                  }`}
                >
                  {previewObs.source_type === 'sample_video_ai' ? 'Sample Video AI' : '3D Sim Sensor'}
                </span>
              )}
            </div>

            {/* Image Display */}
            <div className="flex-1 min-h-[380px] bg-[#0B1220] rounded-xl overflow-hidden flex items-center justify-center relative border border-[#22354E]">
              {previewObs?.image_or_video_url ? (
                <img
                  src={previewObs.image_or_video_url}
                  alt="Detection Feed"
                  className="max-h-[440px] w-auto object-contain rounded-lg"
                />
              ) : (
                <div className="text-center p-8 text-slate-500 space-y-2">
                  <Video className="w-12 h-12 mx-auto text-slate-600" />
                  <p className="text-xs font-mono">No video frame analyzed yet.</p>
                  <p className="text-[11px] text-slate-600">
                    Click "Analyze Sample Aerial Video Frame" or upload an aerial photo below.
                  </p>
                </div>
              )}
            </div>

            {/* Upload Input & Source Selector */}
            <div className="mt-4 pt-3 border-t border-[#22354E] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#111C2D] border border-[#22354E] hover:border-[#FF8A24]/40 text-xs font-mono text-slate-300 cursor-pointer transition-colors">
                  <Upload className="w-3.5 h-3.5 text-[#FF8A24]" />
                  <span>Upload Custom Aerial Frame</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                <button
                  disabled={isAnalyzing}
                  onClick={handleRunSampleInference}
                  className="flex items-center gap-2 py-1.5 px-3 rounded-xl bg-gradient-to-r from-[#35D6F2] to-[#2563EB] hover:brightness-110 text-slate-950 font-black text-xs transition-all border border-[#35D6F2]/40 cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>{isAnalyzing ? 'Running...' : 'Run Single Frame Sample'}</span>
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-slate-500">Mode:</span>
                <button
                  onClick={() => setSourceType('sample_video_ai')}
                  className={`px-2.5 py-1 rounded-lg ${
                    sourceType === 'sample_video_ai'
                      ? 'bg-[#35D6F2]/15 border border-[#35D6F2]/50 text-[#35D6F2] font-bold'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Sample Video AI
                </button>
                <button
                  onClick={() => setSourceType('synthetic_3d_simulation')}
                  className={`px-2.5 py-1 rounded-lg ${
                    sourceType === 'synthetic_3d_simulation'
                      ? 'bg-[#A855F7]/15 border border-[#A855F7]/50 text-[#A855F7] font-bold'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Synthetic 3D
                </button>
              </div>
            </div>
          </div>

          {/* Right: Observation Metrics & Human Coordinator Verification */}
          <div className="space-y-4">
            {previewObs ? (
              <div className="panel-card p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-[#22354E] pb-2">
                  <span className="text-xs font-mono font-bold text-[#FF8A24] uppercase">
                    Observation #{previewObs.id}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                      previewObs.verification_status === 'verified'
                        ? 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/40'
                        : previewObs.verification_status === 'rejected'
                        ? 'bg-[#FF4D5D]/15 text-[#FF4D5D] border-[#FF4D5D]/40'
                        : 'bg-[#FF8A24]/15 text-[#FF8A24] border-[#FF8A24]/40'
                    }`}
                  >
                    {previewObs.verification_status}
                  </span>
                </div>

                {/* Counts & Confidence */}
                <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                  <div className="p-3 rounded-xl bg-[#111C2D] border border-[#22354E]">
                    <span className="text-slate-500 block text-[10px] uppercase">Detected Persons</span>
                    <span className="text-2xl font-black text-white">{previewObs.detected_count}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#111C2D] border border-[#22354E]">
                    <span className="text-slate-500 block text-[10px] uppercase">Avg Confidence</span>
                    <span className="text-2xl font-black text-[#35D6F2]">
                      {Math.round(previewObs.confidence_avg * 100)}%
                    </span>
                  </div>
                </div>

                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Sector Estimate:</span>
                    <span className="text-slate-200">{previewObs.location_estimate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Sim Coordinates:</span>
                    <span className="text-slate-200">[-35.0, 3.2, 42.0]</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Model Pipeline:</span>
                    <span className="text-[#35D6F2]">OpenCV / YOLO HOG-DNN</span>
                  </div>
                </div>

                {/* Human Coordinator Verification Controls */}
                <div className="pt-3 border-t border-[#22354E] space-y-2">
                  <h3 className="text-xs font-bold text-slate-300 uppercase font-mono">
                    Coordinator Verification Action
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      disabled={previewObs.verification_status === 'verified'}
                      onClick={() => handleVerify(previewObs.id, 'verified')}
                      className="py-2.5 px-3 rounded-xl bg-[#10B981] hover:bg-[#10B981]/90 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-slate-950" />
                      <span>Confirm People</span>
                    </button>

                    <button
                      disabled={previewObs.verification_status === 'rejected'}
                      onClick={() => handleVerify(previewObs.id, 'rejected')}
                      className="py-2.5 px-3 rounded-xl bg-[#111C2D] hover:bg-[#FF4D5D]/20 text-slate-300 hover:text-[#FF4D5D] border border-[#22354E] hover:border-[#FF4D5D]/50 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reject False Tag</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="panel-card p-6 text-center text-slate-500 text-xs">
                Select or generate an observation to inspect details.
              </div>
            )}

            {/* Observations Log */}
            <div className="panel-card p-4">
              <h3 className="text-xs font-bold text-slate-300 uppercase font-mono mb-2">
                Recent Observations Log
              </h3>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {observations.map((obs) => (
                  <div
                    key={obs.id}
                    onClick={() => setPreviewObs(obs)}
                    className={`p-2.5 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition-colors ${
                      previewObs?.id === obs.id
                        ? 'bg-[#FF8A24]/15 border-[#FF8A24]/50 text-white'
                        : 'bg-[#111C2D] border-[#22354E] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div>
                      <span className="font-mono font-bold block">{obs.id}</span>
                      <span className="text-[10px] text-slate-500">
                        {obs.detected_count} people • {Math.round(obs.confidence_avg * 100)}%
                      </span>
                    </div>
                    <span className="text-[10px] font-mono capitalize text-[#FF8A24]">
                      {obs.verification_status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
