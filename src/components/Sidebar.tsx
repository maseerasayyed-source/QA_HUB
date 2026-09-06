import React from 'react';
import {
  LayoutDashboard,
  Ticket,
  Sparkles,
  AlertOctagon,
  FolderTree,
  Users2,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { NavTab, UserProfile } from '../types';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  currentUser: UserProfile;
  onOpenLoginModal?: () => void;
}

interface NavItem {
  id: NavTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  currentUser,
  onOpenLoginModal,
}) => {
  // Only show active, relevant, functional core tabs
  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'tickets', label: 'Tickets (Azure)', icon: Ticket },
    { id: 'ai-test-hub', label: 'AI Test Case Hub', icon: Sparkles },
    { id: 'observations', label: 'Observations & RFE', icon: AlertOctagon },
    { id: 'modules', label: 'Modules', icon: FolderTree, badge: '18' },
    { id: 'qa-team', label: 'QA Team & Roles', icon: Users2 },
  ];

  return (
    <aside className="w-60 bg-[#0F172A] flex flex-col flex-shrink-0 h-screen select-none border-r border-slate-800">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h1 className="text-white text-xl font-bold tracking-tight">QA HUB</h1>
          <p className="text-slate-400 text-[10px] uppercase tracking-widest mt-0.5 font-medium">
            Beacon Quality Hub
          </p>
        </div>
        <span className="px-2 py-0.5 bg-blue-600/30 text-blue-400 border border-blue-500/30 text-[10px] font-bold rounded">
          v2.0
        </span>
      </div>

      {/* Navigation Group */}
      <nav className="flex-1 py-4 overflow-y-auto space-y-1">
        <div className="px-4 mb-2">
          <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">
            Workspace Navigation
          </span>
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold transition-colors cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center min-w-0">
                <Icon className={`w-4 h-4 mr-3 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${
                    isActive
                      ? 'bg-blue-700 text-white'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User Footer & Authority Level Switcher */}
      <div
        onClick={onOpenLoginModal}
        title="Click to change Official Email / Login Role"
        className="p-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between cursor-pointer hover:bg-slate-900 transition-colors"
      >
        <div className="flex items-center min-w-0">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0 ${
              currentUser.role === 'Super Admin'
                ? 'bg-purple-600'
                : currentUser.role === 'Admin'
                ? 'bg-emerald-600'
                : 'bg-blue-600'
            }`}
          >
            {currentUser.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="ml-2.5 overflow-hidden">
            <p className="text-xs font-bold text-white truncate">{currentUser.name}</p>
            <p className="text-[10px] text-slate-400 truncate">{currentUser.email}</p>
          </div>
        </div>

        <span
          className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase shrink-0 ${
            currentUser.role === 'Super Admin'
              ? 'bg-purple-950 text-purple-300 border-purple-800'
              : currentUser.role === 'Admin'
              ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
              : 'bg-slate-800 text-slate-300 border-slate-700'
          }`}
        >
          {currentUser.role}
        </span>
      </div>
    </aside>
  );
};
