import React from 'react';
import { Search, Bell, BookOpen, ShieldCheck, UserCheck } from 'lucide-react';
import { UserProfile } from '../types';

interface TopBarProps {
  currentUser: UserProfile;
  activeModuleFilter: string;
  onModuleFilterChange: (moduleId: string) => void;
  modules: { id: string; name: string }[];
  onOpenGuide: () => void;
  onOpenLoginModal?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentUser,
  activeModuleFilter,
  onModuleFilterChange,
  modules,
  onOpenGuide,
  onOpenLoginModal,
}) => {
  return (
    <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-10 flex-shrink-0">
      {/* Search and Module Context */}
      <div className="flex items-center gap-3 flex-1 max-w-2xl">
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

      {/* Authority Level Badge & User Switcher */}
      <div className="flex items-center space-x-3 text-xs">
        <button
          onClick={onOpenLoginModal}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 font-semibold rounded-lg transition-colors cursor-pointer"
        >
          <UserCheck className="w-3.5 h-3.5 text-blue-600" />
          <span>{currentUser.name}</span>
          <span
            className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
              currentUser.role === 'Super Admin'
                ? 'bg-purple-100 text-purple-800'
                : currentUser.role === 'Admin'
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-blue-100 text-blue-800'
            }`}
          >
            {currentUser.role}
          </span>
        </button>

        <button
          onClick={onOpenGuide}
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 rounded-lg transition-colors cursor-pointer"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Guide &amp; Specs</span>
        </button>

        <span className="text-[11px] font-medium text-slate-500 hidden lg:inline">
          Official Email Login Active
        </span>
      </div>
    </header>
  );
};
