import React from 'react';
import { Search, Bell, Sparkles, BookOpen } from 'lucide-react';
import { UserProfile } from '../types';

interface TopBarProps {
  currentUser: UserProfile;
  activeModuleFilter: string;
  onModuleFilterChange: (moduleId: string) => void;
  modules: { id: string; name: string }[];
  onOpenGuide: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentUser,
  activeModuleFilter,
  onModuleFilterChange,
  modules,
  onOpenGuide,
}) => {
  return (
    <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-10 flex-shrink-0">
      {/* Search and Module Context */}
      <div className="flex items-center gap-3 flex-1 max-w-2xl">
        <div className="relative w-64 sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search tickets, cases, observations..."
            className="w-full bg-slate-100 border-none rounded-md py-1.5 pl-8 pr-4 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-800"
          />
        </div>

        {/* Module Filter Dropdown */}
        <div className="hidden sm:flex items-center gap-1.5">
          <label
            htmlFor="beacon-module-select"
            className="text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap"
          >
            Module:
          </label>
          <select
            id="beacon-module-select"
            value={activeModuleFilter}
            onChange={(e) => onModuleFilterChange(e.target.value)}
            className="text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border-none rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors cursor-pointer"
          >
            <option value="all">All Modules (18)</option>
            {modules.map((mod) => (
              <option key={mod.id} value={mod.id}>
                {mod.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Action Controls & Profile matching High Density header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={onOpenGuide}
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 rounded-md transition-colors cursor-pointer"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Mentor Guide</span>
        </button>

        <button
          className="text-slate-400 hover:text-blue-600 transition-colors p-1 relative cursor-pointer"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-red-500 rounded-full"></span>
        </button>

        <div className="h-6 w-[1px] bg-slate-200"></div>

        <span className="text-xs font-medium text-slate-600 italic hidden sm:inline">
          Environment: Production Mirror
        </span>
      </div>
    </header>
  );
};
