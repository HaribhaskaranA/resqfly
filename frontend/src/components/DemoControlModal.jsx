import React, { useState } from 'react';
import {
  Sparkles,
  ChevronRight,
  CheckCircle2,
  Waves,
  Eye,
  ShieldAlert,
  Package,
  Compass,
  Radio,
  FileCheck,
  BarChart,
  RefreshCw,
  X
} from 'lucide-react';
import {
  setFloodLevel,
  launchDrone,
  assignMission,
  verifyShelter,
  resetSimulation
} from '../api/client';

export default function DemoControlModal({ isOpen, onClose, onNavigate, onStateRefresh }) {
  if (!isOpen) return null;

  const [currentStep, setCurrentStep] = useState(1);
  const [stepLogs, setStepLogs] = useState({});
  const [isRunning, setIsRunning] = useState(false);

  const steps = [
    {
      num: 1,
      title: 'Step 1: Initiate Flood Surge',
      desc: 'Simulate rising coastal storm tide water level from 1.2m to 2.8m, cutting off low-lying access roads.',
      actionLabel: 'Execute Flood Surge',
      screen: 'simulator',
      run: async () => {
        await setFloodLevel(2.8);
        return 'Floodwater elevation surged to 2.80m. Roads around Zone 3 and Shelter-01 submerged.';
      }
    },
    {
      num: 2,
      title: 'Step 2: Launch SCOUT Drone',
      desc: 'Deploy DRONE-01 (SCOUT-ALPHA) to survey Zone 3 and identify stranded people via visual FLIR/RGB sensors.',
      actionLabel: 'Launch SCOUT',
      screen: 'simulator',
      run: async () => {
        await launchDrone('DRONE-01');
        await assignMission({
          type: 'search',
          title: 'Zone 3 Stranded Resident Scan',
          target_location: { x: -35.0, y: 2.4, z: 42.0 },
          required_payload_kg: 0.0
        });
        return 'SCOUT-ALPHA dispatched. Identified cluster of 25 residents stranded on elevated bungalow roof.';
      }
    },
    {
      num: 3,
      title: 'Step 3: Launch GUARDIAN Shelter Assessment',
      desc: 'Deploy DRONE-02 (GUARDIAN-BRAVO) to inspect North Haven Community School. Flood depth causes risk score to spike to 82/100.',
      actionLabel: 'Launch GUARDIAN',
      screen: 'shelters',
      run: async () => {
        await launchDrone('DRONE-02');
        await assignMission({
          type: 'shelter_inspection',
          title: 'Inspect SHELTER-01 Access & Elevation',
          target_location: { x: -75.0, y: 2.0, z: -60.0 },
          target_id: 'SHELTER-01',
          required_payload_kg: 0.0
        });
        return 'GUARDIAN-BRAVO calculated SHELTER-01 risk score: 82.4/100 (CRITICAL). Advisory escalation alert generated.';
      }
    },
    {
      num: 4,
      title: 'Step 4: Inspect Relief Shortage',
      desc: 'Examine emergency supply demands for water, rations, and trauma kits across the flooded sector.',
      actionLabel: 'Open Relief Mgmt',
      screen: 'relief',
      run: async () => {
        return 'Relief inventory verified. West Pier and Zone 3 require urgent hydration & trauma rations.';
      }
    },
    {
      num: 5,
      title: 'Step 5: Run Intelligent Mission Assignment',
      desc: 'Execute suitability formula S = 0.35P + 0.25L + 0.20D + 0.20C to automatically select the optimal delivery drone.',
      actionLabel: 'Compute Optimal Drone',
      screen: 'relief',
      run: async () => {
        const res = await assignMission({
          type: 'supply_delivery',
          title: 'Urgent Hydration & Medical Delivery',
          target_id: 'REQ-101',
          target_location: { x: -110.0, y: 1.5, z: -30.0 },
          required_payload_kg: 4.0
        });
        return `Algorithm selected ${res.selected_drone?.name || 'LIFELINE-CHARLIE'}. Scout & Relay rejected due to payload constraint.`;
      }
    },
    {
      num: 6,
      title: 'Step 6: Deliver Supplies in 3D Village',
      desc: 'Watch LIFELINE-CHARLIE fly across the coastal village, lower emergency cargo to rooftop, and return to base.',
      actionLabel: 'Track Delivery in 3D',
      screen: 'simulator',
      run: async () => {
        return 'LIFELINE-CHARLIE delivered 4.0kg medical/water payload to Fisherman Pier House #14.';
      }
    },
    {
      num: 7,
      title: 'Step 7: Deploy RELAY Route Monitoring',
      desc: 'Dispatch DRONE-04 (RELAY-DELTA) to verify alternate evacuation corridor towards Regional Hospital high ground.',
      actionLabel: 'Launch RELAY',
      screen: 'rescue',
      run: async () => {
        await launchDrone('DRONE-04');
        await assignMission({
          type: 'route_monitoring',
          title: 'Evacuation Route Alpha Scan',
          target_location: { x: 10.0, y: 6.0, z: -110.0 },
          required_payload_kg: 0.0
        });
        return 'RELAY-DELTA established active telemetry link and mapped high-ground evacuation path.';
      }
    },
    {
      num: 8,
      title: 'Step 8: Rescue Coordinator Verification',
      desc: 'Rescue coordinator reviews the SHELTER-01 critical risk advisory and approves designated shelter relocation.',
      actionLabel: 'Approve Coordination Action',
      screen: 'rescue',
      run: async () => {
        await verifyShelter('SHELTER-01', {
          status: 'action_dispatched',
          notes: 'Rescue coordinator authorized emergency boat transfers to Harborview Hospital high ground.'
        });
        return 'Shelter review verified by Human Coordinator. Transfer orders authorized.';
      }
    },
    {
      num: 9,
      title: 'Step 9: Analytics & AWS Telemetry Review',
      desc: 'Review mission completion metrics, fleet battery consumption, and live AWS IoT MQTT event streams.',
      actionLabel: 'View Mission Analytics',
      screen: 'analytics',
      run: async () => {
        return 'End-to-end disaster rescue cycle complete. All telemetry and mission logs audited.';
      }
    }
  ];

  const handleExecuteStep = async (step) => {
    setIsRunning(true);
    try {
      const msg = await step.run();
      setStepLogs(prev => ({ ...prev, [step.num]: msg }));
      if (step.screen) onNavigate(step.screen);
      onStateRefresh && onStateRefresh();
      if (currentStep < 9) setCurrentStep(step.num + 1);
    } catch (e) {
      setStepLogs(prev => ({ ...prev, [step.num]: `Error: ${e.message}` }));
    } finally {
      setIsRunning(false);
    }
  };

  const handleResetScenario = async () => {
    await resetSimulation();
    setCurrentStep(1);
    setStepLogs({});
    onNavigate('simulator');
    onStateRefresh && onStateRefresh();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#111C2D] border border-[#22354E] rounded-3xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 bg-gradient-to-r from-[#172438] via-[#111C2D] to-[#1F1833] border-b border-[#22354E] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FF8A24]/15 border border-[#FF8A24]/40 flex items-center justify-center text-xl">
              🎃
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                Operational Mission Scenario
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#FF8A24]/15 text-[#FF8A24] border border-[#FF8A24]/30">
                  9-STEP WALKTHROUGH
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Execute the repeatable Halloween flood rescue sequence end-to-end.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#172438] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Steps List */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1 bg-[#0B1220]/60">
          {steps.map((s) => {
            const isCompleted = !!stepLogs[s.num];
            const isCurrent = currentStep === s.num;

            return (
              <div
                key={s.num}
                className={`p-4 rounded-2xl border transition-all ${
                  isCurrent
                    ? 'bg-[#172438] border-[#FF8A24] shadow-lg shadow-[#FF8A24]/10'
                    : isCompleted
                    ? 'bg-[#172438]/60 border-[#10B981]/40'
                    : 'bg-[#172438]/30 border-[#22354E] opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-[#10B981]" />
                      ) : (
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold font-mono ${
                          isCurrent ? 'bg-[#FF8A24] text-slate-950 font-black' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {s.num}
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-white flex items-center gap-2">
                        {s.title}
                        {isCurrent && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#FF8A24]/20 text-[#FF8A24] border border-[#FF8A24]/40">
                            CURRENT STEP
                          </span>
                        )}
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-1 leading-snug">{s.desc}</p>
                      {stepLogs[s.num] && (
                        <div className="mt-2 text-[11px] font-mono text-[#10B981] bg-[#10B981]/10 border border-[#10B981]/30 rounded-lg p-2">
                          ✓ {stepLogs[s.num]}
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    disabled={isRunning}
                    onClick={() => handleExecuteStep(s)}
                    className={`shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                      isCurrent
                        ? 'bg-[#FF8A24] hover:bg-[#FF8A24]/90 text-slate-950 shadow-md shadow-[#FF8A24]/20'
                        : 'bg-[#111C2D] hover:bg-slate-700 text-slate-200 border border-[#22354E]'
                    }`}
                  >
                    <span>{s.actionLabel}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 bg-[#172438] border-t border-[#22354E] flex items-center justify-between">
          <button
            onClick={handleResetScenario}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#111C2D] border border-[#22354E] hover:border-[#FF8A24]/40 text-slate-300 text-xs font-mono transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#FF8A24]" />
            <span>Reset Demo Scenario</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[#111C2D] hover:bg-slate-700 text-slate-200 text-xs font-bold cursor-pointer border border-[#22354E]"
          >
            Close & Explore
          </button>
        </div>
      </div>
    </div>
  );
}
