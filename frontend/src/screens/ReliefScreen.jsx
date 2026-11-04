import React, { useState } from 'react';
import {
  PackageCheck,
  Package,
  Droplets,
  HeartPulse,
  Radio,
  Send,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Zap,
  Info,
  Clock,
  ArrowRight
} from 'lucide-react';
import { assignMission } from '../api/client';

export default function ReliefScreen({ requests = [], inventory = [], onStateRefresh, onNavigate }) {
  const [selectedReqId, setSelectedReqId] = useState(requests[0]?.id || 'REQ-101');
  const [assignmentResult, setAssignmentResult] = useState(null);
  const [isAssigning, setIsAssigning] = useState(false);

  const selectedRequest = requests.find(r => r.id === selectedReqId) || requests[0];

  const handleRunAssignment = async (req) => {
    setIsAssigning(true);
    try {
      const res = await assignMission({
        type: 'supply_delivery',
        title: `Relief Cargo Drop: ${req.location_name}`,
        target_id: req.id,
        target_location: req.position,
        required_payload_kg: 4.5
      });
      setAssignmentResult(res);
      onStateRefresh && onStateRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <div className="p-6 space-y-6 overflow-y-auto max-h-screen bg-[#0B1220]">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-white flex items-center gap-2.5">
            <PackageCheck className="w-5 h-5 text-[#FF8A24]" />
            <span>Emergency Relief Demands & Inventory Logistics</span>
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Real-time supply stock levels and multi-criteria intelligent drone dispatch engine.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono px-3.5 py-1.5 rounded-xl bg-[#172438] border border-[#22354E]">
          <span className="text-slate-400">Total Demands:</span>
          <span className="font-bold text-[#FF8A24]">{requests.length} Active SOS</span>
        </div>
      </div>

      {/* Inventory Stock Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {inventory.map((item) => {
          const isShortage = item.available_qty <= item.minimum_threshold;
          return (
            <div key={item.item_id} className="panel-card p-4">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[10px] font-mono uppercase tracking-wider truncate">{item.name}</span>
                {item.item_id === 'WATER_L' ? <Droplets className="w-4 h-4 text-[#35D6F2]" /> :
                 item.item_id === 'FIRST_AID' ? <HeartPulse className="w-4 h-4 text-[#FF4D5D]" /> :
                 item.item_id === 'SAT_BEACON' ? <Radio className="w-4 h-4 text-[#A855F7]" /> :
                 <Package className="w-4 h-4 text-[#FF8A24]" />}
              </div>
              <div className="text-2xl font-black text-white font-mono mt-1">
                {item.available_qty} <span className="text-[11px] text-slate-500 font-normal">{item.unit}</span>
              </div>
              <div className="text-[10px] font-mono mt-1 flex justify-between">
                <span className="text-slate-500">Reserved: {item.reserved_qty}</span>
                <span className={isShortage ? 'text-[#FF4D5D] font-bold' : 'text-[#10B981]'}>
                  {isShortage ? 'LOW STOCK' : 'STOCKED'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Requests & Intelligent Assignment View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Requests List */}
        <div className="lg:col-span-1 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
            Pending Emergency Relief Requests
          </h2>

          <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
            {requests.map((req) => {
              const isSelected = req.id === selectedReqId;
              return (
                <div
                  key={req.id}
                  onClick={() => {
                    setSelectedReqId(req.id);
                    setAssignmentResult(null);
                  }}
                  className={`panel-card p-4 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-[#FF8A24] shadow-lg shadow-[#FF8A24]/15'
                      : 'hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono font-bold text-[#FF8A24]">{req.id}</span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                      req.status === 'delivered'
                        ? 'bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/40'
                        : req.status === 'assigned'
                        ? 'bg-[#35D6F2]/15 text-[#35D6F2] border border-[#35D6F2]/40'
                        : 'bg-[#FF8A24]/15 text-[#FF8A24] border border-[#FF8A24]/40'
                    }`}>
                      {req.status}
                    </span>
                  </div>

                  <h3 className="text-xs font-bold text-white leading-snug">{req.location_name}</h3>

                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-[#22354E] text-[11px] font-mono">
                    <span className="text-slate-400">{req.affected_people_count} Stranded Persons</span>
                    <span className="text-[#FF4D5D] font-bold">Priority: {req.priority_score}/100</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Request Detail & Intelligent Assignment Engine Result */}
        <div className="lg:col-span-2 space-y-4">
          {selectedRequest && (
            <div className="panel-card p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#22354E] pb-3">
                <div>
                  <span className="text-xs font-mono text-[#FF8A24] uppercase font-bold">
                    Emergency Request #{selectedRequest.id}
                  </span>
                  <h2 className="text-lg font-black text-white">{selectedRequest.location_name}</h2>
                </div>

                <button
                  disabled={isAssigning || selectedRequest.status === 'delivered'}
                  onClick={() => handleRunAssignment(selectedRequest)}
                  className={`py-2 px-4 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer shadow-lg ${
                    selectedRequest.status === 'delivered'
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-[#FF8A24] to-[#A855F7] hover:brightness-110 text-white shadow-[#FF8A24]/20'
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-amber-200" />
                  <span>
                    {isAssigning
                      ? 'Computing Optimal Assignment...'
                      : selectedRequest.status === 'delivered'
                      ? 'Supplies Delivered'
                      : 'Dispatch Intelligent Mission'}
                  </span>
                </button>
              </div>

              {/* Requirements & Urgency */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div className="p-3.5 rounded-xl bg-[#111C2D] border border-[#22354E]">
                  <span className="text-slate-500 block text-[10px] uppercase">Water Required</span>
                  <span className="text-white text-base font-bold">{selectedRequest.water_req_liters} Liters</span>
                </div>
                <div className="p-3.5 rounded-xl bg-[#111C2D] border border-[#22354E]">
                  <span className="text-slate-500 block text-[10px] uppercase">Food Rations</span>
                  <span className="text-white text-base font-bold">{selectedRequest.food_req_packs} Packs</span>
                </div>
                <div className="p-3.5 rounded-xl bg-[#111C2D] border border-[#22354E]">
                  <span className="text-slate-500 block text-[10px] uppercase">Medical Urgency</span>
                  <span className="text-[#FF4D5D] text-base font-bold capitalize">{selectedRequest.medical_urgency}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-[#111C2D] border border-[#22354E]">
                  <span className="text-slate-500 block text-[10px] uppercase">Vulnerable Group</span>
                  <span className="text-[#FF8A24] text-base font-bold">{selectedRequest.vulnerable_persons ? 'YES' : 'NO'}</span>
                </div>
              </div>

              {/* Priority Contributing Factors */}
              {selectedRequest.priority_factors?.length > 0 && (
                <div className="p-3.5 rounded-xl bg-[#111C2D] border border-[#22354E] text-xs">
                  <h4 className="text-[10px] font-mono font-bold text-slate-400 uppercase mb-1">
                    Priority Score Factors (Score: {selectedRequest.priority_score}/100):
                  </h4>
                  <ul className="space-y-0.5 text-slate-300 font-mono text-[11px] list-disc list-inside">
                    {selectedRequest.priority_factors.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Intelligent Assignment Algorithm Output */}
              {assignmentResult && (
                <div className="p-4 rounded-xl bg-[#111C2D] border border-[#FF8A24]/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-[#FF8A24] uppercase flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-300" />
                      Assignment Algorithm Rationale (S = 0.35P + 0.25L + 0.20D + 0.20C)
                    </span>
                    <button
                      onClick={() => onNavigate('simulator')}
                      className="text-xs text-[#35D6F2] hover:underline font-mono cursor-pointer flex items-center gap-1"
                    >
                      <span>Watch in 3D Sim</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <p className="text-xs text-slate-200 leading-relaxed font-mono">
                    {assignmentResult.rationale}
                  </p>

                  {/* Multi-Drone Suitability Score Breakdown */}
                  <div className="space-y-1.5 pt-2 border-t border-[#22354E]">
                    <span className="text-[10px] font-mono text-slate-400 uppercase block">
                      Candidate Drone Suitability Evaluation:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
                      {assignmentResult.suitability_breakdown?.map((s) => (
                        <div
                          key={s.drone_id}
                          className={`p-2.5 rounded-xl border ${
                            s.is_eligible
                              ? 'bg-[#172438] border-[#10B981]/40 text-[#10B981]'
                              : 'bg-[#172438]/50 border-[#FF4D5D]/30 text-slate-400'
                          }`}
                        >
                          <div className="flex justify-between font-bold">
                            <span>{s.drone_id}</span>
                            <span>{s.is_eligible ? `${s.total_score} pts (Eligible)` : 'REJECTED'}</span>
                          </div>
                          {!s.is_eligible && s.rejection_reasons?.length > 0 && (
                            <p className="text-[10px] text-[#FF4D5D] mt-0.5">
                              {s.rejection_reasons[0]}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
