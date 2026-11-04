import React, { useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Waves,
  Eye,
  ShieldAlert,
  Users,
  Compass,
  Zap,
  Info,
  X,
  Maximize2,
  Minimize2,
  Camera,
  Layers,
  Send,
  Sliders,
  ChevronRight
} from 'lucide-react';
import FloodScene3D from '../components/FloodScene3D';
import {
  setFloodLevel,
  startSimulation,
  pauseSimulation,
  resetSimulation,
  launchDrone,
  createEmergencyRequest
} from '../api/client';

export default function SimulatorScreen({
  simState,
  drones = [],
  shelters = [],
  requests = [],
  peopleClusters = [],
  missions = [],
  onStateRefresh
}) {
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [showRoutes, setShowRoutes] = useState(true);
  const [showPeople, setShowPeople] = useState(true);
  const [showRiskZones, setShowRiskZones] = useState(true);
  const [cameraPreset, setCameraPreset] = useState('default'); // 'default' | 'top' | 'cinematic' | 'drone'
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [waterSlider, setWaterSlider] = useState(simState?.flood_water_level || 1.2);
  const [isUpdating, setIsUpdating] = useState(false);
  const [lightingTheme, setLightingTheme] = useState('dark_night'); // 'dark_night' | 'daylight_overcast'

  const handleWaterChange = async (newVal) => {
    setWaterSlider(newVal);
    setIsUpdating(true);
    await setFloodLevel(parseFloat(newVal));
    setIsUpdating(false);
    onStateRefresh && onStateRefresh();
  };

  const handleTogglePlay = async () => {
    if (simState?.is_running) {
      await pauseSimulation();
    } else {
      await startSimulation();
    }
    onStateRefresh && onStateRefresh();
  };

  const handleReset = async () => {
    await resetSimulation();
    setWaterSlider(1.2);
    setSelectedEntity(null);
    setCameraPreset('default');
    onStateRefresh && onStateRefresh();
  };

  const handleSpawnRequest = async () => {
    await createEmergencyRequest({
      location_name: `Coastal Sector Rooftop #${Math.floor(Math.random() * 80) + 10}`,
      position: {
        x: (Math.random() - 0.5) * 160,
        y: 2.0,
        z: (Math.random() - 0.5) * 160
      },
      affected_people_count: Math.floor(Math.random() * 8) + 2,
      water_req_liters: 12,
      food_req_packs: 10,
      medical_urgency: 'high',
      vulnerable_persons: true,
      shelter_status: 'isolated_rooftop'
    });
    onStateRefresh && onStateRefresh();
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  const activeDronesCount = drones.filter(d => d.status !== 'idle' && d.status !== 'landed').length;
  const strandedCount = peopleClusters.reduce((acc, c) => acc + c.count, 0);

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col relative select-none bg-[#0B1220] overflow-hidden">
      {/* Top Floating Command HUD Bar */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        {/* Left Floating Controls */}
        <div className="flex items-center gap-2 pointer-events-auto bg-[#111C2D]/90 backdrop-blur-md p-1.5 rounded-2xl border border-[#22354E] shadow-xl">
          <button
            onClick={handleTogglePlay}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              simState?.is_running
                ? 'bg-[#FF8A24]/20 border border-[#FF8A24]/50 text-[#FF8A24]'
                : 'bg-[#10B981]/20 border border-[#10B981]/50 text-[#10B981]'
            }`}
          >
            {simState?.is_running ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{simState?.is_running ? 'Pause Sim' : 'Resume Sim'}</span>
          </button>

          <button
            onClick={handleReset}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#172438] border border-[#22354E] hover:border-[#FF8A24]/40 text-slate-300 text-xs font-mono transition-colors cursor-pointer"
            title="Reset Simulation State"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#FF8A24]" />
            <span className="hidden sm:inline">Reset</span>
          </button>

          <button
            onClick={handleSpawnRequest}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FF4D5D]/20 border border-[#FF4D5D]/50 hover:bg-[#FF4D5D]/30 text-[#FF4D5D] text-xs font-bold transition-colors cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>+ Spawn SOS</span>
          </button>
        </div>

        {/* Center Floating Flood Gauge Slider */}
        <div className="flex items-center gap-3 bg-[#111C2D]/90 backdrop-blur-md px-4 py-2 rounded-2xl border border-[#22354E] shadow-xl pointer-events-auto">
          <Waves className="w-4 h-4 text-[#35D6F2] animate-pulse shrink-0" />
          <span className="text-slate-400 text-xs font-mono">Flood Level:</span>
          <input
            type="range"
            min="0.0"
            max="6.0"
            step="0.1"
            value={waterSlider}
            onChange={(e) => handleWaterChange(e.target.value)}
            className="w-32 accent-[#FF8A24] cursor-pointer"
          />
          <span className="text-xs font-mono font-black text-[#35D6F2] w-14 text-right">
            {parseFloat(waterSlider).toFixed(1)}m
          </span>
        </div>

        {/* Right Floating Camera Views & Fullscreen */}
        <div className="flex items-center gap-1.5 bg-[#111C2D]/90 backdrop-blur-md p-1.5 rounded-2xl border border-[#22354E] shadow-xl pointer-events-auto">
          <span className="text-[10px] font-mono text-slate-400 uppercase px-2 hidden md:inline">Camera:</span>
          <button
            onClick={() => setCameraPreset('default')}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
              cameraPreset === 'default'
                ? 'bg-[#172438] text-[#FF8A24] border border-[#FF8A24]/50 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Tactical
          </button>
          <button
            onClick={() => setCameraPreset('cinematic')}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
              cameraPreset === 'cinematic'
                ? 'bg-[#172438] text-[#FF8A24] border border-[#FF8A24]/50 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Cinematic
          </button>
          <button
            onClick={() => setCameraPreset('top')}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
              cameraPreset === 'top'
                ? 'bg-[#172438] text-[#FF8A24] border border-[#FF8A24]/50 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Overhead
          </button>

          <div className="h-4 w-[1px] bg-[#22354E] mx-1" />

          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#172438] transition-colors cursor-pointer"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 3D Scene Viewport */}
      <div className="flex-1 relative">
        <FloodScene3D
          buildings={simState?.buildings || []}
          drones={drones}
          requests={requests}
          peopleClusters={peopleClusters}
          missions={missions}
          floodLevel={parseFloat(waterSlider)}
          onSelectBuilding={(b) => setSelectedEntity({ type: 'building', data: b })}
          onSelectDrone={(d) => setSelectedEntity({ type: 'drone', data: d })}
          showRoutes={showRoutes}
          showPeople={showPeople}
          showRiskZones={showRiskZones}
          cameraPreset={cameraPreset}
          lightingTheme={lightingTheme}
        />

        {/* Viewport Toggles (Bottom Left Floating Pill) */}
        <div className="absolute bottom-4 left-4 z-20 flex flex-wrap gap-2 pointer-events-auto bg-[#111C2D]/90 backdrop-blur-md p-1.5 rounded-2xl border border-[#22354E] shadow-xl">
          <button
            onClick={() => setShowPeople(!showPeople)}
            className={`px-3 py-1 rounded-xl text-xs font-mono transition-all cursor-pointer ${
              showPeople
                ? 'bg-[#35D6F2]/15 border border-[#35D6F2]/50 text-[#35D6F2] font-bold'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            People SOS: {showPeople ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={() => setShowRoutes(!showRoutes)}
            className={`px-3 py-1 rounded-xl text-xs font-mono transition-all cursor-pointer ${
              showRoutes
                ? 'bg-[#A855F7]/15 border border-[#A855F7]/50 text-[#A855F7] font-bold'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Flight Corridors: {showRoutes ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={() => setShowRiskZones(!showRiskZones)}
            className={`px-3 py-1 rounded-xl text-xs font-mono transition-all cursor-pointer ${
              showRiskZones
                ? 'bg-[#FF4D5D]/15 border border-[#FF4D5D]/50 text-[#FF4D5D] font-bold'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Risk Contours: {showRiskZones ? 'ON' : 'OFF'}
          </button>
        </div>

        {/* Live Swarm Telemetry Floating Pill (Bottom Right) */}
        <div className="absolute bottom-4 right-4 z-20 flex items-center gap-3 bg-[#111C2D]/90 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-[#22354E] shadow-xl text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
            <span className="text-slate-400">Fleet Active:</span>
            <span className="font-bold text-white">{activeDronesCount} / {drones.length}</span>
          </div>
          <div className="h-3 w-[1px] bg-[#22354E]" />
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-[#35D6F2]" />
            <span className="text-slate-400">Stranded Residents:</span>
            <span className="font-bold text-[#35D6F2]">{strandedCount}</span>
          </div>
        </div>

        {/* Selected Entity Inspection Drawer (Floating Right Panel) */}
        {selectedEntity && (
          <div className="absolute top-20 right-4 w-84 bg-[#172438]/95 backdrop-blur-xl rounded-2xl p-4 border border-[#22354E] z-30 shadow-2xl animate-in fade-in slide-in-from-right-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#22354E] mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">
                  {selectedEntity.type === 'drone' ? '🛸' : '🏚️'}
                </span>
                <span className="text-xs font-mono font-bold text-[#FF8A24] uppercase">
                  {selectedEntity.type === 'drone' ? 'Drone Telemetry' : 'Building Status'}
                </span>
              </div>
              <button
                onClick={() => setSelectedEntity(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {selectedEntity.type === 'drone' ? (
              <div className="space-y-3 text-xs">
                <div>
                  <h3 className="text-sm font-black text-white">{selectedEntity.data.name}</h3>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">{selectedEntity.data.role}</p>
                </div>

                <div className="p-3 rounded-xl bg-[#111C2D] border border-[#22354E] space-y-2 font-mono text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Battery Level:</span>
                    <span className="text-[#10B981] font-bold">{Math.round(selectedEntity.data.battery)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Flight Altitude:</span>
                    <span className="text-[#35D6F2] font-bold">{selectedEntity.data.altitude.toFixed(1)}m</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Air Speed:</span>
                    <span className="text-slate-200">{selectedEntity.data.speed} m/s</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Current Payload:</span>
                    <span className="text-[#FF8A24] font-bold">
                      {selectedEntity.data.current_payload_kg} / {selectedEntity.data.max_payload_kg} kg
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Operational Status:</span>
                    <span className="text-[#FF8A24] font-bold uppercase">{selectedEntity.data.status}</span>
                  </div>
                </div>

                <button
                  disabled={selectedEntity.data.status === 'flying'}
                  onClick={async () => {
                    await launchDrone(selectedEntity.data.id);
                    onStateRefresh && onStateRefresh();
                  }}
                  className={`w-full py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    selectedEntity.data.status === 'flying'
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-[#FF8A24] hover:bg-[#FF8A24]/90 text-slate-950 font-extrabold shadow-lg'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>{selectedEntity.data.status === 'flying' ? 'In Flight' : 'Launch Drone'}</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div>
                  <h3 className="text-sm font-black text-white">{selectedEntity.data.name}</h3>
                  <p className="text-[11px] text-[#FF8A24] font-mono mt-0.5 uppercase">{selectedEntity.data.type}</p>
                </div>

                <div className="p-3 rounded-xl bg-[#111C2D] border border-[#22354E] space-y-2 font-mono text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Ground Elevation:</span>
                    <span className="text-slate-200 font-bold">{selectedEntity.data.y.toFixed(1)}m</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Flood Inundation:</span>
                    <span className={selectedEntity.data.is_flooded ? 'text-[#FF4D5D] font-bold' : 'text-[#10B981]'}>
                      {selectedEntity.data.is_flooded
                        ? `+${selectedEntity.data.flood_depth_m.toFixed(1)}m (Submerged)`
                        : 'Dry (Above Waterline)'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Shelter Occupancy:</span>
                    <span className="text-[#35D6F2] font-bold">{selectedEntity.data.residents_count} Persons</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
