import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Compass, Eye, Play, Pause, ExternalLink,
  Layers, ZoomIn, ZoomOut, Maximize2, Radio
} from 'lucide-react';

// Real Coastal Geographic Coordinates (North Haven Coastal Sector)
const BASE_COORDS = [41.3850, -70.5280];

// Real Survivor Target Coordinates on the Satellite Map with Spider Markers
const SATELLITE_SURVIVORS = [
  {
    id: 'SURV-01',
    label: '4 Victims Stranded on School Rooftop',
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
    label: 'Isolated Family on Store Veranda',
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
    label: '2 Elderly Residents on Ground Porch',
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

// Realistic Turbid Silt Floodwaters Overlay (Murky Silt/Muddy Brown, NOT blue!)
const REALISTIC_FLOOD_ZONES = [
  [
    [41.3800, -70.5360],
    [41.3830, -70.5340],
    [41.3855, -70.5310],
    [41.3840, -70.5270],
    [41.3815, -70.5290],
    [41.3790, -70.5320]
  ],
  [
    [41.3860, -70.5260],
    [41.3890, -70.5240],
    [41.3910, -70.5210],
    [41.3880, -70.5190],
    [41.3850, -70.5230]
  ]
];

export default function TerrainSatelliteMap({
  compact = false,
  onNavigate,
  onSelectSurvivor
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const trailsRef = useRef({});
  const survivorMarkersRef = useRef([]);

  const [selectedDrone, setSelectedDrone] = useState('DRONE-01');
  const [selectedSurvivor, setSelectedSurvivor] = useState(SATELLITE_SURVIVORS[0]);
  const [isPaused, setIsPaused] = useState(false);
  const [tileStyle, setTileStyle] = useState('esri_satellite');

  // 4 Tactical Drones Swarm (All start with "Drone")
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

  // Initialize Leaflet Map with Real Satellite Imagery
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: BASE_COORDS,
      zoom: compact ? 14 : 15,
      maxZoom: 19,
      minZoom: 12,
      zoomControl: false,
      attributionControl: false
    });

    // High resolution Esri World Imagery (Satellite)
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 19,
        subdomains: ['server', 'services'],
        attribution: 'Tiles &copy; Esri &mdash; Earthstar Geographics'
      }
    ).addTo(map);

    // Realistic Turbid Silt Floodwaters Overlay (Muddy brown, NOT blue!)
    REALISTIC_FLOOD_ZONES.forEach((coords) => {
      L.polygon(coords, {
        color: '#B48842',
        weight: 1.8,
        dashArray: '4, 4',
        fillColor: '#6E5124',
        fillOpacity: 0.42
      }).addTo(map);
    });

    // Base Station / EOC Marker
    const baseIcon = L.divIcon({
      className: 'custom-base-pin',
      html: `
        <div style="background: rgba(17, 28, 45, 0.95); border: 2px solid #FF8A24; border-radius: 12px; padding: 4px 8px; color: white; font-weight: bold; font-family: monospace; font-size: 10px; display: flex; align-items: center; gap: 4px; box-shadow: 0 4px 12px rgba(255,138,36,0.3); white-space: nowrap;">
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
  }, [compact]);

  // Style Switcher
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer);
      }
    });

    const tileUrl = tileStyle === 'dark'
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

    L.tileLayer(tileUrl, { maxZoom: 19 }).addTo(map);
  }, [tileStyle]);

  // Survivor Target Markers with Spider Symbol
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    survivorMarkersRef.current.forEach((m) => map.removeLayer(m));
    survivorMarkersRef.current = [];

    SATELLITE_SURVIVORS.forEach((s) => {
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
          if (onSelectSurvivor) onSelectSurvivor(s);
          map.flyTo([s.lat, s.lng], 16, { duration: 0.8 });
        });

      survivorMarkersRef.current.push(marker);
    });
  }, [selectedSurvivor, onSelectSurvivor]);

  // Animated Flight Loop for Drones
  useEffect(() => {
    let animId;
    const map = mapInstanceRef.current;
    if (!map) return;

    const animateDrones = () => {
      if (!isPaused) {
        dronesRef.current.forEach((d) => {
          d.t += d.speed;

          const curLat = d.centerLat + Math.sin(d.t * 2.2) * d.radiusLat + Math.cos(d.t * 1.1) * (d.radiusLat * 0.4);
          const curLng = d.centerLng + Math.cos(d.t * 2.0) * d.radiusLng;

          if (Math.random() < 0.35) {
            d.trail.push([curLat, curLng]);
            if (d.trail.length > 20) d.trail.shift();
          }

          if (!trailsRef.current[d.id]) {
            trailsRef.current[d.id] = L.polyline(d.trail, {
              color: d.color,
              weight: 2.0,
              opacity: 0.75,
              dashArray: '3, 4'
            }).addTo(map);
          } else {
            trailsRef.current[d.id].setLatLngs(d.trail);
          }

          const droneHtml = `
            <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
              <div style="position: absolute; top: -14px; width: 44px; height: 44px; border-radius: 50%; border: 1.5px solid ${d.color}; opacity: 0.75; animation: pulse 1.2s infinite;"></div>
              
              <div style="width: 24px; height: 24px; border-radius: 50%; background: #111C2D; border: 2.5px solid ${d.color}; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 14px ${d.color};">
                <div style="width: 7px; height: 7px; border-radius: 50%; background: #FFFFFF;"></div>
              </div>

              <div style="margin-top: 2px; background: rgba(7, 11, 20, 0.95); border: 1px solid ${d.color}; border-radius: 6px; padding: 1px 5px; color: white; font-size: 9px; font-weight: bold; font-family: monospace; white-space: nowrap; box-shadow: 0 2px 8px rgba(0,0,0,0.8);">
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
    return () => cancelAnimationFrame(animId);
  }, [isPaused, selectedDrone]);

  const handleZoom = (inOut) => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (inOut === 'in') map.zoomIn();
    else map.zoomOut();
  };

  const handleRecenter = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.flyTo(BASE_COORDS, 15, { duration: 1.0 });
  };

  return (
    <div className="w-full h-full relative overflow-hidden flex flex-col bg-[#070B14]">
      {/* Tactical Leaflet Map Canvas */}
      <div ref={mapContainerRef} className="w-full flex-1 z-0" style={{ minHeight: '320px' }} />

      {/* Floating HUD Controls */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
        {/* Layer Toggle */}
        <div className="bg-[#111C2D]/90 backdrop-blur-md border border-[#22354E] rounded-xl p-1 flex items-center gap-1 shadow-xl">
          <button
            onClick={() => setTileStyle('esri_satellite')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono transition-all cursor-pointer ${
              tileStyle === 'esri_satellite'
                ? 'bg-gradient-to-r from-[#FF8A24] to-[#EA580C] text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Satellite
          </button>
          <button
            onClick={() => setTileStyle('dark')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono transition-all cursor-pointer ${
              tileStyle === 'dark'
                ? 'bg-gradient-to-r from-[#A855F7] to-[#7E22CE] text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Dark
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="bg-[#111C2D]/90 backdrop-blur-md border border-[#22354E] rounded-xl p-1 flex items-center gap-1 shadow-xl">
          <button
            onClick={() => handleZoom('in')}
            className="p-1.5 hover:bg-[#1E2C42] rounded-lg text-slate-300 hover:text-white cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleZoom('out')}
            className="p-1.5 hover:bg-[#1E2C42] rounded-lg text-slate-300 hover:text-white cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleRecenter}
            className="p-1.5 hover:bg-[#1E2C42] rounded-lg text-slate-300 hover:text-white cursor-pointer"
            title="Recenter"
          >
            <Compass className="w-3.5 h-3.5 text-[#FF8A24]" />
          </button>
        </div>

        {onNavigate && (
          <button
            onClick={() => onNavigate('terrain')}
            className="p-1.5 bg-[#111C2D]/90 backdrop-blur-md border border-[#22354E] hover:border-[#FF8A24] rounded-xl text-slate-300 hover:text-white cursor-pointer shadow-xl"
            title="Full Tactical Screen"
          >
            <Maximize2 className="w-3.5 h-3.5 text-[#FF8A24]" />
          </button>
        )}
      </div>

      {/* Bottom Floating Telemetry Overlay Bar */}
      <div className="absolute bottom-3 left-3 right-3 z-20 pointer-events-none">
        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-2xl bg-[#0B1220]/90 border border-[#22354E]/80 backdrop-blur-md shadow-2xl text-[10px] font-mono pointer-events-auto">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#10B981] animate-ping" />
            <span className="text-white font-bold">4 SAR DRONES AIRBORNE</span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-400">SURGE: <strong className="text-[#FF8A24]">+2.45m SILT</strong></span>
            <span className="text-slate-500 hidden sm:inline">|</span>
            <span className="text-[#35D6F2] font-bold hidden sm:inline">🎃 SATELLITE CITY VIEW</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400">TARGETS:</span>
            <span className="px-2 py-0.5 rounded bg-[#FF4D5D]/20 text-[#FF4D5D] border border-[#FF4D5D]/40 font-black">
              🕷️ 4 SPOTTED
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
