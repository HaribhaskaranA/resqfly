import React from 'react';
import {
  Users,
  Compass,
  ShieldAlert,
  Package,
  Waves,
  AlertTriangle,
  ChevronRight,
  ExternalLink,
  Sparkles,
  Activity,
  CheckCircle2,
  Battery,
  Clock,
  Radio,
  Send,
  Zap,
  ArrowUpRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import FloodScene3D from '../components/FloodScene3D';

export default function DashboardScreen({
  disaster,
  simState,
  drones = [],
  shelters = [],
  requests = [],
  alerts = [],
  missions = [],
  peopleClusters = [],
  onNavigate,
  onOpenDemoGuide,
  onAcknowledgeAlert
}) {
  const peopleDetected = peopleClusters
    .filter(p => p.detected_by_drone)
    .reduce((acc, curr) => acc + curr.count, 0);

  const totalPeopleAtRisk = peopleClusters.reduce((acc, curr) => acc + curr.count, 0);

  const highRiskShelters = shelters.filter(s => {
    const score = s.current_assessment?.risk_score || 0;
    return score >= 60.0;
  });

  const activeDrones = drones.filter(d => d.status !== 'idle' && d.status !== 'landed');
  const pendingRequests = requests.filter(r => r.status === 'pending');
  const completedMissions = missions.filter(m => m.status === 'completed');
  const inProgressMissions = missions.filter(m => m.status === 'in_progress');

  // Trend data for mini flood vs shelter strain chart
  const floodTrendData = [
    { time: '20:00', water: 0.8, strain: 22 },
    { time: '20:15', water: 1.1, strain: 35 },
    { time: '20:30', water: 1.4, strain: 52 },
    { time: '20:45', water: 2.1, strain: 74 },
    { time: '21:00', water: simState?.flood_water_level || 2.4, strain: 82 }
  ];

  return (
    <div className="p-6 space-y-6 overflow-y-auto max-h-screen bg-[#0B1220]">
      {/* Top Banner: Incident Situation Card */}
      <div className="panel-card p-5 border-[#FF8A24]/30 bg-gradient-to-r from-[#172438] via-[#111C2D] to-[#1F1833] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#FF8A24]/15 border border-[#FF8A24]/40 flex items-center justify-center text-2xl shrink-0 shadow-lg shadow-[#FF8A24]/10">
            🎃
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-[#FF8A24] uppercase tracking-wider">
                NORTH HAVEN COASTAL SECTOR
              </span>
              <span className="px-2 py-0.2 rounded text-[10px] bg-[#FF4D5D]/15 border border-[#FF4D5D]/50 text-[#FF4D5D] font-mono font-bold">
                CRITICAL FLOOD SURGE
              </span>
            </div>
            <h1 className="text-xl font-black text-white mt-1">
              {disaster?.name || 'Halloween Night Gale & Coastal Surge'}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Intelligent multi-drone swarm deployed for aerial search, shelter risk monitoring, and emergency supply drops.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => onNavigate('terrain')}
            className="flex items-center gap-2 py-2 px-4 rounded-xl bg-gradient-to-r from-[#FF8A24] to-[#A855F7] hover:brightness-110 text-white font-extrabold text-xs shadow-lg shadow-[#FF8A24]/20 transition-all border border-[#FF8A24]/40 cursor-pointer"
            title="Open Tactical Terrain Flight Map"
          >
            <Compass className="w-3.5 h-3.5 text-amber-200" />
            <span>Tactical Terrain Map</span>
          </button>
          <button
            onClick={() => onNavigate('simulator')}
            className="flex items-center gap-1.5 py-2 px-3.5 rounded-xl bg-[#111C2D] hover:bg-[#172438] text-slate-200 text-xs font-bold transition-colors cursor-pointer border border-[#22354E]"
          >
            <span>Full 3D Sim</span>
            <ChevronRight className="w-4 h-4 text-[#FF8A24]" />
          </button>
        </div>
      </div>

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Active Drones */}
        <div
          onClick={() => onNavigate('fleet')}
          className="panel-card p-4 hover:border-[#35D6F2]/50 cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-mono uppercase tracking-wider">Fleet Status</span>
            <Compass className="w-4 h-4 text-[#35D6F2]" />
          </div>
          <div className="text-2xl font-black text-white mt-2 font-mono">
            {drones.length} <span className="text-xs text-slate-500 font-normal">Drones</span>
          </div>
          <div className="text-[10px] text-[#35D6F2] font-mono mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
            <span>{activeDrones.length > 0 ? `${activeDrones.length} in Flight` : 'All Standby'}</span>
          </div>
        </div>

        {/* People Detected */}
        <div
          onClick={() => onNavigate('detection')}
          className="panel-card p-4 hover:border-[#FF8A24]/50 cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-mono uppercase tracking-wider">People Located</span>
            <Users className="w-4 h-4 text-[#FF8A24]" />
          </div>
          <div className="text-2xl font-black text-white mt-2 font-mono">
            {peopleDetected} <span className="text-xs text-slate-500 font-normal">/ {totalPeopleAtRisk}</span>
          </div>
          <div className="text-[10px] text-[#FF8A24] font-mono mt-1">
            {peopleDetected > 0 ? 'FLIR/RGB Confirmed' : 'Recon Sweeps Active'}
          </div>
        </div>

        {/* Active Missions */}
        <div
          onClick={() => onNavigate('relief')}
          className="panel-card p-4 hover:border-[#A855F7]/50 cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-mono uppercase tracking-wider">Missions</span>
            <Activity className="w-4 h-4 text-[#A855F7]" />
          </div>
          <div className="text-2xl font-black text-white mt-2 font-mono">
            {inProgressMissions.length} <span className="text-xs text-slate-500 font-normal">In Flight</span>
          </div>
          <div className="text-[10px] text-purple-300 font-mono mt-1">
            {completedMissions.length} Completed Missions
          </div>
        </div>

        {/* Critical Alerts */}
        <div
          onClick={() => onNavigate('rescue')}
          className="panel-card p-4 hover:border-[#FF4D5D]/50 cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-mono uppercase tracking-wider">Critical Alerts</span>
            <AlertTriangle className="w-4 h-4 text-[#FF4D5D]" />
          </div>
          <div className="text-2xl font-black text-[#FF4D5D] mt-2 font-mono">
            {alerts.filter(a => a.level === 'critical' && !a.acknowledged).length}
          </div>
          <div className="text-[10px] text-[#FF4D5D] font-mono mt-1">
            Requires EOC Review
          </div>
        </div>

        {/* Flood Level */}
        <div
          onClick={() => onNavigate('simulator')}
          className="panel-card p-4 hover:border-[#35D6F2]/50 cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-mono uppercase tracking-wider">Flood Water</span>
            <Waves className="w-4 h-4 text-[#35D6F2]" />
          </div>
          <div className="text-2xl font-black text-white mt-2 font-mono">
            {simState?.flood_water_level?.toFixed(2) || '1.20'}m
          </div>
          <div className="text-[10px] text-[#35D6F2] font-mono mt-1">
            Peak Storm Elevation
          </div>
        </div>

        {/* High Risk Shelters */}
        <div
          onClick={() => onNavigate('shelters')}
          className="panel-card p-4 hover:border-[#FF8A24]/50 cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-mono uppercase tracking-wider">At-Risk Shelters</span>
            <ShieldAlert className="w-4 h-4 text-[#FF8A24]" />
          </div>
          <div className="text-2xl font-black text-white mt-2 font-mono">
            {highRiskShelters.length} <span className="text-xs text-slate-500 font-normal">/ {shelters.length}</span>
          </div>
          <div className="text-[10px] text-amber-400 font-mono mt-1">
            {highRiskShelters.length > 0 ? 'Relocation Active' : 'All Clear'}
          </div>
        </div>
      </div>

      {/* Main Grid: 3D Scene Viewport & Drone Battery / Operational Streams */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 3D Village Preview Window */}
        <div className="lg:col-span-2 panel-card p-4 flex flex-col h-[450px]">
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#35D6F2] animate-ping" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-white font-mono">
                Real-Time 3D Village Telemetry Viewport
              </h2>
            </div>
            <button
              onClick={() => onNavigate('simulator')}
              className="text-xs text-[#FF8A24] hover:text-[#FF8A24]/80 font-mono flex items-center gap-1.5 cursor-pointer"
            >
              <span>Full Interactive Simulator</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 rounded-xl overflow-hidden relative border border-[#22354E]">
            <FloodScene3D
              buildings={simState?.buildings || []}
              drones={drones}
              requests={requests}
              peopleClusters={peopleClusters}
              missions={missions}
              floodLevel={simState?.flood_water_level || 1.2}
              onSelectBuilding={() => onNavigate('shelters')}
              onSelectDrone={() => onNavigate('fleet')}
            />
          </div>
        </div>

        {/* Fleet Battery Endurance & Shelter Risk Preview */}
        <div className="space-y-4 flex flex-col">
          {/* Fleet Battery Monitor */}
          <div className="panel-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-2">
                <Battery className="w-4 h-4 text-[#10B981]" />
                <span>Drone Fleet Battery Monitoring</span>
              </h2>
              <button
                onClick={() => onNavigate('fleet')}
                className="text-[11px] text-[#FF8A24] hover:underline font-mono cursor-pointer"
              >
                Fleet View
              </button>
            </div>

            <div className="space-y-2.5">
              {drones.map((drone) => {
                const isLow = drone.battery < 25;
                return (
                  <div key={drone.id} className="p-2.5 rounded-xl bg-[#111C2D] border border-[#22354E]">
                    <div className="flex items-center justify-between text-xs font-mono mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{drone.name}</span>
                        <span className="text-[10px] text-[#FF8A24] capitalize font-semibold">{drone.status}</span>
                      </div>
                      <span className={`font-bold ${isLow ? 'text-[#FF4D5D]' : 'text-[#10B981]'}`}>
                        {Math.round(drone.battery)}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-[#172438] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isLow ? 'bg-[#FF4D5D]' : 'bg-[#10B981]'
                        }`}
                        style={{ width: `${drone.battery}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Shelter Risk Overview */}
          <div className="panel-card p-5 flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-[#FF8A24]" />
                <span>Shelter Vulnerability Overview</span>
              </h2>
              <button
                onClick={() => onNavigate('shelters')}
                className="text-[11px] text-[#FF8A24] hover:underline font-mono cursor-pointer"
              >
                Details
              </button>
            </div>

            <div className="space-y-2 flex-1">
              {shelters.slice(0, 3).map((shelter) => {
                const score = shelter.current_assessment?.risk_score || 0;
                const isCritical = score >= 80;
                return (
                  <div
                    key={shelter.id}
                    className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                      isCritical
                        ? 'bg-[#FF4D5D]/10 border-[#FF4D5D]/50 text-white'
                        : 'bg-[#111C2D] border-[#22354E] text-slate-300'
                    }`}
                  >
                    <div>
                      <div className="font-bold leading-tight">{shelter.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        Occupancy: {shelter.current_occupancy} / {shelter.capacity}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`font-mono font-bold text-sm ${isCritical ? 'text-[#FF4D5D]' : 'text-[#FF8A24]'}`}>
                        {score}/100
                      </span>
                      <span className="block text-[9px] font-mono text-slate-400 uppercase">
                        {shelter.current_assessment?.risk_level || 'Normal'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Grid: Flood Elevation Chart & Live Activity Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Flood Depth & Shelter Strain Timeline Chart */}
        <div className="panel-card p-5 h-72 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
              Storm Surge Tide & Infrastructure Strain Curve
            </h2>
            <span className="text-[10px] font-mono text-[#35D6F2]">Simulated Hydrograph</span>
          </div>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={floodTrendData}>
                <defs>
                  <linearGradient id="floodGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#35D6F2" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#35D6F2" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="strainGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF8A24" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#FF8A24" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#22354E" />
                <XAxis dataKey="time" stroke="#64748B" fontSize={11} />
                <YAxis stroke="#64748B" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#172438', borderColor: '#22354E', fontSize: '11px', borderRadius: '10px' }}
                />
                <Area type="monotone" dataKey="water" stroke="#35D6F2" fillOpacity={1} fill="url(#floodGrad)" name="Flood Depth (m)" />
                <Area type="monotone" dataKey="strain" stroke="#FF8A24" fillOpacity={1} fill="url(#strainGrad)" name="Vulnerability Index" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Live Operational Incident Timeline */}
        <div className="panel-card p-5 h-72 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
              Live Activity Timeline & Incident Log
            </h2>
            <span className="text-[10px] font-mono text-[#10B981]">Real-time Feed</span>
          </div>

          <div className="space-y-3 overflow-y-auto pr-1 flex-1">
            <div className="flex items-start gap-3 text-xs">
              <span className="w-2 h-2 rounded-full bg-[#FF4D5D] mt-1.5 shrink-0" />
              <div>
                <span className="font-bold text-white">SHELTER-01 Access Road Submerged</span>
                <p className="text-slate-400 text-[11px]">Water breached 1.6m elevation line along North Canal. Evac diversion advised.</p>
                <span className="text-[9px] font-mono text-slate-500">2 mins ago • Shelter Engine</span>
              </div>
            </div>

            <div className="flex items-start gap-3 text-xs">
              <span className="w-2 h-2 rounded-full bg-[#10B981] mt-1.5 shrink-0" />
              <div>
                <span className="font-bold text-white">LIFELINE-CHARLIE Supply Drop Verified</span>
                <p className="text-slate-400 text-[11px]">Delivered 4.5kg hydration canisters to stranded rooftop party at Fisherman Pier.</p>
                <span className="text-[9px] font-mono text-slate-500">8 mins ago • Relief Logistics</span>
              </div>
            </div>

            <div className="flex items-start gap-3 text-xs">
              <span className="w-2 h-2 rounded-full bg-[#35D6F2] mt-1.5 shrink-0" />
              <div>
                <span className="font-bold text-white">SCOUT-ALPHA Crowd Signature Confirmed</span>
                <p className="text-slate-400 text-[11px]">Computer vision detected 25 residents clustered on elevated bungalow roof in Zone 3.</p>
                <span className="text-[9px] font-mono text-slate-500">14 mins ago • Vision AI</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tactical AWS Cloud & IoT Core Live Telemetry Footer */}
      <div className="panel-card p-3.5 flex flex-wrap items-center justify-between gap-4 border border-[#22354E] bg-[#0A101D]/95 font-mono text-xs shadow-2xl">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#10B981]/15 border border-[#10B981]/40 text-[#10B981]">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#10B981]"></span>
            </span>
            <span className="font-extrabold tracking-wider">AWS IoT Core: CONNECTED (MQTT)</span>
          </div>

          <span className="text-slate-600 hidden sm:inline">|</span>

          <div className="flex items-center gap-2 text-slate-300 text-[11px]">
            <Radio className="w-3.5 h-3.5 text-[#35D6F2] animate-pulse" />
            <span className="text-slate-400">Live Topics:</span>
            <code className="text-[#35D6F2] bg-[#111C2D] px-2 py-0.5 rounded border border-[#22354E]">resqfly/telemetry/scout-alpha</code>
            <code className="text-[#FF7518] bg-[#111C2D] px-2 py-0.5 rounded border border-[#22354E]">resqfly/alerts/emergency</code>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#35D6F2]" />
            <span>DynamoDB: <strong className="text-white">resqfly_telemetry & resqfly_missions</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Region:</span>
            <strong className="text-[#FF7518]">us-east-1</strong>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Rate:</span>
            <strong className="text-[#10B981]">1 Hz Drone Stream</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
