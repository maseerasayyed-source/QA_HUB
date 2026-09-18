import React from 'react';
import {
  LayoutDashboard,
  Ticket,
  Sparkles,
  AlertOctagon,
  FolderTree,
  Users2,
  Code2,
  ShieldCheck,
  FileText,
  CalendarCheck,
  LogOut,
  PanelLeftClose,
} from 'lucide-react';
import { NavTab, UserProfile, ColourTheme } from '../types';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  currentUser: UserProfile;
  onOpenLoginModal?: () => void;
  onLogout?: () => void;
  theme?: ColourTheme;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
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
  onLogout,
  theme = 'Default',
  isCollapsed = false,
  onToggleCollapse,
}) => {
  // Navigation tabs list with font size greater than 15px (16.5px font-bold)
  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'tickets', label: 'Tickets (Azure)', icon: Ticket },
    { id: 'developer-testing', label: 'Developer Testing', icon: Code2 },
    { id: 'ai-test-hub', label: 'QA AI Test Case', icon: Sparkles },
    { id: 'review-queue', label: 'QA Test Case Review', icon: ShieldCheck },
    { id: 'user-manual', label: 'User Manual (Word)', icon: FileText, badge: 'New' },
    { id: 'daily-updates', label: 'Daily Task Log', icon: CalendarCheck, badge: 'New' },
    { id: 'observations', label: 'Observations & RFE', icon: AlertOctagon },
    { id: 'modules', label: 'Modules', icon: FolderTree, badge: '18' },
  ];

  // Accent theme color map
  const activeBgMap: Record<ColourTheme, string> = {
    Default: 'bg-blue-600 text-white shadow-sm',
    Blue: 'bg-sky-600 text-white shadow-sm',
    Green: 'bg-emerald-600 text-white shadow-sm',
    Purple: 'bg-purple-600 text-white shadow-sm',
    Amber: 'bg-amber-600 text-white shadow-sm',
    Dark: 'bg-slate-700 text-white shadow-sm',
  };

  const activeBadgeMap: Record<ColourTheme, string> = {
    Default: 'bg-blue-700 text-white',
    Blue: 'bg-sky-700 text-white',
    Green: 'bg-emerald-700 text-white',
    Purple: 'bg-purple-700 text-white',
    Amber: 'bg-amber-700 text-white',
    Dark: 'bg-slate-800 text-white',
  };

  return (
    <aside className="w-64 bg-[#0F172A] flex flex-col flex-shrink-0 h-screen select-none border-r border-slate-800">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-black tracking-tight">QA HUB</h1>
          <p className="text-slate-400 text-xs uppercase tracking-widest mt-0.5 font-semibold">
            Beacon Quality Hub
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="px-2.5 py-0.5 bg-blue-600/30 text-blue-400 border border-blue-500/30 text-xs font-bold rounded">
            v2.0
          </span>
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              title="Hide sidebar to expand workspace screen"
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Navigation Group */}
      <nav className="flex-1 py-4 overflow-y-auto space-y-1.5">
        <div className="px-4 mb-2">
          <span className="text-slate-400 text-xs font-extrabold uppercase tracking-wider">
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
              className={`w-full flex items-center justify-between px-4 py-3 text-[16.5px] font-bold transition-colors cursor-pointer ${
                isActive
                  ? activeBgMap[theme] || 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-200 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center min-w-0">
                <Icon className={`w-5 h-5 mr-3 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-xs px-2 py-0.5 rounded font-mono font-bold ${
                    isActive
                      ? activeBadgeMap[theme] || 'bg-blue-700 text-white'
                      : 'bg-slate-800 text-slate-300 border border-slate-700'
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
      <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
        <div
          onClick={onOpenLoginModal}
          title="Click to change Official Email / Login Role"
          className="flex items-center min-w-0 cursor-pointer flex-1 mr-2"
        >
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs ${
              currentUser.role === 'Super Admin'
                ? 'bg-purple-600'
                : currentUser.role === 'Senior QA' || currentUser.role === 'Admin'
                ? 'bg-emerald-600'
                : 'bg-blue-600'
            }`}
          >
            {currentUser.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="ml-2 overflow-hidden">
            <p className="text-xs font-bold text-white truncate">{currentUser.name}</p>
            <p className="text-[10px] text-slate-400 truncate">{currentUser.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${
              currentUser.role === 'Super Admin'
                ? 'bg-purple-950 text-purple-300 border-purple-800'
                : currentUser.role === 'Senior QA' || currentUser.role === 'Admin'
                ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                : 'bg-slate-800 text-slate-300 border-slate-700'
            }`}
          >
            {currentUser.role === 'Super Admin' ? 'Admin' : currentUser.role}
          </span>

          {onLogout && (
            <button
              onClick={onLogout}
              title="Logout (Exit to Login Page)"
              className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-slate-900 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
