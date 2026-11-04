import React, { useState } from 'react';
import {
  ShieldAlert,
  Users,
  Waves,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Compass,
  FileCheck,
  ChevronDown,
  ChevronUp,
  MapPin,
  LifeBuoy
} from 'lucide-react';
import { verifyShelter } from '../api/client';

export default function SheltersScreen({ shelters = [], simState, onStateRefresh }) {
  const [selectedShelterId, setSelectedShelterId] = useState(shelters[0]?.id || 'SHELTER-01');
  const [expandedFactors, setExpandedFactors] = useState(true);

  const selectedShelter = shelters.find(s => s.id === selectedShelterId) || shelters[0];

  const handleVerifyAction = async (shelterId, status) => {
    await verifyShelter(shelterId, {
      status,
      notes: status === 'action_dispatched'
        ? 'Coordinator authorized evacuation bus & rescue boat rerouting.'
        : 'Coordinator confirmed shelter status from drone recon.'
    });
    onStateRefresh && onStateRefresh();
  };

  const getRiskColor = (score) => {
    if (score >= 80) return { bg: 'bg-[#FF4D5D]/15', text: 'text-[#FF4D5D]', border: 'border-[#FF4D5D]/50', bar: 'bg-[#FF4D5D]' };
    if (score >= 60) return { bg: 'bg-[#FF8A24]/15', text: 'text-[#FF8A24]', border: 'border-[#FF8A24]/50', bar: 'bg-[#FF8A24]' };
    if (score >= 30) return { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/40', bar: 'bg-amber-400' };
    return { bg: 'bg-[#10B981]/15', text: 'text-[#10B981]', border: 'border-[#10B981]/40', bar: 'bg-[#10B981]' };
  };

  return (
    <div className="p-6 space-y-6 overflow-y-auto max-h-screen bg-[#0B1220]">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-white flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 text-[#FF8A24]" />
            <span>Shelter Safety & Vulnerability Assessment Center</span>
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Transparent rule-based risk evaluation based on flood depth, road access, and capacity strain.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono px-3.5 py-1.5 rounded-xl bg-[#172438] border border-[#22354E]">
          <span className="text-slate-400">Current Flood Tide:</span>
          <span className="font-bold text-[#35D6F2]">{simState?.flood_water_level?.toFixed(2) || '1.20'}m</span>
        </div>
      </div>

      {/* Mandatory Disclaimer */}
      <div className="p-3.5 rounded-xl bg-[#172438] border border-[#22354E] flex items-start gap-3 text-xs">
        <AlertTriangle className="w-4 h-4 text-[#FF8A24] shrink-0 mt-0.5" />
        <p className="text-slate-400 text-[11px] leading-relaxed">
          <strong className="text-[#FF8A24]">ADVISORY SIMULATION INDICATOR:</strong> This score is a tactical decision-support simulation indicator and not an official civil-engineering structural certification. The system does not autonomously declare buildings safe/unsafe or order evacuation. Human rescue coordinators retain authority over all shelter actions.
        </p>
      </div>

      {/* Shelters Cards Grid (4 Safe Havens) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {shelters.map((shelter) => {
          const isSelected = shelter.id === selectedShelterId;
          const score = shelter.current_assessment?.risk_score || 0;
          const styling = getRiskColor(score);
          const occRatio = Math.round((shelter.current_occupancy / shelter.capacity) * 100);

          // Shelter designation tags
          const designation = shelter.id === 'SHELTER-01'
            ? 'Shelter Alpha · Coastal Edge'
            : shelter.id === 'SHELTER-02'
            ? 'Shelter Bravo · Mid-Ground Ridge'
            : shelter.id === 'HOSPITAL-01'
            ? 'Shelter Charlie · Medical Hub'
            : 'Shelter Delta · Safe Elevated Zone';

          // Transfer route mode
          const transferRoute = shelter.road_accessible
            ? { mode: 'Ground Convoy + Drone', icon: '🚚', color: 'text-[#10B981]' }
            : { mode: 'Rescue Boat + Lifeline Drone', icon: '🚤', color: 'text-[#35D6F2]' };

          return (
            <div
              key={shelter.id}
              onClick={() => setSelectedShelterId(shelter.id)}
              className={`panel-card p-5 cursor-pointer transition-all ${
                isSelected
                  ? 'border-[#FF8A24] shadow-xl shadow-[#FF8A24]/15'
                  : 'hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono font-bold text-[#FF8A24] uppercase">
                  {designation}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${styling.bg} ${styling.text} ${styling.border}`}>
                  {score}/100
                </span>
              </div>

              <h2 className="text-sm font-black text-white leading-snug min-h-[38px]">
                {shelter.name}
              </h2>

              {/* Inundation vs Elevation */}
              <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-[#22354E] text-[11px] font-mono">
                <div>
                  <span className="text-slate-500 block text-[9px] uppercase">Elev</span>
                  <span className="text-slate-200 font-bold">{shelter.elevation_meters.toFixed(1)}m</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px] uppercase">Water</span>
                  <span className={`font-bold ${shelter.local_flood_depth_m > 0 ? 'text-[#FF4D5D]' : 'text-[#10B981]'}`}>
                    {shelter.local_flood_depth_m > 0 ? `+${shelter.local_flood_depth_m.toFixed(1)}m` : 'Dry'}
                  </span>
                </div>
              </div>

              {/* Occupancy Progress */}
              <div className="mt-2.5">
                <div className="flex justify-between text-[10px] font-mono mb-1">
                  <span className="text-slate-400">Occupancy:</span>
                  <span className="text-slate-200 font-bold">{shelter.current_occupancy} / {shelter.capacity} ({occRatio}%)</span>
                </div>
                <div className="w-full h-1.5 bg-[#111C2D] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${occRatio > 100 ? 'bg-[#FF4D5D]' : 'bg-[#35D6F2]'}`}
                    style={{ width: `${Math.min(100, occRatio)}%` }}
                  />
                </div>
              </div>

              {/* Ration & Hydration Status */}
              <div className="grid grid-cols-2 gap-2 mt-2.5 text-[10px] font-mono bg-[#111C2D] p-2 rounded-lg border border-[#22354E]">
                <div>
                  <span className="text-slate-500 block text-[8px] uppercase">Food Rations</span>
                  <span className={`font-bold ${shelter.food_hours_remaining < 12 ? 'text-[#FF4D5D]' : 'text-slate-200'}`}>
                    {shelter.food_hours_remaining?.toFixed(0)}h rem.
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[8px] uppercase">Clean Water</span>
                  <span className={`font-bold ${shelter.water_hours_remaining < 12 ? 'text-[#FF4D5D]' : 'text-slate-200'}`}>
                    {shelter.water_hours_remaining?.toFixed(0)}h rem.
                  </span>
                </div>
              </div>

              {/* Transfer Routes */}
              <div className="mt-2.5 pt-2 border-t border-[#22354E] text-[10px] font-mono flex items-center justify-between">
                <span className="text-slate-500">Route:</span>
                <span className={`font-bold flex items-center gap-1 ${transferRoute.color}`}>
                  <span>{transferRoute.icon}</span>
                  <span className="truncate max-w-[130px]">{transferRoute.mode}</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Shelter Deep Assessment Breakdown */}
      {selectedShelter && (
        <div className="panel-card p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#22354E] pb-4">
            <div>
              <span className="text-xs font-mono text-[#FF8A24] uppercase font-bold">
                {selectedShelter.id} Detailed Risk Telemetry
              </span>
              <h2 className="text-xl font-black text-white">{selectedShelter.name}</h2>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-400">Review Status:</span>
              <span className={`px-3 py-1 rounded-xl text-xs font-mono font-bold uppercase border ${
                selectedShelter.current_assessment?.human_review_status === 'action_dispatched'
                  ? 'bg-purple-950 border-purple-500 text-purple-300'
                  : selectedShelter.current_assessment?.human_review_status === 'verified'
                  ? 'bg-[#10B981]/15 border-[#10B981]/40 text-[#10B981]'
                  : 'bg-[#FF8A24]/15 border-[#FF8A24]/40 text-[#FF8A24]'
              }`}>
                {selectedShelter.current_assessment?.human_review_status || 'Pending'}
              </span>
            </div>
          </div>

          {/* Transparent Formula Factor Breakdown */}
          <div>
            <div
              onClick={() => setExpandedFactors(!expandedFactors)}
              className="flex items-center justify-between cursor-pointer mb-3"
            >
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-2">
                <span>Contributing Factor Points (0 - 100 Scale)</span>
              </h3>
              {expandedFactors ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </div>

            {expandedFactors && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs font-mono">
                <div className="p-3.5 rounded-xl bg-[#111C2D] border border-[#22354E]">
                  <span className="text-slate-500 block text-[10px] uppercase">Water Threat</span>
                  <span className="text-lg font-black text-white">
                    {selectedShelter.current_assessment?.contributing_factors?.water_threat_score || 0} pts
                  </span>
                  <span className="text-[9px] text-slate-500 block">Max 30 pts</span>
                </div>

                <div className="p-3.5 rounded-xl bg-[#111C2D] border border-[#22354E]">
                  <span className="text-slate-500 block text-[10px] uppercase">Flood Trend</span>
                  <span className="text-lg font-black text-white">
                    {selectedShelter.current_assessment?.contributing_factors?.flood_trend_penalty || 0} pts
                  </span>
                  <span className="text-[9px] text-slate-500 block">Rising (+15)</span>
                </div>

                <div className="p-3.5 rounded-xl bg-[#111C2D] border border-[#22354E]">
                  <span className="text-slate-500 block text-[10px] uppercase">Road Cut-Off</span>
                  <span className="text-lg font-black text-white">
                    {selectedShelter.current_assessment?.contributing_factors?.isolation_score || 0} pts
                  </span>
                  <span className="text-[9px] text-slate-500 block">Cut-off (+20)</span>
                </div>

                <div className="p-3.5 rounded-xl bg-[#111C2D] border border-[#22354E]">
                  <span className="text-slate-500 block text-[10px] uppercase">Overcrowding</span>
                  <span className="text-lg font-black text-white">
                    {selectedShelter.current_assessment?.contributing_factors?.occupancy_overload || 0} pts
                  </span>
                  <span className="text-[9px] text-slate-500 block">Capacity stress</span>
                </div>

                <div className="p-3.5 rounded-xl bg-[#111C2D] border border-[#22354E]">
                  <span className="text-slate-500 block text-[10px] uppercase">Supplies Remaining</span>
                  <span className="text-lg font-black text-white">
                    {selectedShelter.current_assessment?.contributing_factors?.supply_depletion || 0} pts
                  </span>
                  <span className="text-[9px] text-slate-500 block">Hydration & food</span>
                </div>

                <div className="p-3.5 rounded-xl bg-[#111C2D] border border-[#22354E]">
                  <span className="text-slate-500 block text-[10px] uppercase">Structural Stress</span>
                  <span className="text-lg font-black text-white">
                    {selectedShelter.current_assessment?.contributing_factors?.structural_damage_penalty || 0} pts
                  </span>
                  <span className="text-[9px] text-slate-500 block">Damage reports</span>
                </div>
              </div>
            )}
          </div>

          {/* Engine Notes */}
          {selectedShelter.current_assessment?.contributing_factors?.notes?.length > 0 && (
            <div className="p-4 rounded-xl bg-[#111C2D] border border-[#22354E]">
              <h4 className="text-xs font-mono font-bold text-slate-300 uppercase mb-2">
                Engine Audit Trail & Observations:
              </h4>
              <ul className="space-y-1 text-xs text-slate-400 font-mono list-disc list-inside">
                {selectedShelter.current_assessment.contributing_factors.notes.map((note, idx) => (
                  <li key={idx}>{note}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Coordinator Action Buttons */}
          <div className="pt-3 border-t border-[#22354E] flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-mono text-slate-400">
              Coordinator Authorization Actions:
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleVerifyAction(selectedShelter.id, 'verified')}
                className="py-2.5 px-4 rounded-xl bg-[#10B981] hover:bg-[#10B981]/90 text-slate-950 font-black text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-slate-950" />
                <span>Verify & Retain Shelter</span>
              </button>

              <button
                onClick={() => handleVerifyAction(selectedShelter.id, 'action_dispatched')}
                className="py-2.5 px-4 rounded-xl bg-[#A855F7] hover:bg-[#A855F7]/90 text-white font-black text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-lg shadow-[#A855F7]/20"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Dispatch Transfer Boats to High Ground</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
