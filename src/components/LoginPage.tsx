import React, { useState } from 'react';
import { Lock, Sparkles, ArrowRight, UserCheck, AlertCircle } from 'lucide-react';
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
  const [fullName, setFullName] = useState<string>('');
  const [officialEmail, setOfficialEmail] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Validate Full Name: Only alphabets and spaces
  const isValidFullName = (name: string): boolean => {
    const trimmed = name.trim();
    if (!trimmed) return false;
    return /^[A-Za-z\s]+$/.test(trimmed);
  };

  // Validate Official Email: strictly name@quantumphinance.com
  const isValidOfficialEmail = (email: string): boolean => {
    const norm = email.trim().toLowerCase();
    if (!norm) return false;
    // Strictly must match name@quantumphinance.com (disallow .co.in, gmail, etc.)
    const emailRegex = /^[a-zA-Z0-9._%+-]+@quantumphinance\.com$/;
    return emailRegex.test(norm);
  };

  // Handle Full Name Input (restrict non-alphabetic/non-space chars on typing)
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Allow typing only if empty or letters and spaces
    if (val === '' || /^[A-Za-z\s]+$/.test(val)) {
      setFullName(val);
      if (errorMessage) setErrorMessage(null);
    } else {
      setErrorMessage('Full Name can only contain alphabets and spaces (no numbers or special characters).');
    }
  };

  // Handle Login Submit
  const handleLoginSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    const nameTrimmed = fullName.trim();
    const emailTrimmed = officialEmail.trim().toLowerCase();

    // 1. Validate Full Name
    if (!nameTrimmed) {
      setErrorMessage('Please enter your Full Name.');
      return;
    }

    if (!isValidFullName(nameTrimmed)) {
      setErrorMessage('Invalid Full Name: Only alphabets and spaces are allowed (e.g. "Maseera Sayyed"). Numbers and special characters are restricted.');
      return;
    }

    // 2. Validate Official Email
    if (!emailTrimmed) {
      setErrorMessage('Please enter your Official Email ID.');
      return;
    }

    if (!isValidOfficialEmail(emailTrimmed)) {
      setErrorMessage('Invalid Email: Only official @quantumphinance.com email addresses are allowed (e.g. name@quantumphinance.com). Other domains like @gmail.com or @quantumphinance.co.in are restricted.');
      return;
    }

    // Match registered user or create user profile
    const matched = REGISTERED_USERS.find((u) => u.email.toLowerCase() === emailTrimmed);
    let userProfile: UserProfile;

    if (matched) {
      userProfile = {
        ...matched,
        name: nameTrimmed, // preserve validated user name
      };
    } else {
      const derivedRole = getRoleByEmail(emailTrimmed);
      userProfile = {
        name: nameTrimmed,
        email: emailTrimmed,
        role: derivedRole,
        department: 'Quality Assurance',
        status: 'Active',
        joiningDate: new Date().toISOString().split('T')[0],
      };
    }

    onLoginSuccess(userProfile);
  };

  // Quick Select Preset User
  const handleQuickSelectUser = (user: UserProfile) => {
    setFullName(user.name);
    setOfficialEmail(user.email);
    setErrorMessage(null);

    // Perform login directly
    onLoginSuccess(user);
  };

  return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center p-4 font-sans select-none">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-fadeIn">
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 border-b border-slate-800 text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center mx-auto text-blue-400">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black tracking-tight">QA HUB</h1>
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
            Beacon Quality Hub • Official Email Login
          </p>
        </div>

        {/* Requested Page Redirect Notice */}
        <div className="bg-blue-50 border-b border-blue-100 p-3.5 text-center text-xs text-blue-900 font-medium flex items-center justify-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
          <span>
            Please authenticate to access <strong>{requestedTargetTabLabel}</strong>.
          </span>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLoginSubmit} className="p-6 space-y-4 text-xs">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 font-semibold text-xs flex items-start gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Field 1: Full Name */}
          <div className="space-y-1">
            <label className="block font-bold text-slate-700">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={fullName}
              onChange={handleNameChange}
              placeholder="e.g. Maseera Sayyed"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-900"
            />
            <p className="text-[10px] text-slate-400">Only alphabets and spaces allowed (no numbers or special characters).</p>
          </div>

          {/* Field 2: Official Email ID */}
          <div className="space-y-1">
            <label className="block font-bold text-slate-700" title="Format: name@quantumphinance.com">
              Official Email ID <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={officialEmail}
              onChange={(e) => {
                setOfficialEmail(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="name@quantumphinance.com"
              title="Format: name@quantumphinance.com"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-900 font-mono"
            />
            <p className="text-[10px] text-slate-400" title="Format: name@quantumphinance.com">
              Must end with @quantumphinance.com (e.g. name@quantumphinance.com)
            </p>
          </div>

          {/* Note: NO Password field per requirement */}

          <button
            type="submit"
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-colors mt-2"
          >
            <span>Authenticate &amp; Open {requestedTargetTabLabel}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 text-center text-[10px] text-slate-400">
          Quantum Phinance Official SSO Authentication • Security &amp; Role Access Control
        </div>
      </div>
    </div>
  );
};
