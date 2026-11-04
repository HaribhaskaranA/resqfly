import React, { useState } from 'react';
import {
  Compass,
  Battery,
  Zap,
  Radio,
  MapPin,
  Package,
  Clock,
  Shield,
  Activity,
  Send,
  CloudLightning,
  Eye,
  ShieldAlert,
  PackageCheck,
  LifeBuoy,
  Anchor,
  Navigation
} from 'lucide-react';
import { launchDrone } from '../api/client';

const STANDARD_DRONE_NAMES = {
  'DRONE-01': 'Drone Alpha • Thermal Recon & Search Scanner',
  'DRONE-02': 'Drone Bravo • Flood Surveillance & Depth Altimetry',
  'DRONE-03': 'Drone Charlie • Emergency Supply & Relief Cargo',
  'DRONE-04': 'Drone Delta • Tactical Mesh & Communications Relay'
};

const WATERCRAFT_FLEET = [
  {
    id: 'BOAT-01',
    callsign: 'RESCUE UNIT-01 [ALPHA WATERCRAFT SQUAD] • Rapid Inundation Response',
    type: 'High-Speed Inshore Rescue Craft (IRC)',
    status: 'deployed',
    speed: '28 knots',
    capacity: '8 Survivors + 2 Crew',
    engine: 'Twin 60HP Marine Outboards',
    sector: 'Sector 1: Coastal Canal Bridge (41.3850° N, -70.5280° W)',
    assigned_mission: 'Victim Extraction & Flotation Deployment'
  },
  {
    id: 'BOAT-02',
    callsign: 'RESCUE UNIT-02 [BRAVO AMPHIBIOUS TEAM] • Shallow Water Evacuation',
    type: 'Rigid-Hull Inflatable Boat (RHIB)',
    status: 'on_standby',
    speed: '22 knots',
    capacity: '6 Survivors + 2 Crew',
    engine: '40HP Shallow-Draft Jet Drive',
    sector: 'Sector 2: Low-Lying Marsh & School Access Road (41.3835° N, -70.5295° W)',
    assigned_mission: 'Shallow Inundation & Debris Extraction'
  },
  {
    id: 'AIR-03',
    callsign: 'AIR-SUPPORT [LIFELINE-CHARLIE] • Drone Airdrop Cargo Unit',
    type: 'Heavy-Lift Autonomous Cargo Drone (Payload: 15kg)',
    status: 'en_route',
    speed: '45 km/h aerial cruise',
    capacity: 'Hydration Packs + Trauma Kits + Satellite Beacon',
    engine: 'Octocopter Electric Drive (AWS IoT Monitored)',
    sector: 'Sector 3: Isolated Rooftops & Pier #14 (41.3862° N, -70.5270° W)',
    assigned_mission: 'Airdrop Emergency Rations & Medical Lifeline'
  }
];

export default function FleetScreen({ drones = [], missions = [], onStateRefresh }) {
  const [selectedDroneId, setSelectedDroneId] = useState(drones[0]?.id || 'DRONE-01');

  const selectedDrone = drones.find(d => d.id === selectedDroneId) || drones[0];

  const handleLaunch = async (droneId) => {
    await launchDrone(droneId);
    onStateRefresh && onStateRefresh();
  };

  const getDroneIcon = (category) => {
    switch (category) {
      case 'scout': return <Eye className="w-5 h-5 text-[#35D6F2]" />;
      case 'guardian': return <ShieldAlert className="w-5 h-5 text-[#FF8A24]" />;
      case 'lifeline': return <PackageCheck className="w-5 h-5 text-[#10B981]" />;
      case 'relay': return <Radio className="w-5 h-5 text-[#A855F7]" />;
      default: return <Compass className="w-5 h-5 text-slate-300" />;
    }
  };

  return (
    <div className="p-6 space-y-6 overflow-y-auto max-h-screen bg-[#0B1220]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-white flex items-center gap-2.5">
            <Compass className="w-5 h-5 text-[#FF8A24]" />
            <span>Autonomous Multi-Drone Fleet Management</span>
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Mission dispatch, real-time battery monitoring, payload capacity, and AWS IoT Core MQTT streams.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono px-3.5 py-1.5 rounded-xl bg-[#172438] border border-[#22354E]">
          <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
          <span className="text-slate-300">Fleet Link: Active (4/4 Drones Online)</span>
        </div>
      </div>

      {/* 4 Specialized Drone Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {drones.map((drone) => {
          const isSelected = drone.id === selectedDroneId;
          const isLow = drone.battery < 25.0;

          return (
            <div
              key={drone.id}
              onClick={() => setSelectedDroneId(drone.id)}
              className={`panel-card p-5 cursor-pointer relative overflow-hidden transition-all ${
                isSelected
                  ? 'border-[#FF8A24] shadow-xl shadow-[#FF8A24]/15'
                  : 'hover:border-slate-700'
              }`}
            >
              {/* Category Glow Line */}
              <div
                className="absolute top-0 left-0 right-0 h-1"
                style={{
                  backgroundColor:
                    drone.category === 'scout' ? '#35D6F2' :
                    drone.category === 'guardian' ? '#FF8A24' :
                    drone.category === 'lifeline' ? '#10B981' : '#A855F7'
                }}
              />

              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-[#111C2D] border border-[#22354E]">
                    {getDroneIcon(drone.category)}
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">
                      {drone.id}
                    </span>
                    <h2 className="text-xs font-black text-white leading-tight">
                      {STANDARD_DRONE_NAMES[drone.id] || drone.name}
                    </h2>
                  </div>
                </div>

                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                  drone.status === 'flying'
                    ? 'bg-[#35D6F2]/15 text-[#35D6F2] border border-[#35D6F2]/40 animate-pulse'
                    : drone.status === 'idle'
                    ? 'bg-slate-800 text-slate-300'
                    : 'bg-[#FF8A24]/15 text-[#FF8A24] border border-[#FF8A24]/40'
                }`}>
                  {drone.status}
                </span>
              </div>

              <p className="text-[11px] text-slate-300 font-mono min-h-[32px] leading-snug">
                {drone.role}
              </p>

              {/* Battery Meter */}
              <div className="mt-4 pt-3 border-t border-[#22354E]">
                <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Battery className="w-3.5 h-3.5" />
                    Battery:
                  </span>
                  <span className={`font-bold ${isLow ? 'text-[#FF4D5D]' : 'text-[#10B981]'}`}>
                    {Math.round(drone.battery)}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-[#111C2D] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isLow ? 'bg-[#FF4D5D]' : 'bg-[#10B981]'
                    }`}
                    style={{ width: `${drone.battery}%` }}
                  />
                </div>
              </div>

              {/* Payload & Speed */}
              <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-[#22354E] text-[11px] font-mono">
                <div>
                  <span className="text-slate-500 block text-[9px] uppercase">Payload Cap</span>
                  <span className="text-slate-200 font-bold">{drone.max_payload_kg} kg</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px] uppercase">Air Speed</span>
                  <span className="text-slate-200 font-bold">{drone.speed} m/s</span>
                </div>
              </div>

              {/* Launch Action */}
              <div className="mt-4">
                <button
                  disabled={drone.status === 'flying' || drone.battery < 20.0}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLaunch(drone.id);
                  }}
                  className={`w-full py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    drone.status === 'flying'
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-[#FF8A24] hover:bg-[#FF8A24]/90 text-slate-950 font-black shadow-md shadow-[#FF8A24]/20'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>{drone.status === 'flying' ? 'Mission Active' : 'Launch Drone'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Drone Telemetry Deep Dive & AWS IoT MQTT Inspector */}
      {selectedDrone && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Telemetry Deep Dive */}
          <div className="lg:col-span-2 panel-card p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-[#22354E] pb-3">
              <div>
                <span className="text-xs font-mono text-[#FF8A24] uppercase font-bold">
                  {selectedDrone.id} • Real-Time Swarm Telemetry
                </span>
                <h2 className="text-xl font-black text-white">{selectedDrone.name}</h2>
              </div>
              <span className="px-3 py-1 rounded-xl text-xs font-mono bg-[#35D6F2]/10 text-[#35D6F2] border border-[#35D6F2]/40 font-bold">
                Radio Signal: {selectedDrone.signal_strength}% Link Quality
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-3.5 rounded-xl bg-[#111C2D] border border-[#22354E]">
                <span className="text-slate-500 block text-[10px] uppercase">Coordinate X</span>
                <span className="text-white text-base font-bold">{selectedDrone.position.x.toFixed(1)}m</span>
              </div>
              <div className="p-3.5 rounded-xl bg-[#111C2D] border border-[#22354E]">
                <span className="text-slate-500 block text-[10px] uppercase">Coordinate Z</span>
                <span className="text-white text-base font-bold">{selectedDrone.position.z.toFixed(1)}m</span>
              </div>
              <div className="p-3.5 rounded-xl bg-[#111C2D] border border-[#22354E]">
                <span className="text-slate-500 block text-[10px] uppercase">Flight Altitude</span>
                <span className="text-[#35D6F2] text-base font-bold">{selectedDrone.altitude.toFixed(1)}m</span>
              </div>
              <div className="p-3.5 rounded-xl bg-[#111C2D] border border-[#22354E]">
                <span className="text-slate-500 block text-[10px] uppercase">Current Cargo</span>
                <span className="text-[#FF8A24] text-base font-bold">{selectedDrone.current_payload_kg.toFixed(1)} kg</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#111C2D] border border-[#22354E] text-xs">
              <h3 className="text-xs font-bold text-slate-200 uppercase font-mono mb-1.5 flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-[#FF8A24]" />
                <span>Specialized Mission Profile & Capabilities</span>
              </h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                {selectedDrone.category === 'scout' && 'Equipped with dual FLIR thermal and 4K optical sensors optimized for crowd detection and non-line-of-sight thermal silhouette identification.'}
                {selectedDrone.category === 'guardian' && 'Equipped with LiDAR water level altimeters and structural vibration acoustic sensors to assess building stress and perimeter inundation.'}
                {selectedDrone.category === 'lifeline' && 'Reinforced carbon-fiber cargo bay with automatic tether winch to deliver emergency water canisters, rations, and trauma medical bags.'}
                {selectedDrone.category === 'relay' && 'High-bandwidth mesh telecommunications repeater maintaining continuous command-link across flooded coastal terrain.'}
              </p>
            </div>
          </div>

          {/* AWS IoT Core MQTT Live Stream Viewer */}
          <div className="panel-card p-6 flex flex-col">
            <div className="flex items-center justify-between mb-3 border-b border-[#22354E] pb-2">
              <div className="flex items-center gap-2">
                <CloudLightning className="w-4 h-4 text-[#35D6F2]" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
                  AWS IoT Core MQTT Inspector
                </h2>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">QoS 1</span>
            </div>

            <div className="text-[11px] font-mono text-[#35D6F2] mb-2 truncate">
              Topic: resqfly/drone/{selectedDrone.id.toLowerCase()}/telemetry
            </div>

            <div className="flex-1 bg-[#0B1220] rounded-xl p-3 border border-[#22354E] font-mono text-[11px] text-[#10B981] overflow-x-auto overflow-y-auto max-h-60">
              <pre>{JSON.stringify({
                drone_id: selectedDrone.id,
                name: selectedDrone.name,
                category: selectedDrone.category,
                battery: selectedDrone.battery,
                position: selectedDrone.position,
                altitude: selectedDrone.altitude,
                speed: selectedDrone.speed,
                status: selectedDrone.status,
                signal_strength: selectedDrone.signal_strength,
                timestamp: selectedDrone.last_telemetry_ts || new Date().toISOString()
              }, null, 2)}</pre>
            </div>
          </div>
        </div>
      )}

      {/* Ground & Watercraft Rescue Fleet (Uniform Tagging: RESCUE FLEET • ...) */}
      <div className="panel-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#22354E] pb-3">
          <div className="flex items-center gap-2.5">
            <Anchor className="w-5 h-5 text-[#35D6F2]" />
            <div>
              <h2 className="text-base font-black text-white">Amphibious & Watercraft Emergency Response Fleet</h2>
              <p className="text-[11px] text-slate-400 font-mono">
                Coordinated ground/water evacuation assets operating under standard unified callsigns.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono px-3 py-1 rounded-xl bg-[#35D6F2]/10 text-[#35D6F2] border border-[#35D6F2]/30 font-bold">
            3 Surface Vessels Assigned
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {WATERCRAFT_FLEET.map((boat) => (
            <div
              key={boat.id}
              className="p-4 rounded-2xl bg-[#111C2D] border border-[#22354E] hover:border-[#35D6F2]/50 transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono text-slate-500 font-bold uppercase">{boat.id}</span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                  boat.status === 'deployed'
                    ? 'bg-[#FF4D5D]/20 text-[#FF4D5D] border border-[#FF4D5D]/50 animate-pulse'
                    : boat.status === 'en_route'
                    ? 'bg-[#35D6F2]/15 text-[#35D6F2] border border-[#35D6F2]/40'
                    : 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30'
                }`}>
                  {boat.status.replace('_', ' ')}
                </span>
              </div>

              <h3 className="text-sm font-black text-white mb-1">{boat.callsign}</h3>
              <p className="text-[11px] text-slate-400 font-mono mb-3">{boat.type}</p>

              <div className="space-y-1.5 text-xs font-mono border-t border-[#22354E] pt-2.5">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-500">Target Sector:</span>
                  <span className="text-white font-bold truncate max-w-[150px]">{boat.sector}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-500">Capacity:</span>
                  <span className="text-slate-300">{boat.capacity}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-500">Propulsion:</span>
                  <span className="text-slate-300">{boat.engine}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-500">Max Speed:</span>
                  <span className="text-[#35D6F2] font-bold">{boat.speed}</span>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-[#22354E] text-[10px] font-mono text-slate-400 flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-[#FF8A24]" />
                <span>{boat.assigned_mission}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
