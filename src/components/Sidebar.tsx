import React from 'react';
import {
  LayoutDashboard,
  Ticket,
  Sparkles,
  FileSpreadsheet,
  PlayCircle,
  AlertOctagon,
  Code2,
  FolderTree,
  Users2,
  BarChart3,
  Bot,
  Settings,
} from 'lucide-react';
import { NavTab, UserProfile } from '../types';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  currentUser: UserProfile;
}

interface NavGroup {
  title: string;
  items: {
    id: NavTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
  }[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  currentUser,
}) => {
  const navGroups: NavGroup[] = [
    {
      title: 'Core Modules',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'tickets', label: 'Tickets (Azure)', icon: Ticket, badge: '4' },
        { id: 'ai-test-hub', label: 'AI Test Case Hub', icon: Sparkles },
        { id: 'observations', label: 'Observations & RFE', icon: AlertOctagon, badge: '3' },
      ],
    },
    {
      title: 'Engineering',
      items: [
        { id: 'developer-testing', label: 'Dev Testing', icon: Code2 },
        { id: 'modules', label: 'Modules', icon: FolderTree, badge: '18' },
        { id: 'qa-team', label: 'QA Team', icon: Users2 },
      ],
    },
    {
      title: 'System & Tools',
      items: [
        { id: 'reports', label: 'Reports', icon: BarChart3 },
        { id: 'ai-assistant', label: 'AI Assistant', icon: Bot },
        { id: 'settings', label: 'Settings', icon: Settings },
      ],
    },
  ];

  return (
    <aside className="w-60 bg-[#0F172A] flex flex-col flex-shrink-0 h-screen select-none border-r border-slate-800">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800">
        <h1 className="text-white text-xl font-bold tracking-tight">QA HUB</h1>
        <p className="text-slate-400 text-[10px] uppercase tracking-widest mt-1 font-medium">
          Smarter QA for Beacon
        </p>
      </div>

      {/* Navigation Groups */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {navGroups.map((group, groupIdx) => (
          <div key={group.title} className={groupIdx > 0 ? 'mt-5' : ''}>
            <div className="px-4 mb-2">
              <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                {group.title}
              </span>
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectTab(item.id)}
                    className={`w-full flex items-center justify-between px-4 py-2 text-sm font-medium transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center min-w-0">
                      <Icon className={`w-4 h-4 mr-3 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
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
            </div>
          </div>
        ))}
      </nav>

      {/* User Footer matching High Density theme */}
      <div className="p-4 bg-slate-950 border-t border-slate-800 flex-shrink-0">
        <div className="flex items-center">
          <div className="w-8 h-8 rounded bg-blue-500 flex items-center justify-center text-white font-bold text-xs shrink-0">
            SA
          </div>
          <div className="ml-3 overflow-hidden">
            <p className="text-xs font-semibold text-white truncate">{currentUser.name}</p>
            <p className="text-[10px] text-slate-500 truncate">{currentUser.email}</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
