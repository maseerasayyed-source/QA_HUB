import React from 'react';
import { Search, Bell, BookOpen, ShieldCheck, UserCheck, Palette, LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { UserProfile, ColourTheme } from '../types';

interface TopBarProps {
  currentUser: UserProfile;
  activeModuleFilter: string;
  onModuleFilterChange: (moduleId: string) => void;
  modules: { id: string; name: string }[];
  onOpenGuide: () => void;
  onOpenLoginModal?: () => void;
  onLogout?: () => void;
  currentTheme?: ColourTheme;
  onSelectTheme?: (theme: ColourTheme) => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentUser,
  activeModuleFilter,
  onModuleFilterChange,
  modules,
  onOpenGuide,
  onOpenLoginModal,
  onLogout,
  currentTheme = 'Default',
  onSelectTheme,
  isSidebarCollapsed = false,
  onToggleSidebar,
}) => {
  const themes: { id: ColourTheme; label: string; colorClass: string }[] = [
    { id: 'Default', label: 'Default Navy', colorClass: 'bg-slate-900' },
    { id: 'Blue', label: 'Azure Blue', colorClass: 'bg-blue-600' },
    { id: 'Green', label: 'Emerald Green', colorClass: 'bg-emerald-600' },
    { id: 'Purple', label: 'Executive Purple', colorClass: 'bg-purple-600' },
    { id: 'Amber', label: 'Warm Amber', colorClass: 'bg-amber-600' },
    { id: 'Dark', label: 'Obsidian Dark', colorClass: 'bg-black' },
  ];

  return (
    <header className="h-14 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-10 flex-shrink-0">
      {/* Search and Module Context */}
      <div className="flex items-center gap-3 flex-1 max-w-2xl">
        {/* Toggle Sidebar Button */}
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            title={isSidebarCollapsed ? 'Show Sidebar (Open Navigation)' : 'Hide Sidebar (Full Screen Width)'}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 flex items-center gap-1.5 text-xs font-semibold cursor-pointer transition-colors shrink-0"
          >
            {isSidebarCollapsed ? (
              <>
                <PanelLeftOpen className="w-4 h-4 text-blue-600" />
                <span className="hidden sm:inline">Show Sidebar</span>
              </>
            ) : (
              <>
                <PanelLeftClose className="w-4 h-4 text-slate-500" />
                <span className="hidden sm:inline">Hide Sidebar</span>
              </>
            )}
          </button>
        )}

        {/* Module Filter Dropdown */}
        <div className="flex items-center gap-1.5">
          <label
            htmlFor="beacon-module-select"
            className="text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap"
          >
            Active Module:
          </label>
          <select
            id="beacon-module-select"
            value={activeModuleFilter}
            onChange={(e) => onModuleFilterChange(e.target.value)}
            className="text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors cursor-pointer"
          >
            <option value="all">All Beacon Modules ({modules.length})</option>
            {modules.map((mod) => (
              <option key={mod.id} value={mod.id}>
                {mod.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Right Controls: Theme Selector, DB Schema, User, Guide */}
      <div className="flex items-center space-x-2.5 text-xs">
        {/* Theme Picker Dropdown / Bar */}
        {onSelectTheme && (
          <div className="flex items-center gap-1.5 bg-slate-100/90 border border-slate-200 rounded-lg px-2.5 py-1">
            <Palette className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider hidden sm:inline">
              Theme:
            </span>
            <div className="flex items-center gap-1">
              {themes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => onSelectTheme(t.id)}
                  title={`Switch to ${t.label}`}
                  className={`w-4 h-4 rounded-full transition-transform cursor-pointer ${t.colorClass} ${
                    currentTheme === t.id
                      ? 'ring-2 ring-offset-1 ring-blue-500 scale-110 shadow-xs'
                      : 'opacity-60 hover:opacity-100 hover:scale-105'
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Authority Level Badge & User Switcher */}
        <button
          onClick={onOpenLoginModal}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 font-semibold rounded-lg transition-colors cursor-pointer"
        >
          <UserCheck className="w-3.5 h-3.5 text-blue-600" />
          <span className="max-w-[110px] truncate">{currentUser.name}</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
              currentUser.role === 'Super Admin'
                ? 'bg-purple-100 text-purple-800 border border-purple-200'
                : 'bg-blue-100 text-blue-800 border border-blue-200'
            }`}
          >
            <ShieldCheck className="w-3 h-3" />
            <span className="hidden md:inline">
              {currentUser.role === 'Super Admin'
                ? 'Super Admin'
                : `${currentUser.role}`}
            </span>
          </span>
        </button>

        <button
          onClick={onOpenGuide}
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 rounded-lg transition-colors cursor-pointer"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Guide</span>
        </button>

        {onLogout && (
          <button
            onClick={onLogout}
            title="Log Out (Return to Login Screen)"
            className="flex items-center gap-1.5 px-2.5 py-1.5 font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors cursor-pointer text-xs"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        )}
      </div>
    </header>
  );
};

