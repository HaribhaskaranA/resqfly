import React, { useState } from 'react';
import {
  LifeBuoy,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  Users,
  Compass,
  ArrowRight,
  Sparkles,
  MapPin,
  Clock,
  ShieldAlert,
  Anchor
} from 'lucide-react';
import { verifyShelter, acknowledgeAlert, dispatchRescueMission } from '../api/client';

export default function RescueScreen({ shelters = [], alerts = [], onStateRefresh, onNavigate }) {
  const [evacPlanStatus, setEvacPlanStatus] = useState('review');
  const [toast, setToast] = useState(null);
  const [teams, setTeams] = useState([
    {
      id: 'TEAM-ALPHA',
      name: 'Coastal Rescue Boat Team Alpha',
      asset: 'Twin-Engine Inflatable Flood Craft (Capacity: 12)',
      status: 'en_route',
      target: 'North Haven Community School (SHELTER-01)',
      eta: '8 mins'
    },
    {
      id: 'TEAM-BRAVO',
      name: 'High-Water Evacuation Transporter Bravo',
      asset: '6x6 Amphibious Vehicle (Capacity: 25)',
      status: 'standby',
      target: 'West Pier Sector #14',
      eta: 'Standby at Base'
    },
    {
      id: 'TEAM-CHARLIE',
      name: 'Disaster Medical Response Unit',
      asset: 'Mobile Triage Unit (Hospital Grounds)',
      status: 'active',
      target: 'Harborview Regional Emergency Hospital',
      eta: 'On-site'
    }
  ]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const criticalAlerts = alerts.filter(a => a.level === 'critical');

  const handleAuthorizeRelocation = async () => {
    try {
      await verifyShelter('SHELTER-01', {
        status: 'action_dispatched',
        notes: 'Rescue Coordinator approved designated relocation plan: 130 occupants from School diverted to Harborview Hospital high ground.'
      });
      setEvacPlanStatus('authorized');
      showToast('Relocation Plan Authorized — Diversion Protocol Initiated!', 'success');
      onStateRefresh && onStateRefresh();
    } catch (e) {
      showToast('Error authorizing relocation: ' + e.message, 'error');
    }
  };

  const handleAcknowledgeAlert = async (alertId, title) => {
    try {
      await acknowledgeAlert(alertId);
      showToast(`Alert Acknowledged: ${title}`, 'success');
      onStateRefresh && onStateRefresh();
    } catch (e) {
      showToast('Error acknowledging alert: ' + e.message, 'error');
    }
  };

  const handleDeployTeamBoat = async (teamId) => {
    try {
      await dispatchRescueMission({
        action: 'DISPATCH_RESCUE_BOAT',
        sector: 'West Pier Sector #14',
        status: 'en_route',
        asset: 'High-Water Evacuation Transporter Bravo',
        notes: 'Dispatched from Rescue Coordination Screen'
      });
      setTeams(prev => prev.map(t => t.id === teamId ? { ...t, status: 'en_route', eta: '12 mins' } : t));
      showToast(`Team ${teamId} Deployed! Rescue craft en route to target sector.`, 'success');
      onStateRefresh && onStateRefresh();
    } catch (e) {
      showToast('Deployment error: ' + e.message, 'error');
    }
  };

  const handleConfirmTeamEvacuation = async (teamId) => {
    try {
      setTeams(prev => prev.map(t => t.id === teamId ? { ...t, status: 'completed', eta: 'Mission Completed' } : t));
      showToast(`Team ${teamId} confirmed target evacuation! Area secured.`, 'success');
      onStateRefresh && onStateRefresh();
    } catch (e) {
      showToast('Evacuation confirmation error: ' + e.message, 'error');
    }
  };

  return (
    <div className="p-6 space-y-6 overflow-y-auto max-h-screen bg-[#0B1220] relative">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-2xl shadow-2xl border text-sm font-bold flex items-center gap-3 backdrop-blur-md animate-fade-in ${
          toast.type === 'error'
            ? 'bg-[#FF4D5D]/20 border-[#FF4D5D] text-white shadow-[#FF4D5D]/20'
            : 'bg-[#10B981]/20 border-[#10B981] text-white shadow-[#10B981]/20'
        }`}>
          <CheckCircle2 className={`w-5 h-5 ${toast.type === 'error' ? 'text-[#FF4D5D]' : 'text-[#10B981]'}`} />
          <span>{toast.message}</span>
        </div>
      )}
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-white flex items-center gap-2.5">
            <LifeBuoy className="w-5 h-5 text-[#FF8A24]" />
            <span>Rescue Coordination & Incident Command</span>
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Multi-agency coordination, designated shelter evacuations, and field rescue team dispatch.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono px-3.5 py-1.5 rounded-xl bg-[#172438] border border-[#22354E]">
          <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
          <span className="text-slate-300">Incident EOC: Operational Command Active</span>
        </div>
      </div>

      {/* Critical Alert Escalation Section */}
      {criticalAlerts.length > 0 && (
        <div className="panel-card p-5 border-[#FF4D5D]/50 bg-[#FF4D5D]/5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#FF4D5D] animate-bounce" />
              <h2 className="text-xs font-mono font-bold text-[#FF4D5D] uppercase tracking-wider">
                Immediate Critical Escalation Requiring Coordinator Action
              </h2>
            </div>
            <span className="text-[10px] font-mono text-[#FF4D5D] font-bold">
              {criticalAlerts.length} Action Items Pending
            </span>
          </div>

          <div className="space-y-2">
            {criticalAlerts.map((a) => (
              <div key={a.id} className="p-3.5 rounded-xl bg-[#111C2D] border border-[#FF4D5D]/40 flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-bold text-white">{a.title}</div>
                  <div className="text-[11px] text-slate-300 mt-0.5">{a.message}</div>
                </div>

                {!a.acknowledged && (
                  <button
                    onClick={() => handleAcknowledgeAlert(a.id, a.title)}
                    className="shrink-0 px-3 py-1.5 rounded-xl bg-[#FF4D5D] hover:bg-[#FF4D5D]/90 text-white font-bold text-xs cursor-pointer shadow-md transition-all active:scale-95"
                  >
                    Acknowledge Alert
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommended Shelter Relocation Plan */}
      <div className="panel-card p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-[#22354E] pb-3">
          <div>
            <span className="text-xs font-mono text-[#FF8A24] uppercase font-bold">
              Automated Decision Support Recommendation
            </span>
            <h2 className="text-base font-black text-white mt-0.5">
              Designated Shelter Evacuation & High-Ground Diversion Plan
            </h2>
          </div>

          <span className={`px-3 py-1 rounded-xl text-xs font-mono font-bold uppercase border ${
            evacPlanStatus === 'authorized'
              ? 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/50'
              : 'bg-[#FF8A24]/15 text-[#FF8A24] border-[#FF8A24]/50'
          }`}>
            {evacPlanStatus === 'authorized' ? 'Plan Authorized' : 'Pending Coordinator Authorization'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono items-center">
          {/* Submerged Source */}
          <div className="p-4 rounded-xl bg-[#111C2D] border border-[#FF4D5D]/40">
            <span className="text-[#FF4D5D] font-bold block text-[10px] uppercase">Evacuate Source</span>
            <h3 className="text-white font-bold text-sm mt-1">North Haven Community School</h3>
            <p className="text-[11px] text-slate-400 mt-1">130 occupants • Water breach risk 82/100</p>
          </div>

          {/* Transfer Corridor */}
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center gap-2 text-[#35D6F2] font-bold text-xs">
              <span>Boat Transfer Corridor Alpha</span>
              <ArrowRight className="w-4 h-4" />
            </div>
            <p className="text-[10px] text-slate-500">Route verified safe above 6.0m elevation mark</p>
          </div>

          {/* Safe Target */}
          <div className="p-4 rounded-xl bg-[#111C2D] border border-[#10B981]/40">
            <span className="text-[#10B981] font-bold block text-[10px] uppercase">Designated Safe Haven</span>
            <h3 className="text-white font-bold text-sm mt-1">Harborview Regional Emergency Hospital</h3>
            <p className="text-[11px] text-slate-400 mt-1">High fortress elevation (6.2m) • Medical staff on site</p>
          </div>
        </div>

        <div className="pt-3 border-t border-[#22354E] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-xs text-slate-400">
            Human Coordinator must explicitly authorize multi-agency field diversion order.
          </p>

          <button
            disabled={evacPlanStatus === 'authorized'}
            onClick={handleAuthorizeRelocation}
            className={`py-2.5 px-4 rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer transition-all ${
              evacPlanStatus === 'authorized'
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-[#FF8A24] to-[#A855F7] hover:brightness-110 text-white shadow-lg shadow-[#FF8A24]/20'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{evacPlanStatus === 'authorized' ? 'Evacuation Order Dispatched' : 'Authorize Relocation Order'}</span>
          </button>
        </div>
      </div>

      {/* Field Rescue Teams Status */}
      <div className="panel-card p-6 space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
          Assigned First-Responder Ground & Boat Units
        </h2>

        <div className="space-y-3">
          {teams.map((team) => (
            <div
              key={team.id}
              className="p-4 rounded-xl bg-[#111C2D] border border-[#22354E] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-[#FF8A24]">{team.id}</span>
                  <span className="font-bold text-white text-sm">{team.name}</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">{team.asset}</div>
                <div className="text-[11px] text-[#35D6F2] font-mono mt-1">Assigned Target: {team.target}</div>
              </div>

              <div className="text-right shrink-0 flex flex-col items-end">
                <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono uppercase border ${
                  team.status === 'completed'
                    ? 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/40'
                    : team.status === 'en_route'
                    ? 'bg-[#35D6F2]/15 text-[#35D6F2] border-[#35D6F2]/40'
                    : 'bg-[#172438] text-slate-300 border-[#22354E]'
                }`}>
                  {team.status}
                </span>
                <span className="block text-[11px] text-slate-400 font-mono mt-1">ETA: {team.eta}</span>

                {team.status === 'standby' && (
                  <button
                    onClick={() => handleDeployTeamBoat(team.id)}
                    className="mt-2 py-1.5 px-3 rounded-lg bg-gradient-to-r from-[#FF8A24] to-[#A855F7] text-white font-bold text-[11px] flex items-center gap-1.5 cursor-pointer hover:brightness-110 shadow-md transition-all active:scale-95"
                  >
                    <Anchor className="w-3.5 h-3.5" />
                    <span>Deploy Rescue Boat</span>
                  </button>
                )}

                {team.status === 'en_route' && (
                  <button
                    onClick={() => handleConfirmTeamEvacuation(team.id)}
                    className="mt-2 py-1.5 px-3 rounded-lg bg-[#10B981] text-slate-950 font-black text-[11px] flex items-center gap-1.5 cursor-pointer hover:bg-[#10B981]/90 shadow-md transition-all active:scale-95"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-slate-950" />
                    <span>Confirm Evacuation</span>
                  </button>
                )}

                {team.status === 'completed' && (
                  <div className="mt-2 text-[10px] text-[#10B981] font-mono font-bold flex items-center justify-end gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
                    <span>Evacuated • Safe</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
