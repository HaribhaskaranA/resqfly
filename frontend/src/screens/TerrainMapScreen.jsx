import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Compass, Eye, ShieldAlert, PackageCheck, Radio,
  Play, Pause, RotateCcw, AlertTriangle, Users,
  Navigation, MapPin, Activity, Zap, CheckCircle2,
  LifeBuoy, Layers, ZoomIn, ZoomOut, Maximize2
} from 'lucide-react';
import { dispatchRescueMission } from '../api/client';

// Real Coastal Geographic Coordinates (North Haven Coastal Sector)
const BASE_COORDS = [41.3850, -70.5280];

// Real Survivor Target Coordinates on the Satellite Map
const SATELLITE_SURVIVORS = [
  {
    id: 'SURV-01',
    label: '4 Victims Stranded on Community School Rooftop',
    lat: 41.3824,
    lng: -70.5298,
    count: 4,
    urgency: 'CRITICAL',
    status: 'detected',
    heatSignature: '38.2°C (Cluster)',
    waterDepthM: 2.1,
    detectedBy: 'Drone Alpha'
  },
  {
    id: 'SURV-02',
    label: 'Isolated Family on Commercial Store Veranda',
    lat: 41.3872,
    lng: -70.5252,
    count: 3,
    urgency: 'HIGH',
    status: 'detected',
    heatSignature: '37.8°C',
    waterDepthM: 1.8,
    detectedBy: 'Drone Bravo'
  },
  {
    id: 'SURV-03',
    label: '2 Elderly Residents on Submerged Ground Porch',
    lat: 41.3842,
    lng: -70.5335,
    count: 2,
    urgency: 'CRITICAL',
    status: 'detected',
    heatSignature: '35.4°C (Hypothermic)',
    waterDepthM: 2.45,
    detectedBy: 'Drone Alpha'
  },
  {
    id: 'SURV-04',
    label: '5 Trapped Motorists on Causeway Ramp',
    lat: 41.3892,
    lng: -70.5238,
    count: 5,
    urgency: 'HIGH',
    status: 'detected',
    heatSignature: '38.0°C',
    waterDepthM: 1.6,
    detectedBy: 'Drone Charlie'
  }
];

// Realistic Flood Silt & Muddy Turbid Inundation Polygons (Realistic floodwater, NOT blue!)
const REALISTIC_FLOOD_ZONES = [
  // Low-lying coastal canal and inlet
  [
    [41.3800, -70.5360],
    [41.3830, -70.5340],
    [41.3855, -70.5310],
    [41.3840, -70.5270],
    [41.3815, -70.5290],
    [41.3790, -70.5320]
  ],
  // Submerged coastal marsh corridor
  [
    [41.3860, -70.5260],
    [41.3890, -70.5240],
    [41.3910, -70.5210],
    [41.3880, -70.5190],
    [41.3850, -70.5230]
  ]
];

export default function TerrainMapScreen({ drones = [], shelters = [], simState, onStateRefresh }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const trailsRef = useRef({});
  const survivorMarkersRef = useRef([]);

  const [selectedDrone, setSelectedDrone] = useState('DRONE-01');
  const [selectedSurvivor, setSelectedSurvivor] = useState(SATELLITE_SURVIVORS[0]);
  const [survivorList, setSurvivorList] = useState(SATELLITE_SURVIVORS);
  const [isPaused, setIsPaused] = useState(false);
  const [dispatchToast, setDispatchToast] = useState(null);
  const [tileStyle, setTileStyle] = useState('esri_satellite'); // 'esri_satellite' | 'hybrid' | 'dark'

  // Environmental Constant Flood Surge (Locked, cannot be manually controlled)
  const lockedSurgeDepth = 2.45; // meters

  // Swarm Drone Flight Physics & Orbits
  const dronesRef = useRef([
    {
      id: 'DRONE-01',
      name: 'Drone Alpha',
      role: 'Thermal Recon & Search Scanner',
      color: '#35D6F2',
      accent: '#0EA5E9',
      t: 0.1,
      speed: 0.0035,
      alt: 32,
      battery: 94,
      trail: [],
      centerLat: 41.3840,
      centerLng: -70.5285,
      radiusLat: 0.0032,
      radiusLng: 0.0045
    },
    {
      id: 'DRONE-02',
      name: 'Drone Bravo',
      role: 'Flood Surveillance & Depth Altimetry',
      color: '#FF8A24',
      accent: '#EA580C',
      t: 1.6,
      speed: 0.0030,
      alt: 42,
      battery: 91,
      trail: [],
      centerLat: 41.3865,
      centerLng: -70.5260,
      radiusLat: 0.0028,
      radiusLng: 0.0038
    },
    {
      id: 'DRONE-03',
      name: 'Drone Charlie',
      role: 'Emergency Supply & Relief Cargo',
      color: '#10B981',
      accent: '#059669',
      t: 3.2,
      speed: 0.0033,
      alt: 26,
      battery: 88,
      trail: [],
      centerLat: 41.3820,
      centerLng: -70.5250,
      radiusLat: 0.0035,
      radiusLng: 0.0042
    },
    {
      id: 'DRONE-04',
      name: 'Drone Delta',
      role: 'Tactical Mesh & Communications Relay',
      color: '#A855F7',
      accent: '#9333EA',
      t: 4.8,
      speed: 0.0022,
      alt: 65,
      battery: 96,
      trail: [],
      centerLat: 41.3855,
      centerLng: -70.5275,
      radiusLat: 0.0055,
      radiusLng: 0.0065
    }
  ]);

  // Initialize Interactive Leaflet Satellite Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // High resolution Esri World Imagery (Real High-Altitude Satellite View of Earth/City)
    const map = L.map(mapContainerRef.current, {
      center: BASE_COORDS,
      zoom: 15,
      maxZoom: 19,
      minZoom: 12,
      zoomControl: false,
      attributionControl: false
    });

    const satelliteLayer = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 19,
        subdomains: ['server', 'services'],
        attribution: 'Tiles &copy; Esri &mdash; Earthstar Geographics'
      }
    ).addTo(map);

    // Realistic Turbid Silt Floodwaters Overlay (Murky Silt/Muddy Brown, NOT blue!)
    REALISTIC_FLOOD_ZONES.forEach((coords) => {
      L.polygon(coords, {
        color: '#B48842', // Realistic flood silt border
        weight: 1.8,
        dashArray: '4, 4',
        fillColor: '#6E5124', // Turbid muddy brown floodwater
        fillOpacity: 0.42
      }).addTo(map);
    });

    // Add Base Station / EOC Marker
    const baseIcon = L.divIcon({
      className: 'custom-base-pin',
      html: `
        <div style="background: rgba(17, 28, 45, 0.9); border: 2px solid #FF8A24; border-radius: 12px; padding: 4px 8px; color: white; font-weight: bold; font-family: monospace; font-size: 10px; display: flex; align-items: center; gap: 4px; box-shadow: 0 4px 12px rgba(255,138,36,0.3); white-space: nowrap;">
          <span>🏰</span>
          <span>EOC DRONE BASE</span>
        </div>
      `,
      iconSize: [120, 30],
      iconAnchor: [60, 15]
    });
    L.marker([41.3885, -70.5315], { icon: baseIcon }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Tile Layer if Style Toggled
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer);
      }
    });

    let tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    if (tileStyle === 'dark') {
      tileUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
    }

    L.tileLayer(tileUrl, { maxZoom: 19 }).addTo(map);
  }, [tileStyle]);

  // Render & Update Survivor Markers on Satellite Map
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear previous survivor markers
    survivorMarkersRef.current.forEach((m) => map.removeLayer(m));
    survivorMarkersRef.current = [];

    survivorList.forEach((s) => {
      const isSelected = selectedSurvivor?.id === s.id;
      const markerColor = s.urgency === 'CRITICAL' ? '#FF4D5D' : '#FF8A24';

      const icon = L.divIcon({
        className: 'custom-survivor-pin',
        html: `
          <div style="position: relative; cursor: pointer; display: flex; flex-direction: column; align-items: center;">
            <div style="position: absolute; top: -12px; width: 44px; height: 44px; border-radius: 50%; border: 1.5px dashed ${markerColor}; background: ${s.urgency === 'CRITICAL' ? 'rgba(255, 77, 93, 0.25)' : 'rgba(255, 138, 36, 0.25)'}; animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="background: rgba(11, 18, 32, 0.95); border: 2px solid ${isSelected ? '#FFFFFF' : markerColor}; border-radius: 14px; padding: 4px 10px; color: white; font-family: system-ui; box-shadow: 0 4px 18px rgba(0,0,0,0.7), 0 0 12px ${markerColor}40; display: flex; align-items: center; gap: 6px; white-space: nowrap;">
              <span style="font-size: 18px; filter: drop-shadow(0 0 6px ${markerColor});">🕷️</span>
              <div style="font-size: 10px; font-weight: 800; font-family: monospace; display: flex; flex-direction: column; line-height: 1.15;">
                <span style="color: #FF8A24; font-size: 8px; letter-spacing: 0.5px; font-weight: 900;">🕷️ SPOTTED</span>
                <span style="color: ${markerColor}; font-weight: 900;">${s.count} SURVIVORS</span>
              </div>
            </div>
            <div style="width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 7px solid ${isSelected ? '#FFFFFF' : markerColor};"></div>
          </div>
        `,
        iconSize: [110, 44],
        iconAnchor: [55, 42]
      });

      const marker = L.marker([s.lat, s.lng], { icon })
        .addTo(map)
        .on('click', () => {
          setSelectedSurvivor(s);
          map.flyTo([s.lat, s.lng], 16, { duration: 0.8 });
        });

      survivorMarkersRef.current.push(marker);
    });
  }, [survivorList, selectedSurvivor]);

  // Animated Flight Loop for Drones on Real Satellite Map
  useEffect(() => {
    let animId;
    const map = mapInstanceRef.current;
    if (!map) return;

    const animateDrones = () => {
      if (!isPaused) {
        dronesRef.current.forEach((d) => {
          d.t += d.speed;

          // Organic elliptical SAR search path over real GPS coordinates
          const curLat = d.centerLat + Math.sin(d.t * 2.2) * d.radiusLat + Math.cos(d.t * 1.1) * (d.radiusLat * 0.4);
          const curLng = d.centerLng + Math.cos(d.t * 2.0) * d.radiusLng;

          // Record flight path breadcrumb trail
          if (Math.random() < 0.4) {
            d.trail.push([curLat, curLng]);
            if (d.trail.length > 25) d.trail.shift();
          }

          // Update Flight Trail Polyline
          if (!trailsRef.current[d.id]) {
            trailsRef.current[d.id] = L.polyline(d.trail, {
              color: d.color,
              weight: 2.2,
              opacity: 0.7,
              dashArray: '3, 4'
            }).addTo(map);
          } else {
            trailsRef.current[d.id].setLatLngs(d.trail);
          }

          // Update Drone Marker
          const isSelected = selectedDrone === d.id;
          const droneHtml = `
            <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
              <!-- Radar Sweep Pulse -->
              <div style="position: absolute; top: -14px; width: 44px; height: 44px; border-radius: 50%; border: 1.5px solid ${d.color}; opacity: 0.7; animation: pulse 1.2s infinite;"></div>
              
              <!-- Quadcopter Icon Body -->
              <div style="width: 26px; height: 26px; border-radius: 50%; background: #111C2D; border: 2.5px solid ${d.color}; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 12px ${d.color};">
                <div style="width: 7px; height: 7px; border-radius: 50%; background: #FFFFFF;"></div>
              </div>

              <!-- Callsign HUD Label -->
              <div style="margin-top: 3px; background: rgba(7, 11, 20, 0.92); border: 1px solid ${d.color}; border-radius: 6px; padding: 1px 5px; color: white; font-size: 9px; font-weight: bold; font-family: monospace; white-space: nowrap; box-shadow: 0 2px 8px rgba(0,0,0,0.7);">
                ${d.name} <span style="color: ${d.color};">• ALT ${d.alt}m</span>
              </div>
            </div>
          `;

          const droneIcon = L.divIcon({
            className: `drone-pin-${d.id}`,
            html: droneHtml,
            iconSize: [80, 50],
            iconAnchor: [40, 18]
          });

          if (!markersRef.current[d.id]) {
            markersRef.current[d.id] = L.marker([curLat, curLng], { icon: droneIcon })
              .addTo(map)
              .on('click', () => setSelectedDrone(d.id));
          } else {
            markersRef.current[d.id].setLatLng([curLat, curLng]);
            markersRef.current[d.id].setIcon(droneIcon);
          }
        });
      }

      animId = requestAnimationFrame(animateDrones);
    };

    animId = requestAnimationFrame(animateDrones);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isPaused, selectedDrone]);

  // Dispatch Rescue Boat Handler
  const handleDispatchRescueBoat = async (survivor) => {
    try {
      await dispatchRescueMission({
        action: 'DISPATCH_RESCUE_BOAT',
        sector: survivor.label,
        status: 'en_route',
        asset: 'RESCUE FLEET • Alpha Watercraft Unit',
        victims_count: survivor.count,
        flood_depth_m: survivor.waterDepthM,
        waypoint_coords: [survivor.lat, survivor.lng],
        notes: `Tactical Satellite Map Dispatch: ${survivor.count} victims at ${survivor.lat.toFixed(4)}° N, ${survivor.lng.toFixed(4)}° W`
      });

      // Update survivor status locally
      setSurvivorList(prev => prev.map(s => s.id === survivor.id ? { ...s, status: 'targeted' } : s));
      setDispatchToast(`Rescue Watercraft Dispatched to GPS: ${survivor.lat.toFixed(4)}° N, ${survivor.lng.toFixed(4)}° W!`);
      setTimeout(() => setDispatchToast(null), 4000);
      onStateRefresh && onStateRefresh();
    } catch (err) {
      setDispatchToast('Dispatch error: ' + err.message);
      setTimeout(() => setDispatchToast(null), 4000);
    }
  };

  const handleZoom = (delta) => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.setZoom(map.getZoom() + delta);
  };

  const handleRecenter = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.flyTo(BASE_COORDS, 15, { duration: 1.0 });
  };

  const activeDroneData = dronesRef.current.find(d => d.id === selectedDrone) || dronesRef.current[0];

  return (
    <div className="p-6 space-y-5 overflow-y-auto max-h-screen bg-[#070B14] text-slate-100">
      {/* Toast Alert */}
      {dispatchToast && (
        <div className="fixed top-5 right-5 z-50 px-5 py-3 rounded-2xl bg-[#10B981]/20 border border-[#10B981] text-white shadow-2xl backdrop-blur-md flex items-center gap-3 animate-fade-in font-bold text-sm">
          <CheckCircle2 className="w-5 h-5 text-[#10B981]" />
          <span>{dispatchToast}</span>
        </div>
      )}

      {/* Top Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#1E2C42] pb-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF8A24] via-[#EA580C] to-[#A855F7] p-0.5 flex items-center justify-center shadow-lg shadow-[#FF8A24]/20">
              <div className="w-full h-full bg-[#0D1524] rounded-[10px] flex items-center justify-center">
                <Compass className="w-5 h-5 text-[#FF8A24]" />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-black text-white flex items-center gap-2">
                <span>Tactical Satellite Disaster Radar</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#FF8A24]/15 text-[#FF8A24] border border-[#FF8A24]/40 font-bold uppercase">
                  🎃 Real Satellite City Imagery
                </span>
              </h1>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Real high-resolution satellite imagery of flooded city sectors with live drone SAR survivor tracking.
              </p>
            </div>
          </div>
        </div>

        {/* Read-Only Inundation Telemetry & Flight Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Real-time Environmental Flood Level (Read-Only) */}
          <div className="px-3.5 py-1.5 rounded-xl bg-[#111C2D] border border-[#22354E] flex items-center gap-2.5 font-mono text-xs">
            <span className="w-2 h-2 rounded-full bg-[#FF8A24] animate-pulse" />
            <span className="text-slate-400">COASTAL SURGE:</span>
            <span className="text-[#FF8A24] font-black text-sm">+{lockedSurgeDepth.toFixed(2)}m</span>
            <span className="text-[10px] text-slate-500 font-bold">(Inundation Locked)</span>
          </div>

          {/* Satellite Layer Switcher */}
          <div className="bg-[#111C2D] border border-[#22354E] rounded-xl p-1 flex items-center gap-1">
            <button
              onClick={() => setTileStyle('esri_satellite')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                tileStyle === 'esri_satellite'
                  ? 'bg-gradient-to-r from-[#FF8A24] to-[#EA580C] text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Satellite
            </button>
            <button
              onClick={() => setTileStyle('dark')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                tileStyle === 'dark'
                  ? 'bg-gradient-to-r from-[#A855F7] to-[#7E22CE] text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Dark Tactical
            </button>
          </div>

          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-bold transition-colors cursor-pointer ${
              isPaused
                ? 'bg-[#10B981]/20 border-[#10B981] text-[#10B981]'
                : 'bg-[#111C2D] border-[#22354E] hover:border-[#35D6F2]/50 text-slate-300'
            }`}
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            <span>{isPaused ? 'Resume Search' : 'Pause Flight'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Leaflet Satellite Map + SAR Survivor Focus */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Main Satellite Map View (3 cols) */}
        <div className="lg:col-span-3 bg-[#0D1524] border border-[#1E2C42] rounded-3xl p-4 shadow-2xl relative overflow-hidden flex flex-col">
          {/* Satellite Map HUD Overlay */}
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2 px-2 z-10">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-[#35D6F2] font-bold">
                <span className="w-2 h-2 rounded-full bg-[#35D6F2] animate-ping" />
                4 DRONES SCANNING SATELLITE SECTOR
              </span>
              <span>GPS CENTER: 41.3850° N, 70.5280° W</span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[#FF8A24]">WATER: MUDDY SILT FLOODING</span>
              <span className="text-[#10B981] font-bold">{survivorList.length} TARGET CLUSTERS</span>
            </div>
          </div>

          {/* Leaflet Map DOM Container */}
          <div className="relative rounded-2xl overflow-hidden border border-[#22354E]/80 bg-[#060A12] flex-1 min-h-[580px]">
            <div
              ref={mapContainerRef}
              className="w-full h-full min-h-[580px] z-10"
              style={{ background: '#070B14' }}
            />

            {/* Quick Map Navigation Controls (Zoom / Recenter) */}
            <div className="absolute top-4 right-4 z-20 flex flex-col gap-1.5 bg-[#111C2D]/90 backdrop-blur-md border border-[#22354E] p-1.5 rounded-2xl shadow-xl">
              <button
                onClick={() => handleZoom(1)}
                className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-[#172438] transition-colors cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleZoom(-1)}
                className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-[#172438] transition-colors cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={handleRecenter}
                className="p-2 rounded-xl text-slate-300 hover:text-[#FF8A24] hover:bg-[#172438] transition-colors cursor-pointer"
                title="Recenter Map"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            {/* Inundation Water Legend */}
            <div className="absolute bottom-4 left-4 z-20 bg-[#111C2D]/90 backdrop-blur-md border border-[#22354E] px-3.5 py-2 rounded-xl shadow-xl flex items-center gap-3 font-mono text-[11px]">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-[#6E5124] border border-[#B48842]" />
                <span className="text-slate-300">Murky Silt Inundation</span>
              </span>
              <span className="text-slate-500">|</span>
              <span className="text-slate-400">Surge: <strong className="text-[#FF8A24]">+2.45m</strong></span>
              <span className="text-slate-500">|</span>
              <span className="text-slate-400">💡 Drag map to pan & explore</span>
            </div>
          </div>
        </div>

        {/* Sidebar: Survivor Triage & Rescue Dispatch (1 col) */}
        <div className="space-y-4">
          {/* Confirmed Survivor Clusters */}
          <div className="bg-[#0D1524] border border-[#1E2C42] rounded-3xl p-5 shadow-xl">
            <h2 className="text-xs font-mono uppercase tracking-wider font-bold text-slate-400 mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="text-base">🕷️</span>
                <span>Spotted Survivor Targets</span>
              </span>
              <span className="text-[10px] text-[#FF4D5D] font-bold">{survivorList.length} Targets</span>
            </h2>

            <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
              {survivorList.map((s) => {
                const isSelected = selectedSurvivor?.id === s.id;
                return (
                  <div
                    key={s.id}
                    onClick={() => {
                      setSelectedSurvivor(s);
                      if (mapInstanceRef.current) {
                        mapInstanceRef.current.flyTo([s.lat, s.lng], 16, { duration: 0.8 });
                      }
                    }}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#172438] border-[#FF8A24] shadow-md shadow-[#FF8A24]/10'
                        : 'bg-[#111C2D] border-[#22354E] hover:border-slate-500'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-white line-clamp-1 flex items-center gap-1.5">
                        <span className="text-sm">🕷️</span>
                        <span>{s.label}</span>
                      </span>
                      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-black shrink-0 ml-2 ${
                        s.urgency === 'CRITICAL' ? 'bg-[#FF4D5D]/20 text-[#FF4D5D] border border-[#FF4D5D]/40' : 'bg-amber-500/20 text-amber-400'
                      }`}>
                        {s.urgency}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-1 mt-2 text-[10px] font-mono text-slate-400">
                      <div>Count: <strong className="text-white">{s.count} People</strong></div>
                      <div>Depth: <strong className="text-[#FF8A24]">{s.waterDepthM}m Silt</strong></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Survivor Triage Card & One-Click Rescue Watercraft Dispatch */}
          {selectedSurvivor && (
            <div className="bg-[#0D1524] border border-[#1E2C42] rounded-3xl p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between border-b border-[#22354E] pb-2">
                <span className="text-xs font-mono font-bold text-[#FF8A24] uppercase">Satellite SAR Triage</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#10B981]/15 text-[#10B981] font-bold">
                  {selectedSurvivor.status === 'targeted' ? 'BOAT DISPATCHED' : 'AWAITING EXTRACTION'}
                </span>
              </div>

              <div>
                <h3 className="text-sm font-black text-white">{selectedSurvivor.label}</h3>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                  GPS: {selectedSurvivor.lat.toFixed(4)}° N, {selectedSurvivor.lng.toFixed(4)}° W
                </p>
              </div>

              <div className="p-3 bg-[#111C2D] rounded-xl border border-[#22354E] space-y-1.5 text-xs font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Confirmed Victims:</span>
                  <span className="text-white font-black">{selectedSurvivor.count} Individuals</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Local Silt Water Depth:</span>
                  <span className="text-[#FF8A24] font-bold">{selectedSurvivor.waterDepthM}m Rushing Flood</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">FLIR Heat Reading:</span>
                  <span className="text-[#35D6F2] font-bold">{selectedSurvivor.heatSignature}</span>
                </div>
              </div>

              <button
                onClick={() => handleDispatchRescueBoat(selectedSurvivor)}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#FF8A24] to-[#A855F7] hover:brightness-110 text-white font-black text-xs shadow-lg shadow-[#FF8A24]/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
              >
                <LifeBuoy className="w-4 h-4 text-white" />
                <span>Deploy Rescue Boat to Sector</span>
              </button>
            </div>
          )}

          {/* Airborne Drone Swarm Telemetry */}
          <div className="bg-[#0D1524] border border-[#1E2C42] rounded-3xl p-5 shadow-xl">
            <h3 className="text-xs font-mono uppercase tracking-wider font-bold text-[#35D6F2] mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#35D6F2]" />
              Satellite Search Swarm (4 Units)
            </h3>

            <div className="space-y-2">
              {dronesRef.current.map((d) => (
                <div
                  key={d.id}
                  onClick={() => {
                    setSelectedDrone(d.id);
                    if (markersRef.current[d.id] && mapInstanceRef.current) {
                      const latlng = markersRef.current[d.id].getLatLng();
                      mapInstanceRef.current.flyTo(latlng, 16, { duration: 0.8 });
                    }
                  }}
                  className={`p-2.5 rounded-xl border text-xs font-mono flex items-center justify-between cursor-pointer transition-all ${
                    selectedDrone === d.id ? 'bg-[#172438] border-[#35D6F2]' : 'bg-[#111C2D] border-[#22354E]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="font-bold text-white">{d.name}</span>
                  </div>
                  <span className="text-[10px] text-slate-400">ALT {d.alt}m</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
