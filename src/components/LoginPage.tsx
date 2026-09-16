import React, { useState, useEffect } from 'react';
import { Lock, Sparkles, ArrowRight, AlertCircle, ShieldAlert, CheckCircle2, User, ChevronRight, X, Loader2 } from 'lucide-react';
import { UserProfile } from '../types';
import { getSavedUserRegistry, saveUserToRegistry, SavedUserRecord } from '../data/dbStore';

interface LoginPageProps {
  requestedTargetTabLabel?: string;
  onLoginSuccess: (user: UserProfile) => void;
}

// Google Multicolor G SVG Icon
const GoogleIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

export const LoginPage: React.FC<LoginPageProps> = ({
  requestedTargetTabLabel = 'QA Hub Workspace',
  onLoginSuccess,
}) => {
  const [fullName, setFullName] = useState<string>('');
  const [officialEmail, setOfficialEmail] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lockedRole, setLockedRole] = useState<string | null>(null);
  const [savedUsers, setSavedUsers] = useState<SavedUserRecord[]>([]);

  // Google Sign-In state
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState<boolean>(false);
  const [isSigningInWithGoogle, setIsSigningInWithGoogle] = useState<boolean>(false);
  const [googleCustomEmail, setGoogleCustomEmail] = useState<string>('');
  const [googleCustomName, setGoogleCustomName] = useState<string>('');
  const [googleCustomRole, setGoogleCustomRole] = useState<string>('QA');
  const [showCustomGoogleInput, setShowCustomGoogleInput] = useState<boolean>(false);
  const [googleModalError, setGoogleModalError] = useState<string | null>(null);

  // Load saved users registry and pre-fill previous session
  useEffect(() => {
    const localSaved = getSavedUserRegistry();
    setSavedUsers(localSaved);

    // Fetch backend registered users to merge suggestions
    fetch('/api/users')
      .then((r) => r.json())
      .then((backendUsers) => {
        if (Array.isArray(backendUsers)) {
          const map = new Map<string, SavedUserRecord>();
          localSaved.forEach((u) => map.set(u.email.toLowerCase(), u));
          backendUsers.forEach((bu: any) => {
            if (bu.email) {
              const emailLower = bu.email.toLowerCase();
              if (!map.has(emailLower)) {
                map.set(emailLower, {
                  email: bu.email,
                  name: bu.name,
                  role: bu.role,
                });
              }
            }
          });
          setSavedUsers(Array.from(map.values()));
        }
      })
      .catch(() => {});

    // Preload last logged-in profile if present
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const lastUser = localStorage.getItem('qa_hub_last_user');
        if (lastUser) {
          const parsed = JSON.parse(lastUser);
          if (parsed && typeof parsed === 'object') {
            if (parsed.email) {
              handleEmailChange(parsed.email, localSaved);
            } else {
              if (parsed.name) setFullName(parsed.name);
              if (parsed.role) setSelectedRole(parsed.role);
            }
          }
        }
      }
    } catch (e) {
      // ignore
    }
  }, []);

  // Handle email changes: auto-suggest, auto-fill name & role from backend/saved registry
  const handleEmailChange = (rawEmail: string, registryList?: SavedUserRecord[]) => {
    setOfficialEmail(rawEmail);
    if (errorMessage) setErrorMessage(null);

    const clean = rawEmail.trim().toLowerCase();
    const listToSearch = registryList || savedUsers;
    const matched = listToSearch.find((u) => u.email.toLowerCase() === clean);

    if (matched) {
      // Auto-populate previously saved name and role
      setFullName(matched.name);
      setSelectedRole(matched.role);
      setLockedRole(matched.role);
    } else {
      setLockedRole(null);
      if (clean.includes('maseera')) {
        setFullName((prev) => prev || 'Maseera Sayyed');
        setSelectedRole('Super Admin');
        setLockedRole('Super Admin');
      }
    }
  };

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
    const emailRegex = /^[a-zA-Z0-9._%+-]+@quantumphinance\.com$/;
    return emailRegex.test(norm);
  };

  // Handle Full Name Input (restrict non-alphabetic/non-space chars on typing)
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '' || /^[A-Za-z\s]+$/.test(val)) {
      setFullName(val);
      if (errorMessage) setErrorMessage(null);
    } else {
      setErrorMessage('Full Name can only contain alphabets and spaces (no numbers or special characters).');
    }
  };

  // Handle Role Selection with Strict Multi-Role Restriction for same Email ID
  const handleRoleSelection = (newRole: string) => {
    const cleanEmail = officialEmail.trim().toLowerCase();
    const matched = savedUsers.find((u) => u.email.toLowerCase() === cleanEmail);

    if (matched && matched.role && newRole && newRole !== matched.role) {
      // Restrict: User with same email cannot choose another role
      setErrorMessage(
        `⛔ Access Restricted: Official email "${cleanEmail}" is already registered as "${matched.role}". You cannot select or switch to "${newRole}" with this email ID.`
      );
      setSelectedRole(matched.role);
      return;
    }

    if (lockedRole && newRole && newRole !== lockedRole) {
      setErrorMessage(
        `⛔ Access Restricted: This email is permanently assigned the role "${lockedRole}". You cannot choose a different role.`
      );
      setSelectedRole(lockedRole);
      return;
    }

    setSelectedRole(newRole);
    if (errorMessage) setErrorMessage(null);
  };

  // Handle Google Sign-in action
  const handleGoogleSignIn = (email: string, name: string, forcedRole?: string) => {
    setGoogleModalError(null);
    const cleanEmail = email.trim().toLowerCase();

    if (!isValidOfficialEmail(cleanEmail)) {
      setGoogleModalError('Only official @quantumphinance.com Google Workspace accounts are permitted.');
      return;
    }

    const matched = savedUsers.find((u) => u.email.toLowerCase() === cleanEmail);
    const roleToAssign = forcedRole || (matched ? matched.role : (cleanEmail.includes('maseera') ? 'Super Admin' : 'QA'));

    setIsSigningInWithGoogle(true);

    setTimeout(() => {
      const userProfile: UserProfile = {
        name: name.trim() || (cleanEmail.includes('maseera') ? 'Maseera Sayyed' : 'Quantum Team Member'),
        email: cleanEmail,
        role: roleToAssign as UserProfile['role'],
        department: roleToAssign === 'QA' ? 'Quality Assurance' : roleToAssign,
        status: 'Active',
        joiningDate: new Date().toISOString().split('T')[0],
      };

      saveUserToRegistry({
        email: cleanEmail,
        name: userProfile.name,
        role: roleToAssign as UserProfile['role'],
      });

      setIsSigningInWithGoogle(false);
      setIsGoogleModalOpen(false);
      onLoginSuccess(userProfile);
    }, 450);
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

    // 3. Strict Role Restriction Check for same email ID
    const matched = savedUsers.find((u) => u.email.toLowerCase() === emailTrimmed);
    if (matched && matched.role && selectedRole && selectedRole !== matched.role) {
      setErrorMessage(
        `⛔ Access Restricted: Email "${emailTrimmed}" is registered with role "${matched.role}". You cannot login with "${selectedRole}".`
      );
      setSelectedRole(matched.role);
      return;
    }

    const roleToAssign = lockedRole || (matched ? matched.role : (selectedRole || (emailTrimmed.includes('maseera') ? 'Super Admin' : 'QA')));

    const userProfile: UserProfile = {
      name: nameTrimmed,
      email: emailTrimmed,
      role: roleToAssign as UserProfile['role'],
      department: roleToAssign === 'QA' ? 'Quality Assurance' : roleToAssign,
      status: 'Active',
      joiningDate: new Date().toISOString().split('T')[0],
    };

    // Save/lock user in persistent registry
    saveUserToRegistry({
      email: emailTrimmed,
      name: nameTrimmed,
      role: roleToAssign as UserProfile['role'],
    });

    onLoginSuccess(userProfile);
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
            Beacon Quality Hub • Official Workspace Login
          </p>
        </div>

        {/* Requested Page Redirect Notice */}
        <div className="bg-blue-50 border-b border-blue-100 p-3.5 text-center text-xs text-blue-900 font-medium flex items-center justify-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
          <span>
            Please authenticate to access <strong>{requestedTargetTabLabel}</strong>.
          </span>
        </div>

        <div className="p-6 space-y-4 text-xs">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 font-semibold text-xs flex items-start gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Primary: Sign in with Google (Quantum Phinance SSO) */}
          <div className="space-y-1.5">
            <button
              type="button"
              id="btn-google-signin"
              onClick={() => {
                setGoogleModalError(null);
                setShowCustomGoogleInput(false);
                setIsGoogleModalOpen(true);
              }}
              className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-800 font-semibold text-xs rounded-xl border border-slate-300 shadow-sm flex items-center justify-center gap-3 transition-all hover:border-slate-400 hover:shadow cursor-pointer active:scale-[0.99] group"
            >
              <GoogleIcon className="w-5 h-5 shrink-0" />
              <div className="flex items-center gap-2">
                <span className="text-slate-800 font-bold text-[13px] group-hover:text-blue-600 transition-colors">
                  Sign in with Google
                </span>
                <span className="text-[11px] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-100">
                  Workspace SSO
                </span>
              </div>
            </button>
            <p className="text-[10px] text-center text-slate-400">
              Direct sign-in using your official <strong>@quantumphinance.com</strong> Google account
            </p>
          </div>

          {/* Divider */}
          <div className="relative flex items-center justify-center my-3">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative px-3 bg-white text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Or sign in with email credentials
            </div>
          </div>

          {/* Email Credentials Form */}
          <form onSubmit={handleLoginSubmit} className="space-y-3.5">
            {/* Field 1: Official Email ID */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="block font-bold text-slate-700" title="Format: name@quantumphinance.com">
                  Official Email ID <span className="text-red-500">*</span>
                </label>
                {lockedRole && (
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Profile Recognized</span>
                  </span>
                )}
              </div>

              <input
                type="email"
                value={officialEmail}
                onChange={(e) => handleEmailChange(e.target.value)}
                placeholder="name@quantumphinance.com"
                title="Format: name@quantumphinance.com"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-900 font-mono"
              />

              <p className="text-[10px] text-slate-400" title="Format: name@quantumphinance.com">
                Must end with @quantumphinance.com (e.g. name@quantumphinance.com)
              </p>
            </div>

            {/* Field 2: Full Name */}
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
              <p className="text-[10px] text-slate-400">Only alphabets and spaces allowed.</p>
            </div>

            {/* Field 3: Mandatory Role Selection with Permanence Enforcement */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="block font-bold text-slate-700">
                  Role <span className="text-red-500">*</span>
                </label>
                {lockedRole && (
                  <span className="text-[10px] text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded border border-purple-200 flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3 text-purple-600" />
                    <span>Locked: {lockedRole}</span>
                  </span>
                )}
              </div>

              <select
                value={selectedRole}
                onChange={(e) => handleRoleSelection(e.target.value)}
                className={`w-full px-3.5 py-2 border rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer ${
                  lockedRole
                    ? 'bg-purple-50/50 border-purple-300 text-purple-950 font-bold'
                    : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              >
                <option value="">-- Select Mandatory Role --</option>
                <option value="Super Admin">Super Admin</option>
                <option value="QA">QA</option>
                <option value="BA">BA</option>
                <option value="Developer">Developer</option>
                <option value="Product Team">Product Team</option>
              </select>
              {lockedRole ? (
                <p className="text-[10px] text-purple-600 font-semibold">
                  🔒 Role is strictly restricted to &quot;{lockedRole}&quot; for this registered email ID.
                </p>
              ) : (
                <p className="text-[10px] text-slate-400">
                  Selecting a role is compulsory. Once chosen, it will be permanently saved for your email.
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-colors mt-2"
            >
              <span>Authenticate &amp; Open {requestedTargetTabLabel}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 text-center text-[10px] text-slate-400">
          Quantum Phinance Official SSO Authentication • Security &amp; Role Access Control
        </div>
      </div>

      {/* Google Account Selector Dialog */}
      {isGoogleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full overflow-hidden animate-scaleUp">
            {/* Google Brand Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-2.5">
                <GoogleIcon className="w-5 h-5" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-tight">Sign in with Google</h3>
                  <p className="text-[10px] text-slate-500">Choose an account to continue to QA Hub</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!isSigningInWithGoogle) setIsGoogleModalOpen(false);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error in modal if any */}
            {googleModalError && (
              <div className="p-3 mx-4 mt-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-[11px] font-semibold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{googleModalError}</span>
              </div>
            )}

            {/* Loading overlay if signing in */}
            {isSigningInWithGoogle ? (
              <div className="p-8 text-center space-y-3">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
                <div>
                  <p className="text-xs font-bold text-slate-900">Signing in with Google Workspace...</p>
                  <p className="text-[11px] text-slate-500">Establishing secure SSO token session</p>
                </div>
              </div>
            ) : (
              <div className="p-4 space-y-2 text-xs">
                {/* Primary Recognized Workspace Account (Maseera Sayyed) */}
                <button
                  type="button"
                  id="google-account-maseera"
                  onClick={() =>
                    handleGoogleSignIn('maseerasayyed@quantumphinance.com', 'Maseera Sayyed', 'Super Admin')
                  }
                  className="w-full p-3 rounded-xl border border-blue-200 hover:border-blue-400 bg-blue-50/40 hover:bg-blue-50 transition-all flex items-center justify-between group cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                      MS
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                          Maseera Sayyed
                        </span>
                        <span className="text-[9px] font-extrabold bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded">
                          Super Admin
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-mono">maseerasayyed@quantumphinance.com</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                </button>

                {/* Other saved team accounts on this system (if any) */}
                {savedUsers
                  .filter((u) => u.email.toLowerCase() !== 'maseerasayyed@quantumphinance.com')
                  .map((u) => {
                    const initials = u.name
                      ? u.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2)
                      : 'QP';
                    return (
                      <button
                        key={u.email}
                        type="button"
                        onClick={() => handleGoogleSignIn(u.email, u.name, u.role)}
                        className="w-full p-3 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-slate-50 transition-all flex items-center justify-between group cursor-pointer text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-700 text-white font-bold text-xs flex items-center justify-center">
                            {initials}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                                {u.name}
                              </span>
                              <span className="text-[9px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded border border-slate-200">
                                {u.role}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 font-mono">{u.email}</p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                      </button>
                    );
                  })}

                {/* Use another Google account */}
                {!showCustomGoogleInput ? (
                  <button
                    type="button"
                    onClick={() => setShowCustomGoogleInput(true)}
                    className="w-full p-2.5 rounded-xl border border-dashed border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-600 font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Use another @quantumphinance.com Google account</span>
                  </button>
                ) : (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 mt-2">
                    <p className="font-bold text-slate-800 text-[11px]">Enter Google Workspace Account</p>
                    <input
                      type="email"
                      value={googleCustomEmail}
                      onChange={(e) => setGoogleCustomEmail(e.target.value)}
                      placeholder="name@quantumphinance.com"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      value={googleCustomName}
                      onChange={(e) => setGoogleCustomName(e.target.value)}
                      placeholder="Full Name (e.g. John Doe)"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() =>
                          handleGoogleSignIn(googleCustomEmail, googleCustomName || 'Quantum Member', googleCustomRole)
                        }
                        className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg cursor-pointer transition-colors"
                      >
                        Continue with Google
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCustomGoogleInput(false)}
                        className="px-3 py-1.5 bg-white border border-slate-300 text-slate-600 hover:bg-slate-100 font-bold text-xs rounded-lg cursor-pointer transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Google Disclaimer Footer */}
            <div className="p-3.5 bg-slate-50 border-t border-slate-100 text-center text-[10px] text-slate-400 leading-tight">
              To continue, Google shares your name, email, and workspace profile with QA Hub under Quantum Phinance SSO
              policy.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
