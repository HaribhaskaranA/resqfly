import React, { useState } from 'react';
import {
  Waves,
  Bell,
  User,
  Shield,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  LogOut,
  Radio,
  ExternalLink
} from 'lucide-react';

export default function Header({
  disaster,
  simState,
  alerts = [],
  userRole,
  onLogout,
  onOpenAlerts,
  onAcknowledgeAlert
}) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const unackAlerts = alerts.filter(a => !a.acknowledged);
  const criticalCount = unackAlerts.filter(a => a.level === 'critical').length;

  const roleTitle = userRole?.role === 'field_rescue' || userRole?.role === 'RESCUE_TEAM' || userRole?.role === 'FIELD_RESPONDER'
    ? 'FIELD RESCUE UNIT'
    : 'DISASTER COMMAND CENTER';

  const roleBadge = userRole?.role === 'field_rescue' || userRole?.role === 'RESCUE_TEAM' || userRole?.role === 'FIELD_RESPONDER'
    ? 'FIELD RESPONDER'
    : 'OPERATIONS COORDINATOR';

  return (
    <header className="h-16 bg-[#111C2D]/95 backdrop-blur-md border-b border-[#22354E] px-6 flex items-center justify-between z-30 relative select-none">
      {/* Left: Disaster Context & Status */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF4D5D] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-[#FF4D5D]"></span>
          </span>
          <span className="font-extrabold text-xs tracking-wider text-[#FF4D5D] uppercase font-mono">
            COMMAND CENTER • LIVE
          </span>
        </div>

        <div className="h-4 w-[1px] bg-[#22354E]" />

        <div className="flex items-center gap-2">
          <span className="text-white font-bold text-xs">
            {disaster?.name || 'Halloween Night Gale & Coastal Surge'}
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#FF8A24]/10 text-[#FF8A24] border border-[#FF8A24]/30 font-bold">
            {disaster?.severity || 'Category 3 Storm Surge'}
          </span>
        </div>
      </div>

      {/* Right: Telemetry Indicators, Notification Center, User Profile */}
      <div className="flex items-center gap-4">
        {/* AWS IoT Core Live Status Indicator */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#10B981]/15 border border-[#10B981]/40 text-xs font-mono text-[#10B981]">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10B981]"></span>
          </span>
          <span className="font-extrabold tracking-wider">AWS IoT Core: CONNECTED (MQTT)</span>
        </div>

        {/* Flood Water Elevation Indicator */}
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[#172438] border border-[#22354E] text-xs font-mono">
          <Waves className="w-4 h-4 text-[#35D6F2] animate-pulse" />
          <span className="text-slate-400 text-[11px]">WATER LEVEL:</span>
          <span className="font-black text-[#35D6F2] text-sm">
            {simState?.flood_water_level?.toFixed(2) || '1.20'}m
          </span>
          {simState?.flood_water_level > 2.0 && (
            <span className="px-1.5 py-0.2 rounded text-[9px] bg-[#FF4D5D]/20 text-[#FF4D5D] border border-[#FF4D5D]/40 font-bold uppercase">
              Surge Peak
            </span>
          )}
        </div>

        {/* Notification Center Trigger */}
        <div className="relative">
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-mono transition-all cursor-pointer ${
              criticalCount > 0
                ? 'bg-[#FF4D5D]/15 border-[#FF4D5D]/60 text-[#FF4D5D] shadow-lg shadow-[#FF4D5D]/10'
                : 'bg-[#172438] border-[#22354E] text-slate-300 hover:text-white hover:border-[#FF8A24]/40'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span className="font-bold">{unackAlerts.length} ALERTS</span>
            {criticalCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-[#FF4D5D] text-white text-[9px] font-black animate-pulse">
                {criticalCount} CRITICAL
              </span>
            )}
          </button>

          {/* Notifications Dropdown Panel */}
          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-88 bg-[#172438] border border-[#22354E] rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between pb-3 border-b border-[#22354E] mb-3">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-[#FF8A24]" />
                  <span className="text-xs font-bold font-mono text-white uppercase">Operational Alerts</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">{unackAlerts.length} Active</span>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {unackAlerts.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-xs font-mono">
                    <CheckCircle2 className="w-8 h-8 text-[#10B981] mx-auto mb-2" />
                    All operational alerts acknowledged.
                  </div>
                ) : (
                  unackAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-3 rounded-xl border text-xs ${
                        alert.level === 'critical'
                          ? 'bg-[#FF4D5D]/10 border-[#FF4D5D]/40 text-[#FF4D5D]'
                          : 'bg-[#111C2D] border-[#22354E] text-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-white leading-tight">{alert.title}</span>
                        <button
                          onClick={() => onAcknowledgeAlert && onAcknowledgeAlert(alert.id)}
                          className="text-[10px] font-mono text-[#35D6F2] hover:underline cursor-pointer shrink-0"
                        >
                          Acknowledge
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 leading-snug">{alert.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Verified User Credentials Badge (Strict Role Lock — No Unauthorized Switching) */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[#172438] border border-[#22354E]">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#FF8A24] to-[#A855F7] p-0.5 flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-[#111C2D] rounded-[6px] flex items-center justify-center">
                <Shield className="w-3.5 h-3.5 text-[#FF8A24]" />
              </div>
            </div>
            <div className="text-left hidden md:block">
              <div className="text-xs font-bold text-white leading-tight flex items-center gap-1.5">
                <span>{userRole?.name || userRole?.full_name || 'Rescue Coordinator'}</span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#35D6F2]/10 text-[#35D6F2] border border-[#35D6F2]/30 font-bold uppercase">
                  {roleBadge}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2">
                <span>ID: {userRole?.gov_id || userRole?.callsign || 'GOV-DM-001'}</span>
                {userRole?.department && (
                  <>
                    <span className="text-slate-600">•</span>
                    <span className="text-slate-400 truncate max-w-[150px]">{userRole.department}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Secure Logout / Exit Session Button */}
          <button
            onClick={() => onLogout && onLogout()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#172438] hover:bg-red-950/30 border border-[#22354E] hover:border-red-500/40 text-slate-300 hover:text-red-400 text-xs font-mono font-bold transition-all cursor-pointer"
            title="Secure Exit Session (Lock Terminal)"
          >
            <LogOut className="w-3.5 h-3.5 text-red-400" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
