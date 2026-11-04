import React from 'react';
import {
  LayoutDashboard,
  Box,
  Compass,
  Radio,
  Eye,
  ShieldAlert,
  PackageCheck,
  LifeBuoy,
  BarChart3,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Shield,
  Activity,
  Layers
} from 'lucide-react';

export default function Navigation({
  activeScreen,
  setActiveScreen,
  cloudStatus,
  onOpenDemoGuide,
  collapsed,
  setCollapsed
}) {
  const navItems = [
    { id: 'dashboard', label: 'Command Dashboard', icon: LayoutDashboard },
    { id: 'terrain', label: 'Tactical Terrain Map', icon: Layers, badge: 'Flight Live' },
    { id: 'simulator', label: '3D Flood Simulator', icon: Box, badge: '3D Live' },
    { id: 'fleet', label: 'Drone Fleet Mgmt', icon: Compass, count: '4 Drones' },
    { id: 'detection', label: 'Human Detection AI', icon: Eye, badge: 'YOLO' },
    { id: 'shelters', label: 'Shelter Safety Center', icon: ShieldAlert },
    { id: 'relief', label: 'Relief & Inventory', icon: PackageCheck },
    { id: 'rescue', label: 'Rescue Coordination', icon: LifeBuoy },
    { id: 'analytics', label: 'Analytics & History', icon: BarChart3 },
  ];

  const isAws = cloudStatus?.mode === 'aws_connected';

  return (
    <aside
      className={`h-screen bg-[#111C2D] border-r border-[#22354E] flex flex-col justify-between select-none shrink-0 transition-all duration-300 z-30 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Top Identity & Toggle */}
      <div>
        <div className="h-16 px-4 border-b border-[#22354E] flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            {/* Logo Emblem: Drone Propeller / Rescue Octagon */}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF8A24] via-[#E06D14] to-[#A855F7] p-0.5 flex items-center justify-center shadow-lg shadow-[#FF8A24]/15 shrink-0">
              <div className="w-full h-full bg-[#111C2D] rounded-[10px] flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[#FF8A24]/10" />
                <span className="text-xl">🎃</span>
              </div>
            </div>

            {!collapsed && (
              <div className="truncate">
                <div className="flex items-center gap-1">
                  <span className="font-black text-lg tracking-wider text-white">RESQ</span>
                  <span className="font-black text-lg text-[#FF8A24]">FLY</span>
                  <span className="ml-1 text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#FF8A24]/15 text-[#FF8A24] border border-[#FF8A24]/30 font-bold">
                    v1.0
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-mono tracking-tight uppercase">
                  Multi-Drone Rescue Core
                </p>
              </div>
            )}
          </div>

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#172438] transition-colors border border-transparent hover:border-[#22354E] cursor-pointer shrink-0"
            title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="px-3 space-y-1 mt-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeScreen === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveScreen(item.id)}
                className={`w-full flex items-center rounded-xl text-xs font-semibold transition-all cursor-pointer relative group ${
                  collapsed ? 'justify-center p-3' : 'justify-between px-3.5 py-2.5'
                } ${
                  isActive
                    ? 'bg-[#172438] text-white border border-[#FF8A24]/60 shadow-md shadow-[#FF8A24]/10'
                    : 'text-slate-400 hover:bg-[#172438]/60 hover:text-slate-200 border border-transparent'
                }`}
                title={collapsed ? item.label : undefined}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive ? 'text-[#FF8A24]' : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </div>

                {!collapsed && (
                  <div>
                    {item.badge && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-[#35D6F2]/10 border border-[#35D6F2]/30 text-[#35D6F2]">
                        {item.badge}
                      </span>
                    )}
                    {item.count && (
                      <span className="text-[10px] text-slate-500 font-mono">
                        {item.count}
                      </span>
                    )}
                  </div>
                )}

                {/* Collapsed Tooltip */}
                {collapsed && (
                  <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-[#172438] text-white text-xs font-semibold rounded-lg shadow-xl border border-[#22354E] whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                    {item.label}
                  </div>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Cloud & Architecture Status Footer */}
      <div className="p-3 border-t border-[#22354E] bg-[#0B1220]/70">
        <div className={`rounded-xl p-2.5 bg-[#172438] border border-[#22354E] ${collapsed ? 'text-center' : ''}`}>
          {!collapsed ? (
            <>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-slate-400 text-[10px] uppercase font-mono tracking-wider">AWS Cloud Core</span>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10B981]"></span>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Radio className="w-3.5 h-3.5 text-[#10B981] animate-pulse" />
                <span className="font-mono font-black text-[11px] text-[#10B981] tracking-tight">
                  AWS IoT Core: CONNECTED
                </span>
              </div>

              <div className="mt-1.5 pt-1.5 border-t border-[#22354E]/60 flex items-center justify-between text-[9px] font-mono">
                <span className="text-slate-400">DynamoDB: ACTIVE</span>
                <span className="text-[#FF8A24] font-bold">{cloudStatus?.region || 'ap-southeast-2'}</span>
              </div>
            </>
          ) : (
            <div className="flex justify-center" title="AWS IoT Core: CONNECTED (MQTT)">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-[#10B981]"></span>
              </span>
            </div>
          )}
        </div>

        {!collapsed && (
          <div className="mt-2 text-center text-[10px] text-slate-500 font-mono">
            Every Location Matters. Every Life Matters.
          </div>
        )}
      </div>
    </aside>
  );
}
