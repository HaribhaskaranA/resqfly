import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { Sun, Moon } from 'lucide-react';

// Animated Undulating Floodwater Mesh
function AnimatedWater({ floodLevel, showRiskZones, isDaylight }) {
  const meshRef = useRef();

  useFrame(({ clock }) => {
    if (meshRef.current) {
      const t = clock.getElapsedTime();
      meshRef.current.position.y = floodLevel + Math.sin(t * 1.0) * 0.04;
    }
  });

  return (
    <group>
      {/* Primary Reflective Obsidian Floodwater Surface */}
      <mesh ref={meshRef} position={[0, floodLevel, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[650, 650, 48, 48]} />
        <meshStandardMaterial
          color={isDaylight ? '#1A4B75' : '#050B14'}
          transparent
          opacity={isDaylight ? 0.85 : 0.94}
          roughness={isDaylight ? 0.12 : 0.05}
          metalness={isDaylight ? 0.78 : 0.95}
        />
      </mesh>

      {/* Toxic Bio-Green (#39FF14) Flood Elevation Hazard Contours */}
      {showRiskZones && (
        <mesh position={[0, floodLevel + 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[642, 642, 36, 36]} />
          <meshBasicMaterial
            color="#39FF14"
            wireframe
            transparent
            opacity={0.25}
          />
        </mesh>
      )}

      {/* Eerie Pumpkin Amber Glow Ring along Waterline Edge */}
      <mesh position={[0, floodLevel + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[180, 240, 32]} />
        <meshBasicMaterial
          color="#FF7518"
          transparent
          opacity={0.06}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

// Foliage / Pine Trees
function CoastalTrees() {
  const treePositions = useMemo(() => {
    const pos = [];
    const seedCoords = [
      [25, 4.5, -45], [32, 4.8, -52], [18, 5.2, -60], [40, 5.0, -35],
      [-50, 3.8, -40], [-60, 4.0, -30], [-70, 3.5, -20], [-45, 3.2, 20],
      [65, 4.2, 50], [75, 4.5, 60], [80, 5.0, 40], [95, 5.2, 30],
      [110, 5.5, 20], [120, 6.0, 50], [105, 5.8, 80], [60, 4.8, 95],
      [-25, 3.0, 60], [-35, 2.8, 80], [-15, 3.2, 95], [10, 4.0, 75],
      [-120, 12.0, -100], [-135, 13.0, -110], [-115, 11.5, -135]
    ];
    seedCoords.forEach(([x, y, z]) => {
      pos.push({ x, y, z, scale: 0.8 + Math.random() * 0.4 });
    });
    return pos;
  }, []);

  return (
    <group>
      {treePositions.map((t, idx) => (
        <group key={idx} position={[t.x, t.y, t.z]} scale={[t.scale, t.scale, t.scale]}>
          {/* Trunk */}
          <mesh position={[0, 1.2, 0]}>
            <cylinderGeometry args={[0.25, 0.35, 2.4, 6]} />
            <meshStandardMaterial color="#2d1e18" roughness={0.9} />
          </mesh>
          {/* Lower Foliage */}
          <mesh position={[0, 2.8, 0]}>
            <coneGeometry args={[1.6, 2.4, 6]} />
            <meshStandardMaterial color={idx % 4 === 0 ? '#b45309' : '#14532d'} roughness={0.8} />
          </mesh>
          {/* Middle Foliage */}
          <mesh position={[0, 4.0, 0]}>
            <coneGeometry args={[1.2, 2.0, 6]} />
            <meshStandardMaterial color={idx % 4 === 0 ? '#92400e' : '#166534'} roughness={0.8} />
          </mesh>
          {/* Top Tip */}
          <mesh position={[0, 5.0, 0]}>
            <coneGeometry args={[0.8, 1.6, 6]} />
            <meshStandardMaterial color={idx % 4 === 0 ? '#78350f' : '#15803d'} roughness={0.8} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// Drone 3D Mesh
function DroneMesh({ drone, isSelected, onClick }) {
  const meshRef = useRef();
  const rotorRef = useRef();

  useFrame(({ clock }) => {
    if (rotorRef.current) {
      rotorRef.current.rotation.y = clock.getElapsedTime() * 30;
    }
    if (meshRef.current) {
      // Subtle hovering sway
      meshRef.current.position.y = drone.position.y + Math.sin(clock.getElapsedTime() * 2.5 + drone.position.x) * 0.15;
    }
  });

  const glowColor = useMemo(() => {
    switch (drone.category) {
      case 'scout': return '#35D6F2';   // Cyan
      case 'guardian': return '#FF8A24';// Amber/Orange
      case 'lifeline': return '#10B981';// Emerald
      case 'relay': return '#A855F7';   // Purple
      default: return '#FFFFFF';
    }
  }, [drone.category]);

  const pos = [drone.position.x, drone.position.y, drone.position.z];

  return (
    <group ref={meshRef} position={pos} onClick={(e) => { e.stopPropagation(); onClick && onClick(drone); }}>
      {/* Drone Airframe */}
      <mesh castShadow>
        <boxGeometry args={[2.2, 0.35, 2.2]} />
        <meshStandardMaterial color="#1E293B" metalness={0.8} roughness={0.25} />
      </mesh>

      {/* Cross Arms */}
      <mesh rotation={[0, Math.PI / 4, 0]}>
        <boxGeometry args={[3.2, 0.2, 0.3]} />
        <meshStandardMaterial color="#0F172A" />
      </mesh>
      <mesh rotation={[0, -Math.PI / 4, 0]}>
        <boxGeometry args={[3.2, 0.2, 0.3]} />
        <meshStandardMaterial color="#0F172A" />
      </mesh>

      {/* Center Avionics Dome */}
      <mesh position={[0, 0.35, 0]}>
        <sphereGeometry args={[0.65, 16, 16]} />
        <meshStandardMaterial color="#0B1220" roughness={0.2} metalness={0.9} />
      </mesh>

      {/* Nav Lights / Sensor Beacon */}
      <mesh position={[0, 0.5, 0]}>
        <sphereGeometry args={[0.25, 12, 12]} />
        <meshBasicMaterial color={glowColor} />
      </mesh>
      <pointLight position={[0, 0.6, 0]} color={glowColor} intensity={2.5} distance={12} />

      {/* Downward Spotlight Cone */}
      <spotLight
        position={[0, -0.2, 0]}
        target-position={[0, -25, 0]}
        color={glowColor}
        intensity={2.8}
        angle={0.5}
        penumbra={0.6}
        distance={45}
      />

      {/* Spinning Rotors Group */}
      <group ref={rotorRef} position={[0, 0.45, 0]}>
        {[
          [1.1, 1.1],
          [-1.1, 1.1],
          [1.1, -1.1],
          [-1.1, -1.1]
        ].map(([rx, rz], i) => (
          <mesh key={i} position={[rx, 0, rz]}>
            <cylinderGeometry args={[0.75, 0.75, 0.04, 12]} />
            <meshBasicMaterial color="#35D6F2" wireframe transparent opacity={0.6} />
          </mesh>
        ))}
      </group>

      {/* Role-Specific Equipment */}
      {drone.category === 'scout' && (drone.status === 'flying' || drone.status === 'hovering') && (
        <mesh position={[0, -6, 0]}>
          <coneGeometry args={[6.0, 12, 16, 1, true]} />
          <meshBasicMaterial color="#35D6F2" transparent opacity={0.16} side={THREE.DoubleSide} />
        </mesh>
      )}

      {drone.category === 'lifeline' && drone.current_payload_kg > 0 && (
        <group position={[0, -0.8, 0]}>
          <mesh>
            <boxGeometry args={[1.2, 0.8, 1.2]} />
            <meshStandardMaterial color="#FF8A24" roughness={0.4} />
          </mesh>
          <mesh position={[0, 0.6, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 1.2]} />
            <meshBasicMaterial color="#94A3B8" />
          </mesh>
        </group>
      )}

      {drone.category === 'relay' && (
        <mesh position={[0, 0.9, 0]} rotation={[0.4, 0, 0]}>
          <cylinderGeometry args={[0.6, 0.1, 0.2, 16]} />
          <meshStandardMaterial color="#A855F7" metalness={0.7} />
        </mesh>
      )}

      {/* Tactical Callsign HUD Label */}
      <Html position={[0, 2.5, 0]} center distanceFactor={75}>
        <div className="pointer-events-none select-none flex flex-col items-center">
          <div className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold tracking-wider uppercase border border-[#22354E] bg-[#111C2D]/95 text-white shadow-xl flex items-center gap-1.5 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: glowColor }} />
            <span>{drone.name}</span>
            <span className="text-[#35D6F2]">({Math.round(drone.battery)}%)</span>
          </div>
          <span className="text-[9px] font-mono font-bold uppercase mt-0.5 tracking-tight px-1.5 py-0.2 rounded bg-black/70 text-[#FF8A24]">
            {drone.status}
          </span>
        </div>
      </Html>
    </group>
  );
}

// Stylized Arachnid Rescue Drone Crawler skittering across high-ground terrain
function ArachnidCrawlerMesh({ id = 'ALPHA', startPos = [-45, 1.8, -25], radius = 18, speed = 0.6 }) {
  const groupRef = useRef();
  const legsRef = useRef([]);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime() * speed;
    const x = startPos[0] + Math.cos(t) * radius;
    const z = startPos[2] + Math.sin(t) * radius;
    groupRef.current.position.x = x;
    groupRef.current.position.z = z;
    groupRef.current.position.y = startPos[1] + Math.abs(Math.sin(clock.getElapsedTime() * 4)) * 0.12;
    groupRef.current.rotation.y = -t + Math.PI / 2;

    legsRef.current.forEach((leg, i) => {
      if (leg) {
        const offset = i * (Math.PI / 4);
        leg.rotation.z = Math.sin(clock.getElapsedTime() * 10 + offset) * 0.28;
      }
    });
  });

  return (
    <group ref={groupRef} position={startPos} scale={[0.75, 0.75, 0.75]}>
      {/* Spider Cephalothorax Carapace */}
      <mesh position={[0, 0.45, 0]} castShadow>
        <sphereGeometry args={[0.55, 12, 12]} />
        <meshStandardMaterial color="#0A0E17" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Abdomen with Pumpkin Amber (#FF7518) Pattern */}
      <mesh position={[0, 0.6, -0.65]} castShadow>
        <sphereGeometry args={[0.75, 12, 12]} />
        <meshStandardMaterial color="#111C2D" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.85, -0.65]}>
        <sphereGeometry args={[0.22, 8, 8]} />
        <meshBasicMaterial color="#FF7518" />
      </mesh>

      {/* Glowing Dual Arachnid Sensor Eyes (#FF7518) */}
      <mesh position={[-0.18, 0.55, 0.45]}>
        <sphereGeometry args={[0.09, 8, 8]} />
        <meshBasicMaterial color="#FF7518" />
      </mesh>
      <mesh position={[0.18, 0.55, 0.45]}>
        <sphereGeometry args={[0.09, 8, 8]} />
        <meshBasicMaterial color="#FF7518" />
      </mesh>
      <pointLight position={[0, 0.6, 0.6]} color="#FF7518" intensity={2.0} distance={7} />

      {/* 8 Articulated Walking Legs */}
      {[...Array(8)].map((_, i) => {
        const side = i % 2 === 0 ? 1 : -1;
        const legIdx = Math.floor(i / 2);
        const zOffset = (legIdx - 1.5) * 0.4;
        const angleY = (legIdx - 1.5) * 0.35 * side;
        return (
          <group
            key={i}
            ref={(el) => (legsRef.current[i] = el)}
            position={[0.4 * side, 0.4, zOffset]}
            rotation={[0, angleY, 0]}
          >
            <mesh position={[0.6 * side, 0.25, 0]} rotation={[0, 0, (side * Math.PI) / 6]}>
              <cylinderGeometry args={[0.05, 0.07, 1.2, 6]} />
              <meshStandardMaterial color="#FF7518" metalness={0.6} />
            </mesh>
            <mesh position={[1.1 * side, -0.35, 0]} rotation={[0, 0, (-side * Math.PI) / 4]}>
              <cylinderGeometry args={[0.03, 0.05, 1.1, 6]} />
              <meshStandardMaterial color="#0A0E17" metalness={0.9} />
            </mesh>
          </group>
        );
      })}

      <Html position={[0, 2.0, 0]} center distanceFactor={70}>
        <div className="pointer-events-none select-none px-2 py-0.5 rounded-lg bg-[#0A0E17]/95 border border-[#FF7518]/70 text-[9px] font-mono font-bold text-[#FF7518] shadow-lg flex items-center gap-1 whitespace-nowrap">
          <span>🕷️</span>
          <span>ARACHNID-CRAWLER • {id}</span>
        </div>
      </Html>
    </group>
  );
}

// 3D Building Representation with Visible Illumination & Rooftop Cobwebs
function VillageBuilding({ building, floodLevel, onSelect, showLabels }) {
  const isSubmerged = floodLevel >= building.y;
  const floodDepth = Math.max(0, floodLevel - building.y);

  // Roof & Accent color
  const roofColor = useMemo(() => {
    switch (building.type) {
      case 'school': return '#7C3AED';   // Purple
      case 'church': return '#312E81';   // Gothic Navy
      case 'hospital': return '#1E3A8A'; // Medical Blue
      case 'base': return '#0F766E';     // Outpost Cyan/Teal
      case 'lighthouse': return '#B45309';// Warm Amber
      case 'commercial': return '#475569';
      default: return '#334155';
    }
  }, [building.type]);

  const wallColor = isSubmerged ? '#1E293B' : '#2A3449';

  return (
    <group position={[building.x, building.y, building.z]} onClick={(e) => { e.stopPropagation(); onSelect(building); }}>
      {/* Foundation & Walls */}
      <mesh position={[0, building.height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[building.width, building.height, building.depth]} />
        <meshStandardMaterial color={wallColor} roughness={0.65} metalness={0.2} />
      </mesh>

      {/* Roof */}
      <mesh position={[0, building.height + 1.2, 0]}>
        <coneGeometry args={[Math.max(building.width, building.depth) * 0.72, 3.2, 4]} />
        <meshStandardMaterial color={roofColor} roughness={0.6} />
      </mesh>

      {/* Subtle Rooftop Cobweb Silhouettes */}
      {(building.id.charCodeAt(building.id.length - 1) % 2 === 0) && (
        <group position={[0, building.height + 1.6, 0]}>
          <mesh rotation={[Math.PI / 4, 0, 0]}>
            <ringGeometry args={[building.width * 0.25, building.width * 0.55, 6, 2]} />
            <meshBasicMaterial color="#E2E8F0" transparent opacity={0.25} wireframe side={THREE.DoubleSide} />
          </mesh>
        </group>
      )}

      {/* Lit Interior Windows (Illuminated amber window interiors) */}
      <mesh position={[0, building.height / 2, building.depth / 2 + 0.05]}>
        <planeGeometry args={[building.width * 0.65, building.height * 0.45]} />
        <meshStandardMaterial
          color="#FF9E2C"
          emissive="#FF8A24"
          emissiveIntensity={isSubmerged ? 0.2 : 0.85}
          roughness={0.3}
        />
      </mesh>

      {/* Lit Jack-o'-Lantern at Entryway */}
      <group position={[0, 0.4, building.depth / 2 + 0.8]}>
        <mesh>
          <sphereGeometry args={[0.55, 12, 12]} />
          <meshStandardMaterial color="#FF8A24" roughness={0.4} emissive="#FF8A24" emissiveIntensity={0.5} />
        </mesh>
        <pointLight color="#FF8A24" intensity={1.2} distance={5.0} />
      </group>

      {/* Landmark Label Pills */}
      {(building.type === 'school' || building.type === 'church' || building.type === 'hospital' || building.type === 'base' || building.type === 'lighthouse') && (
        <Html position={[0, building.height + 4.5, 0]} center distanceFactor={85}>
          <div className="cursor-pointer select-none px-3 py-1.5 rounded-xl text-xs font-bold border border-[#22354E] bg-[#111C2D]/95 text-slate-100 shadow-2xl flex items-center gap-2 whitespace-nowrap hover:border-[#FF8A24]">
            <span className="text-sm">
              {building.type === 'school' ? '🏫' : building.type === 'church' ? '⛪' : building.type === 'hospital' ? '🏥' : building.type === 'base' ? '📡' : '🏮'}
            </span>
            <span>{building.name}</span>
            {isSubmerged && (
              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-[#FF4D5D]/20 text-[#FF4D5D] border border-[#FF4D5D]/40 font-bold">
                +{(floodDepth).toFixed(1)}m SUBMERGED
              </span>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}

// Blackwood Lighthouse Tower with Smooth Conical Searchlight
function LighthouseTower({ position }) {
  const beamRef = useRef();
  const spotRef = useRef();
  const targetRef = useRef();
  const targetObj = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    if (spotRef.current && targetRef.current) {
      spotRef.current.target = targetRef.current;
    }
  }, []);

  useFrame(({ clock }) => {
    if (beamRef.current) {
      // Smooth out the lighthouse searchlight rotation so it projects a focused conical beam across the water
      beamRef.current.rotation.y = clock.getElapsedTime() * 0.35;
    }
  });

  return (
    <group position={position}>
      {/* Stone Tower Base */}
      <mesh position={[0, 10, 0]} castShadow>
        <cylinderGeometry args={[3.5, 5.0, 20, 16]} />
        <meshStandardMaterial color="#475569" roughness={0.8} />
      </mesh>
      {/* Lantern Room */}
      <mesh position={[0, 21.5, 0]}>
        <cylinderGeometry args={[3.2, 3.2, 3.0, 16]} />
        <meshStandardMaterial color="#0F172A" metalness={0.9} />
      </mesh>
      {/* Red Dome Roof */}
      <mesh position={[0, 24, 0]}>
        <sphereGeometry args={[3.2, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#DC2626" />
      </mesh>
      {/* Smooth Searchlight Sweep Beam */}
      <group ref={beamRef} position={[0, 22, 0]}>
        <primitive object={targetObj} ref={targetRef} position={[0, -16, 50]} />
        <spotLight
          ref={spotRef}
          color="#FFF8E7"
          intensity={3.2}
          distance={160}
          angle={0.32}
          penumbra={0.6}
        />
        {/* Focused conical volumetric beam projecting downward toward water surface */}
        <mesh position={[0, -8, 25]} rotation={[Math.PI / 2 - 0.32, 0, 0]}>
          <coneGeometry args={[6.5, 50, 16, 1, true]} />
          <meshBasicMaterial color="#FFF8E7" transparent opacity={0.08} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      </group>
    </group>
  );
}

// Rescue Boat & Floatation Craft 3D Model
function RescueBoatMesh({ position = [0, 0, 0], heading = 0 }) {
  const boatRef = useRef();

  useFrame(({ clock }) => {
    if (boatRef.current) {
      const t = clock.getElapsedTime();
      // Gentle pitch & roll on floodwater
      boatRef.current.position.y = Math.sin(t * 1.8 + position[0]) * 0.12;
      boatRef.current.rotation.z = Math.sin(t * 1.2) * 0.04;
      boatRef.current.rotation.x = Math.cos(t * 1.4) * 0.03;
    }
  });

  return (
    <group position={position} rotation={[0, heading, 0]}>
      <group ref={boatRef}>
        {/* Main Boat Hull - V-shaped Bow */}
        <mesh position={[0, 0.4, 0]} castShadow>
          <boxGeometry args={[2.8, 0.7, 5.2]} />
          <meshStandardMaterial color="#F8FAFC" roughness={0.3} metalness={0.2} />
        </mesh>
        {/* Tapered Bow Nose */}
        <mesh position={[0, 0.4, 3.1]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[1.4, 1.8, 4]} />
          <meshStandardMaterial color="#FF8A24" roughness={0.4} />
        </mesh>
        {/* Inflatable Side Sponsons / Flotation Collar (Port & Starboard) */}
        <mesh position={[-1.4, 0.55, 0]}>
          <cylinderGeometry args={[0.35, 0.35, 5.0, 12]} />
          <meshStandardMaterial color="#FF8A24" roughness={0.5} />
        </mesh>
        <mesh position={[1.4, 0.55, 0]}>
          <cylinderGeometry args={[0.35, 0.35, 5.0, 12]} />
          <meshStandardMaterial color="#FF8A24" roughness={0.5} />
        </mesh>
        {/* Center Cabin Console & Windshield */}
        <mesh position={[0, 1.1, -0.4]}>
          <boxGeometry args={[1.5, 0.9, 1.2]} />
          <meshStandardMaterial color="#0F172A" metalness={0.7} roughness={0.2} />
        </mesh>
        <mesh position={[0, 1.6, -0.2]}>
          <boxGeometry args={[1.3, 0.4, 0.1]} />
          <meshStandardMaterial color="#38BDF8" transparent opacity={0.7} />
        </mesh>
        {/* Outboard Twin Motors */}
        <mesh position={[-0.7, 0.5, -2.7]}>
          <boxGeometry args={[0.4, 0.9, 0.5]} />
          <meshStandardMaterial color="#1E293B" metalness={0.8} />
        </mesh>
        <mesh position={[0.7, 0.5, -2.7]}>
          <boxGeometry args={[0.4, 0.9, 0.5]} />
          <meshStandardMaterial color="#1E293B" metalness={0.8} />
        </mesh>
        {/* Emergency Beacon Arch Strobe */}
        <mesh position={[0, 2.1, -1.0]}>
          <cylinderGeometry args={[0.08, 0.08, 1.2]} />
          <meshStandardMaterial color="#64748B" />
        </mesh>
        <mesh position={[0, 2.7, -1.0]}>
          <sphereGeometry args={[0.22, 12, 12]} />
          <meshBasicMaterial color="#35D6F2" />
        </mesh>
        <pointLight position={[0, 2.8, -1.0]} color="#35D6F2" intensity={2.0} distance={15} />

        {/* Life Ring Floats */}
        <mesh position={[-1.45, 0.8, -0.8]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.3, 0.09, 8, 16]} />
          <meshStandardMaterial color="#EF4444" />
        </mesh>
        <mesh position={[1.45, 0.8, -0.8]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.3, 0.09, 8, 16]} />
          <meshStandardMaterial color="#EF4444" />
        </mesh>
      </group>
    </group>
  );
}

// Emergency Request 3D Beacon with Floatation Craft & SOS Strobe
function RequestBeacon({ request, floodLevel }) {
  const meshRef = useRef();

  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.position.y = (floodLevel || 1.2) + 0.1 + Math.sin(clock.getElapsedTime() * 2) * 0.1;
    }
  });

  return (
    <group position={[request.position.x, 0, request.position.z]}>
      {/* 3D Rescue Boat / Flotation Craft sitting at water surface */}
      <RescueBoatMesh position={[0, floodLevel || 1.2, 0]} heading={0.4} />

      {/* Floating SOS HUD Pill with Spider Spotted Symbol */}
      <Html position={[0, (floodLevel || 1.2) + 4.8, 0]} center distanceFactor={75}>
        <div className="select-none px-3 py-1.5 rounded-xl bg-[#111C2D]/95 border-2 border-[#FF4D5D] text-[#FF4D5D] text-xs font-mono font-black tracking-wider uppercase shadow-2xl flex items-center gap-2 animate-pulse whitespace-nowrap">
          <span className="text-base">🕷️</span>
          <span className="w-2.5 h-2.5 rounded-full bg-[#FF4D5D] animate-ping" />
          <span>SOS • {request.affected_people_count} STRANDED ({request.location_name})</span>
        </div>
      </Html>
    </group>
  );
}

// Stranded Humanoid Victim with Orange Life Vest & Rescue Strobe Beacon
function HumanoidVictim({ offset = [0, 0, 0], isLocated = false }) {
  const beaconRef = useRef();

  useFrame(({ clock }) => {
    if (beaconRef.current) {
      // Gentle distress motion
      beaconRef.current.position.y = 1.95 + Math.sin(clock.getElapsedTime() * 3 + offset[0]) * 0.08;
    }
  });

  return (
    <group position={offset}>
      {/* Dark Pants / Legs */}
      <mesh position={[-0.15, 0.45, 0]}>
        <cylinderGeometry args={[0.08, 0.09, 0.9, 8]} />
        <meshStandardMaterial color="#1E293B" roughness={0.8} />
      </mesh>
      <mesh position={[0.15, 0.45, 0]}>
        <cylinderGeometry args={[0.08, 0.09, 0.9, 8]} />
        <meshStandardMaterial color="#1E293B" roughness={0.8} />
      </mesh>

      {/* Upper Torso with High-Vis Rescue Life Vest */}
      <mesh position={[0, 1.2, 0]} castShadow>
        <boxGeometry args={[0.55, 0.65, 0.35]} />
        <meshStandardMaterial color="#FF8A24" roughness={0.5} />
      </mesh>
      {/* Reflective Safety Straps (White/Silver bands) */}
      <mesh position={[0, 1.25, 0.18]}>
        <boxGeometry args={[0.48, 0.08, 0.02]} />
        <meshBasicMaterial color="#FFFFFF" />
      </mesh>

      {/* Head with Safety Cap / Hood */}
      <mesh position={[0, 1.7, 0]}>
        <sphereGeometry args={[0.18, 12, 12]} />
        <meshStandardMaterial color="#FDBA74" roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.78, 0]}>
        <sphereGeometry args={[0.19, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#F59E0B" roughness={0.4} />
      </mesh>

      {/* Flashing Distress Strobe Beacon on Head */}
      <group ref={beaconRef}>
        <mesh>
          <sphereGeometry args={[0.08, 8, 8]} />
          <meshBasicMaterial color={isLocated ? '#35D6F2' : '#FF4D5D'} />
        </mesh>
        <pointLight color={isLocated ? '#35D6F2' : '#FF4D5D'} intensity={1.5} distance={6} />
      </group>
    </group>
  );
}

// People Cluster Group with Realistic Stranded Humanoids
function PeopleClusterMesh({ cluster }) {
  const victimCount = Math.min(cluster.count, 6);
  const isLocated = Boolean(cluster.detected_by_drone);

  return (
    <group position={[cluster.x, cluster.y, cluster.z]}>
      {[...Array(victimCount)].map((_, i) => (
        <HumanoidVictim
          key={i}
          offset={[(i % 3) * 0.85 - 0.85, 0, Math.floor(i / 3) * 0.85]}
          isLocated={isLocated}
        />
      ))}

      {/* Cluster Status Pill with Spider Spotted Symbol */}
      <Html position={[0, 3.2, 0]} center distanceFactor={75}>
        <div className={`select-none px-2.5 py-1 rounded-xl text-[11px] font-mono font-bold shadow-xl border flex items-center gap-1.5 whitespace-nowrap ${
          isLocated
            ? 'bg-[#111C2D]/95 border-[#35D6F2] text-[#35D6F2]'
            : 'bg-[#111C2D]/95 border-[#FF7518] text-[#FF7518]'
        }`}>
          <span className="text-sm">🕷️</span>
          <span className={`w-2 h-2 rounded-full ${isLocated ? 'bg-[#35D6F2] animate-pulse' : 'bg-[#FF7518]'}`} />
          <span>{isLocated ? `VERIFIED: ${cluster.count} SURVIVORS` : `SPOTTED: ${cluster.count} VICTIMS`}</span>
        </div>
      </Html>
    </group>
  );
}

// Flight Corridors Ribbon Lines
function FlightCorridors({ missions = [], drones = [] }) {
  return (
    <group>
      {missions.filter(m => m.status === 'in_progress').map((m) => {
        const drone = drones.find(d => d.id === m.assigned_drone_id);
        if (!drone) return null;
        const points = [
          new THREE.Vector3(drone.position.x, drone.position.y, drone.position.z),
          new THREE.Vector3(m.target_location.x, m.target_location.y + 6.0, m.target_location.z)
        ];
        const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
        return (
          <line key={m.id} geometry={lineGeo}>
            <lineDashedMaterial color="#FF8A24" dashSize={2} gapSize={1} />
          </line>
        );
      })}
    </group>
  );
}

// Camera Controller Helper for View Presets
function CameraController({ cameraPreset, controlsRef }) {
  const { camera } = useThree();

  useEffect(() => {
    if (!controlsRef.current) return;
    if (cameraPreset === 'top') {
      camera.position.set(0, 240, 5);
      controlsRef.current.target.set(0, 0, 0);
    } else if (cameraPreset === 'cinematic') {
      camera.position.set(-110, 65, 120);
      controlsRef.current.target.set(0, 5, 0);
    } else if (cameraPreset === 'drone') {
      camera.position.set(25, 30, 45);
      controlsRef.current.target.set(0, 10, 0);
    } else {
      // Default Tactical
      camera.position.set(0, 95, 145);
      controlsRef.current.target.set(0, 5, 0);
    }
    controlsRef.current.update();
  }, [cameraPreset, camera, controlsRef]);

  return null;
}

// Main 3D Canvas Scene with Real-Time Day / Storm-Night Switcher
export default function FloodScene3D({
  buildings = [],
  drones = [],
  requests = [],
  peopleClusters = [],
  missions = [],
  floodLevel = 1.2,
  onSelectBuilding,
  onSelectDrone,
  showRoutes = true,
  showPeople = true,
  showRiskZones = true,
  cameraPreset = 'default',
  lightingTheme = 'dark_night'
}) {
  const controlsRef = useRef();
  const [activeTheme, setActiveTheme] = useState(lightingTheme);

  // Sync if prop changes externally
  useEffect(() => {
    setActiveTheme(lightingTheme);
  }, [lightingTheme]);

  const isDaylight = activeTheme === 'daylight_overcast';

  return (
    <div className="w-full h-full relative overflow-hidden bg-[#081726]">
      {/* Interactive Theme Switcher Toggle Pill */}
      <div className="absolute top-4 right-4 z-20 pointer-events-auto">
        <button
          onClick={() => setActiveTheme(t => t === 'dark_night' ? 'daylight_overcast' : 'dark_night')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold shadow-2xl backdrop-blur-md transition-all cursor-pointer ${
            isDaylight
              ? 'bg-[#1E293B]/90 border-[#38BDF8] text-[#38BDF8] hover:bg-[#1E293B]'
              : 'bg-[#111C2D]/90 border-[#FF8A24]/60 text-[#FF8A24] hover:bg-[#172438]'
          }`}
          title="Toggle between Dark Storm Night and Realistic Daylight Overcast Gale"
        >
          {isDaylight ? (
            <>
              <Sun className="w-4 h-4 text-amber-300" />
              <span>☀️ Realistic Daylight Overcast</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-[#FF8A24]" />
              <span>🌙 Dark Storm Night</span>
            </>
          )}
        </button>
      </div>

      <Canvas
        camera={{ position: [0, 95, 145], fov: 48, near: 1, far: 1200 }}
        shadows
      >
        <CameraController cameraPreset={cameraPreset} controlsRef={controlsRef} />

        {/* Dynamic Atmospheric Palette based on Theme with Halloween Fog and Glow */}
        <color attach="background" args={[isDaylight ? '#8FA8C4' : '#080410']} />
        <fog attach="fog" args={[isDaylight ? '#8FA8C4' : '#0B0515', isDaylight ? 140 : 85, isDaylight ? 600 : 390]} />

        {/* Ambient Light with Misty Purple/Amber Tint */}
        <ambientLight
          intensity={isDaylight ? 0.85 : 0.42}
          color={isDaylight ? '#E2E8F0' : '#2A1138'}
        />

        {/* Hemisphere Light */}
        <hemisphereLight
          skyColor={isDaylight ? '#BAE6FD' : '#261438'}
          groundColor={isDaylight ? '#475569' : '#090514'}
          intensity={isDaylight ? 0.60 : 0.35}
        />

        {/* Primary Sun / Eerie Pumpkin Amber Moon Light */}
        <directionalLight
          position={isDaylight ? [-70, 160, -50] : [-80, 140, -90]}
          intensity={isDaylight ? 1.45 : 0.95}
          color={isDaylight ? '#FFFBEB' : '#FFA252'}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />

        {/* Ground Terrain with Elevation Texture */}
        <mesh position={[0, -0.6, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[650, 650, 24, 24]} />
          <meshStandardMaterial color={isDaylight ? '#27374A' : '#0D1726'} roughness={0.88} />
        </mesh>

        {/* Asphalt Roads and Elevated Bridges */}
        <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[16, 420]} />
          <meshStandardMaterial color={isDaylight ? '#334155' : '#1E293B'} roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]} receiveShadow>
          <planeGeometry args={[14, 420]} />
          <meshStandardMaterial color={isDaylight ? '#334155' : '#1E293B'} roughness={0.7} />
        </mesh>

        {/* Coastal Trees and Environment */}
        <CoastalTrees />

        {/* Dynamic Reflective Animated Floodwater */}
        <AnimatedWater floodLevel={floodLevel} showRiskZones={showRiskZones} isDaylight={isDaylight} />

        {/* 40 Village Buildings */}
        {buildings.map((b) => (
          <VillageBuilding
            key={b.id}
            building={b}
            floodLevel={floodLevel}
            onSelect={onSelectBuilding}
          />
        ))}

        {/* Blackwood Lighthouse Landmark */}
        <LighthouseTower position={[-140.0, 14.0, -130.0]} />

        {/* Synthetic Stranded People Clusters */}
        {showPeople && peopleClusters.map((pc) => (
          <PeopleClusterMesh key={pc.id} cluster={pc} />
        ))}

        {/* Emergency SOS Beacons & Flotation Craft */}
        {requests.map((r) => (
          <RequestBeacon key={r.id} request={r} floodLevel={floodLevel} />
        ))}

        {/* Flight Corridors */}
        {showRoutes && <FlightCorridors missions={missions} drones={drones} />}

        {/* 4 Autonomous Drones */}
        {drones.map((drone) => (
          <DroneMesh
            key={drone.id}
            drone={drone}
            onClick={onSelectDrone}
          />
        ))}

        {/* Stylized Arachnid Ground Rescue Crawlers Skittering on High Ground */}
        <ArachnidCrawlerMesh id="ALPHA" startPos={[-42, 1.8, -28]} radius={16} speed={0.5} />
        <ArachnidCrawlerMesh id="BRAVO" startPos={[55, 3.2, 45]} radius={20} speed={0.65} />
        <ArachnidCrawlerMesh id="CHARLIE" startPos={[-85, 4.0, 30]} radius={14} speed={0.45} />

        {/* Smooth Orbit Controls */}
        <OrbitControls
          ref={controlsRef}
          maxPolarAngle={Math.PI / 2 - 0.06}
          minDistance={18}
          maxDistance={380}
          target={[0, 5, 0]}
          enableDamping
          dampingFactor={0.08}
        />
      </Canvas>
    </div>
  );
}
