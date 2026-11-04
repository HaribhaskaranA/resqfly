import React, { useState } from 'react';
import {
  Shield, UserPlus, Lock, ChevronRight, Waves, Eye, EyeOff,
  CheckCircle2, AlertTriangle, Mail, Building2, IdCard, ArrowLeft
} from 'lucide-react';
import { authRegister, authVerifyOTP } from '../api/client';

const DEMO_IDS = [
  { id: 'GOV-DM-001', role: 'Command Center', hint: 'Demo coordinator' },
  { id: 'GOV-DM-002', role: 'Command Center', hint: 'Staff user' },
  { id: 'FR-001',     role: 'Field Rescue',   hint: 'Demo field unit' },
  { id: 'FR-002',     role: 'Field Rescue',   hint: 'Field personnel' },
];

export default function RegisterScreen({ onSwitchToLogin }) {
  const [step, setStep] = useState('register'); // 'register' | 'otp'
  const [form, setForm] = useState({
    full_name: '', email: '', department: '', gov_id: '', password: '', confirm_password: ''
  });
  const [otp, setOtp] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [demoOtp, setDemoOtp] = useState(null);

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');

    if (form.password !== form.confirm_password) {
      setError('Passwords do not match.'); return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.'); return;
    }

    setLoading(true);
    try {
      const res = await authRegister({
        full_name: form.full_name,
        email: form.email,
        department: form.department,
        gov_id: form.gov_id.trim().toUpperCase(),
        password: form.password,
        role: 'command_center'
      });

      if (res.success) {
        setDemoOtp(res.otp_code); // Simulated demo display
        setSuccess(res.message);
        setStep('otp');
      } else {
        setError(res.error || 'Registration failed.');
      }
    } catch (err) {
      setError('Could not connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (otp.length !== 6) { setError('Enter the 6-digit OTP.'); return; }

    setLoading(true);
    try {
      const res = await authVerifyOTP(form.gov_id.trim().toUpperCase(), otp);
      if (res.success) {
        setSuccess('Identity verified! Redirecting to login…');
        setTimeout(() => onSwitchToLogin(), 1800);
      } else {
        setError(res.error || 'OTP verification failed.');
      }
    } catch (err) {
      setError('Server error. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1220] flex flex-col justify-between relative overflow-hidden select-none">
      {/* BG glows */}
      <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-[#A855F7]/6 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 left-1/4 w-[400px] h-[400px] bg-[#35D6F2]/5 rounded-full blur-[120px] pointer-events-none" />

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
            <p className="text-[10px] text-slate-400 font-mono tracking-tight uppercase">Personnel Registration Portal</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400 px-3 py-1.5 rounded-xl bg-[#172438] border border-[#22354E]">
          <Waves className="w-4 h-4 text-[#35D6F2]" />
          <span>GOV ID VERIFICATION REQUIRED</span>
        </div>
      </header>

      <main className="max-w-lg w-full mx-auto p-6 z-10 my-auto">
        {/* Allowed IDs hint */}
        <div className="mb-4 p-3 rounded-xl bg-[#172438] border border-[#35D6F2]/20">
          <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <IdCard className="w-3 h-3 text-[#35D6F2]" /> Authorized Government ID Formats
          </p>
          <div className="flex flex-wrap gap-1.5">
            {DEMO_IDS.map(d => (
              <button
                key={d.id}
                onClick={() => setForm(prev => ({ ...prev, gov_id: d.id }))}
                className="text-[9px] font-mono px-2 py-1 rounded-lg bg-[#111C2D] border border-[#22354E] hover:border-[#35D6F2]/50 text-slate-300 transition-colors cursor-pointer"
              >
                {d.id} <span className="text-slate-500">({d.hint})</span>
              </button>
            ))}
          </div>
          <p className="text-[9px] text-slate-500 mt-1 font-mono">GOV-DM-001…050 = Command Center &nbsp;|&nbsp; FR-001…100 = Field Rescue</p>
        </div>

        <div className="panel-card p-6 sm:p-8 border-[#A855F7]/20 shadow-2xl">
          <div className="text-center mb-6">
            <h1 className="text-xl font-black text-white tracking-wide flex items-center justify-center gap-2">
              <UserPlus className="w-5 h-5 text-[#A855F7]" />
              {step === 'register' ? 'Create Authorized Account' : 'Verify Your Identity'}
            </h1>
            <p className="text-xs text-[#A855F7] font-mono mt-1">
              {step === 'register' ? 'Government ID Authentication Required' : 'Enter the 6-digit OTP sent to your email'}
            </p>
          </div>

          {/* Error / Success */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-[#FF4D5D]/10 border border-[#FF4D5D]/30 flex items-center gap-2 text-xs text-[#FF4D5D]">
              <AlertTriangle className="w-4 h-4 shrink-0" />{error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 rounded-xl bg-[#10B981]/10 border border-[#10B981]/30 flex items-center gap-2 text-xs text-[#10B981]">
              <CheckCircle2 className="w-4 h-4 shrink-0" />{success}
            </div>
          )}

          {step === 'register' ? (
            <form onSubmit={handleRegister} className="space-y-3">
              {[
                { name: 'full_name', label: 'Full Name', placeholder: 'Commander Alex Reyes', icon: <Shield className="w-3.5 h-3.5" /> },
                { name: 'email', label: 'Official Email', placeholder: 'a.reyes@eoc.gov', icon: <Mail className="w-3.5 h-3.5" /> },
                { name: 'department', label: 'Department / Agency', placeholder: 'Emergency Operations Center', icon: <Building2 className="w-3.5 h-3.5" /> },
                { name: 'gov_id', label: 'Government ID Number', placeholder: 'GOV-DM-001', icon: <IdCard className="w-3.5 h-3.5" /> },
              ].map(f => (
                <div key={f.name}>
                  <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1 text-[#35D6F2]">
                    {f.icon}{f.label}
                  </label>
                  <input
                    type="text"
                    name={f.name}
                    value={form[f.name]}
                    onChange={handleChange}
                    placeholder={f.placeholder}
                    required
                    className="w-full bg-[#111C2D] border border-[#22354E] focus:border-[#35D6F2]/60 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition-colors font-mono"
                  />
                </div>
              ))}

              {/* Password */}
              <div>
                <label className="text-[10px] font-mono text-[#35D6F2] uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5" />Password
                </label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Min. 6 characters"
                    required
                    className="w-full bg-[#111C2D] border border-[#22354E] focus:border-[#35D6F2]/60 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition-colors font-mono pr-10"
                  />
                  <button type="button" onClick={() => setShowPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-mono text-[#35D6F2] uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5" />Confirm Password
                </label>
                <input
                  type={showPw ? 'text' : 'password'}
                  name="confirm_password"
                  value={form.confirm_password}
                  onChange={handleChange}
                  placeholder="Repeat password"
                  required
                  className="w-full bg-[#111C2D] border border-[#22354E] focus:border-[#35D6F2]/60 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition-colors font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#A855F7] to-[#35D6F2] hover:brightness-110 text-white font-black text-sm shadow-xl flex items-center justify-center gap-2 transition-all cursor-pointer mt-2 disabled:opacity-60"
              >
                {loading ? <span className="animate-pulse">Verifying Gov ID…</span> : <><UserPlus className="w-4 h-4" /><span>Register Account</span><ChevronRight className="w-4 h-4" /></>}
              </button>
            </form>
          ) : (
            /* OTP Step */
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              {demoOtp && (
                <div className="p-3 rounded-xl bg-[#FF8A24]/10 border border-[#FF8A24]/30 text-center">
                  <p className="text-[10px] text-slate-400 font-mono uppercase">Demo Simulated OTP (would be emailed)</p>
                  <p className="text-2xl font-black text-[#FF8A24] tracking-[0.3em] mt-1 font-mono">{demoOtp}</p>
                </div>
              )}
              <div>
                <label className="text-[10px] font-mono text-[#35D6F2] uppercase tracking-wider mb-1 block">
                  Enter 6-Digit OTP
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  className="w-full bg-[#111C2D] border border-[#22354E] focus:border-[#A855F7]/60 rounded-xl px-3 py-3 text-2xl text-center text-white tracking-[0.3em] outline-none font-mono"
                />
              </div>
              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#A855F7] to-[#35D6F2] hover:brightness-110 text-white font-black text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {loading ? <span className="animate-pulse">Verifying…</span> : <><CheckCircle2 className="w-4 h-4" />Verify & Activate Account</>}
              </button>
              <button type="button" onClick={() => { setStep('register'); setError(''); setSuccess(''); }} className="w-full text-xs text-slate-500 hover:text-slate-300 flex items-center justify-center gap-1 mt-1 cursor-pointer">
                <ArrowLeft className="w-3 h-3" />Back to registration
              </button>
            </form>
          )}

          <div className="mt-5 text-center">
            <button onClick={onSwitchToLogin} className="text-xs text-slate-500 hover:text-slate-300 flex items-center justify-center gap-1 mx-auto cursor-pointer">
              <ArrowLeft className="w-3 h-3" />Already registered? Sign In
            </button>
          </div>
        </div>
      </main>

      <footer className="p-4 text-center text-xs text-slate-500 border-t border-[#22354E] z-10 font-mono">
        RESQFLY Secure Personnel Registry • Authorized Government Personnel Only
      </footer>
    </div>
  );
}
