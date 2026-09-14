import React, { useState } from 'react';
import { UserCheck, ShieldCheck, Mail, ArrowRight, Lock, Sparkles } from 'lucide-react';
import { UserProfile } from '../types';
import { REGISTERED_USERS, getRoleByEmail } from '../data/dbStore';

interface LoginPageProps {
  requestedTargetTabLabel?: string;
  onLoginSuccess: (user: UserProfile) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  requestedTargetTabLabel = 'QA Hub Workspace',
  onLoginSuccess,
}) => {
  const [inputEmail, setInputEmail] = useState<string>('maseerasayyed@quantumphinance.com');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLoginSubmit = (emailStr: string) => {
    setErrorMessage(null);
    const norm = emailStr.toLowerCase().trim();
    if (!norm) {
      setErrorMessage('Please enter your official email ID.');
      return;
    }

    if (!norm.endsWith('@quantumphinance.com') && !norm.includes('@quantum')) {
      setErrorMessage('Access Denied: Only authorized official company email IDs (@quantumphinance.com) are allowed.');
      return;
    }

    const matched = REGISTERED_USERS.find((u) => u.email.toLowerCase() === norm);
    let newUser: UserProfile;

    if (matched) {
      newUser = matched;
    } else {
      const derivedRole = getRoleByEmail(norm);
      const namePart = norm.split('@')[0].replace(/[._]/g, ' ');
      const capitalizedName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
      newUser = {
        name: capitalizedName,
        email: norm,
        role: derivedRole,
        department: 'Quality Assurance',
        status: 'Active',
        joiningDate: new Date().toISOString().split('T')[0],
      };
    }

    onLoginSuccess(newUser);
  };

  return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center p-4 font-sans select-none">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden space-y-0 animate-fadeIn">
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 border-b border-slate-800 text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center mx-auto text-blue-400">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black tracking-tight">QA HUB</h1>
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
            Beacon Quality Hub • Official Email Authentication
          </p>
        </div>

        {/* Redirect Notice Banner */}
        <div className="bg-blue-50 border-b border-blue-100 p-3.5 text-center text-xs text-blue-900 font-medium flex items-center justify-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
          <span>
            Please log in with your official email to access <strong>{requestedTargetTabLabel}</strong>.
          </span>
        </div>

        {/* Main Form Body */}
        <div className="p-6 space-y-5 text-xs">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 font-semibold text-xs animate-fadeIn">
              {errorMessage}
            </div>
          )}

          {/* Quick Select Registered Users */}
          <div className="space-y-2">
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Quick Select Registered Official Users:
            </label>

            <div className="space-y-2">
              {REGISTERED_USERS.map((u) => (
                <button
                  key={u.email}
                  onClick={() => handleLoginSubmit(u.email)}
                  className="w-full p-3 bg-slate-50 hover:bg-blue-50/70 border border-slate-200 hover:border-blue-400 rounded-xl flex items-center justify-between text-left transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-xs ${
                        u.role === 'Super Admin'
                          ? 'bg-purple-600'
                          : u.role === 'Senior QA' || u.role === 'Admin'
                          ? 'bg-emerald-600'
                          : 'bg-blue-600'
                      }`}
                    >
                      {u.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-xs">{u.name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{u.email}</div>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded uppercase ${
                      u.role === 'Super Admin'
                        ? 'bg-purple-100 text-purple-800'
                        : u.role === 'Senior QA' || u.role === 'Admin'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {u.role}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Manual Official Email Input */}
          <div className="pt-4 border-t border-slate-100 space-y-2">
            <label className="block font-bold text-slate-700">Or enter official company email ID:</label>
            <div className="space-y-2">
              <input
                type="email"
                value={inputEmail}
                onChange={(e) => setInputEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleLoginSubmit(inputEmail);
                }}
                placeholder="name@quantumphinance.com"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
              />

              <button
                onClick={() => handleLoginSubmit(inputEmail)}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-colors"
              >
                <span>Authenticate &amp; Open {requestedTargetTabLabel}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 text-center text-[11px] text-slate-400">
          Quantum Phinance Official SSO Authentication • Security &amp; Role Access Control
        </div>
      </div>
    </div>
  );
};
