import React, { useState } from 'react';
import {
  Shield, Sparkles, Lock, ChevronRight, Waves, Eye, EyeOff,
  AlertTriangle, IdCard, UserPlus, Zap
} from 'lucide-react';
import { authLogin } from '../api/client';

const DEMO_ACCOUNTS = [
  { gov_id: 'GOV-DM-001', password: 'Demo@1234', role: 'command_center', label: 'Commander Alex Reyes', badge: 'Command Center' },
  { gov_id: 'FR-001',     password: 'Field@1234', role: 'field_rescue',   label: 'Sgt. Priya Nair',      badge: 'Field Rescue' },
];

export default function LoginScreen({ onLogin, onSwitchToRegister }) {
  const [govId, setGovId]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    if (!govId.trim() || !password) { setError('Please enter Government ID and password.'); return; }
    setLoading(true);
    try {
      const res = await authLogin(govId.trim().toUpperCase(), password);
      if (res.success) {
        onLogin({
          token: res.token,
          role: res.role,
          name: res.full_name,
          gov_id: res.gov_id,
          department: res.department,
          callsign: res.role === 'command_center' ? 'EOC-ALPHA-01' : 'FRU-BRAVO-01'
        });
      } else {
        setError(res.error || 'Authentication failed.');
      }
    } catch (err) {
      setError('Could not connect to server.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (demo) => {
    setError('');
    setLoading(true);
    try {
      const res = await authLogin(demo.gov_id, demo.password);
      if (res.success) {
        onLogin({
          token: res.token,
          role: res.role,
          name: res.full_name,
          gov_id: res.gov_id,
          department: res.department,
          callsign: res.role === 'command_center' ? 'EOC-ALPHA-01' : 'FRU-BRAVO-01'
        });
      } else {
        setError(res.error || 'Demo login failed.');
      }
    } catch (err) {
      setError('Server error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1220] flex flex-col justify-between relative overflow-hidden select-none">
      {/* BG glows */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#FF8A24]/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[500px] h-[500px] bg-[#A855F7]/8 rounded-full blur-[140px] pointer-events-none" />

      {/* Header */}
      <header className="p-6 flex items-center justify-between border-b border-[#22354E] z-10 bg-[#111C2D]/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF8A24] via-[#E06D14] to-[#A855F7] p-0.5 flex items-center justify-center shadow-lg shadow-[#FF8A24]/15">
            <div className="w-full h-full bg-[#111C2D] rounded-[10px] flex items-center justify-center text-xl">🎃</div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-xl tracking-wider text-white">RESQ</span>
              <span className="font-black text-xl text-[#FF8A24]">FLY</span>
              <span className="ml-1 text-[9px] font-mono px-2 py-0.5 rounded bg-[#FF8A24]/15 text-[#FF8A24] border border-[#FF8A24]/30 font-bold">ENTERPRISE</span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono tracking-tight uppercase">Intelligent Multi-Drone Disaster Rescue & Relief System</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400 px-3 py-1.5 rounded-xl bg-[#172438] border border-[#22354E]">
          <Waves className="w-4 h-4 text-[#35D6F2]" />
          <span>SCENARIO: NORTH HAVEN COASTAL INUNDATION</span>
        </div>
      </header>

      <main className="max-w-md w-full mx-auto p-6 z-10 my-auto">
        {/* Quick Demo Buttons */}
        <div className="mb-4 space-y-2">
          <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider text-center mb-2 flex items-center justify-center gap-1">
            <Zap className="w-3 h-3 text-[#FF8A24]" />Quick Hackathon Demo Access
          </p>
          {DEMO_ACCOUNTS.map(demo => (
            <button
              key={demo.gov_id}
              onClick={() => handleDemoLogin(demo)}
              disabled={loading}
              className={`w-full py-3 px-4 rounded-xl border flex items-center justify-between gap-2 transition-all cursor-pointer disabled:opacity-60 ${
                demo.role === 'command_center'
                  ? 'bg-gradient-to-r from-[#FF8A24]/15 to-[#FF8A24]/5 border-[#FF8A24]/40 hover:border-[#FF8A24]'
                  : 'bg-gradient-to-r from-[#35D6F2]/10 to-[#35D6F2]/5 border-[#35D6F2]/30 hover:border-[#35D6F2]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Sparkles className={`w-4 h-4 ${demo.role === 'command_center' ? 'text-[#FF8A24]' : 'text-[#35D6F2]'}`} />
                <div className="text-left">
                  <p className="text-xs font-bold text-white">{demo.label}</p>
                  <p className="text-[10px] text-slate-400 font-mono">{demo.gov_id}</p>
                </div>
              </div>
              <span className={`text-[9px] font-mono px-2 py-0.5 rounded border ${
                demo.role === 'command_center'
                  ? 'bg-[#FF8A24]/15 text-[#FF8A24] border-[#FF8A24]/30'
                  : 'bg-[#35D6F2]/15 text-[#35D6F2] border-[#35D6F2]/30'
              }`}>{demo.badge}</span>
            </button>
          ))}
        </div>

        {/* Auth Card */}
        <div className="panel-card p-6 sm:p-8 border-[#FF8A24]/30 shadow-2xl">
          <div className="text-center mb-5">
            <h1 className="text-xl font-black text-white tracking-wide">DISASTER OPERATIONS PORTAL</h1>
            <p className="text-xs text-[#FF8A24] font-mono mt-1 font-semibold">"Every Location Matters. Every Life Matters."</p>
          </div>

          <div className="flex items-center gap-4 my-4">
            <div className="flex-1 h-[1px] bg-[#22354E]" />
            <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Or Sign In Manually</span>
            <div className="flex-1 h-[1px] bg-[#22354E]" />
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-[#FF4D5D]/10 border border-[#FF4D5D]/30 flex items-center gap-2 text-xs text-[#FF4D5D]">
              <AlertTriangle className="w-4 h-4 shrink-0" />{error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-3">
            <div>
              <label className="text-[10px] font-mono text-[#35D6F2] uppercase tracking-wider mb-1 flex items-center gap-1">
                <IdCard className="w-3.5 h-3.5" />Government ID Number
              </label>
              <input
                type="text"
                value={govId}
                onChange={e => setGovId(e.target.value)}
                placeholder="GOV-DM-001 or FR-001"
                required
                className="w-full bg-[#111C2D] border border-[#22354E] focus:border-[#35D6F2]/60 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition-colors font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] font-mono text-[#35D6F2] uppercase tracking-wider mb-1 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5" />Password
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                  className="w-full bg-[#111C2D] border border-[#22354E] focus:border-[#35D6F2]/60 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition-colors font-mono pr-10"
                />
                <button type="button" onClick={() => setShowPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#FF8A24] to-[#A855F7] hover:brightness-110 text-white font-black text-sm shadow-xl shadow-[#FF8A24]/20 flex items-center justify-center gap-2 transition-all border border-[#FF8A24]/40 cursor-pointer mt-2 disabled:opacity-60"
            >
              {loading
                ? <span className="animate-pulse">Authenticating…</span>
                : <><Shield className="w-4 h-4" /><span>Authenticate</span><ChevronRight className="w-4 h-4" /></>
              }
            </button>
          </form>

          <div className="mt-5 text-center">
            <button
              onClick={onSwitchToRegister}
              className="text-xs text-slate-500 hover:text-slate-300 flex items-center justify-center gap-1 mx-auto cursor-pointer"
            >
              <UserPlus className="w-3 h-3" />New personnel? Create account
            </button>
          </div>
        </div>
      </main>

      <footer className="p-4 text-center text-xs text-slate-500 border-t border-[#22354E] z-10 font-mono">
        RESQFLY Multi-Drone System • Authorized Personnel Only • Halloween Coastal Flood Simulation
      </footer>
    </div>
  );
}
