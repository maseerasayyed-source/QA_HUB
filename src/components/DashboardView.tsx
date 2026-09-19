import React, { useState, useMemo } from 'react';
import {
  Ticket,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  TrendingUp,
  AlertOctagon,
  ArrowUpRight,
  Filter,
  Plus,
  UploadCloud,
  Search,
  ArrowUpDown,
  Sparkles,
  Lock,
  Eye,
  ShieldAlert,
  X,
  UserCheck,
} from 'lucide-react';
import { TicketSummary, BeaconModule, UserProfile } from '../types';
import { AzureDevopsModal } from './common/AzureDevopsModal';
import { TicketLockedModal } from './common/TicketLockedModal';
import { getTestCasesExcelBlob } from '../utils/excelExport';
import { canUserOpenTicket, isUserTicketCreator, isTicketInDraft } from '../utils/ticketPermissions';

interface DashboardViewProps {
  tickets: TicketSummary[];
  modules: BeaconModule[];
  onSelectTicket: (ticket: TicketSummary) => void;
  onNavigateTab: (tab: any) => void;
  currentUser?: UserProfile;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  tickets,
  modules,
  onSelectTicket,
  onNavigateTab,
  currentUser,
}) => {
  // State for Filters & Search on Dashboard
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [selectedQa, setSelectedQa] = useState<string>('all');
  const [ticketScope, setTicketScope] = useState<'all' | 'mine'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'priority' | 'testCases' | 'observations' | 'newest'>('priority');

  // State for Azure DevOps Direct Attach Modal
  const [isAdoModalOpen, setIsAdoModalOpen] = useState<boolean>(false);
  const [selectedAdoTicket, setSelectedAdoTicket] = useState<TicketSummary | null>(null);
  const [adoNotice, setAdoNotice] = useState<string | null>(null);

  // State for Locked Draft Ticket Notice Modal
  const [lockedModalTicket, setLockedModalTicket] = useState<{
    ticketNumber: string;
    createdBy: string;
    reason: string;
  } | null>(null);

  const isSuperAdmin = currentUser?.role === 'Super Admin' || currentUser?.email?.toLowerCase().includes('maseera');

  // Multi-user visibility: ALL tickets are visible on dashboard by default!
  const baseTickets = useMemo(() => {
    if (ticketScope === 'mine' && currentUser) {
      return tickets.filter((t) => isUserTicketCreator(t, currentUser));
    }
    return tickets;
  }, [tickets, ticketScope, currentUser]);

  // Extract unique QA assignees & Creators for filter dropdown
  const qaAssignees = useMemo(() => {
    const set = new Set<string>();
    tickets.forEach((t) => {
      if (t.qaAssignee) set.add(t.qaAssignee);
      if (t.createdBy) set.add(t.createdBy);
    });
    return Array.from(set);
  }, [tickets]);

  // Compute Dashboard Metrics dynamically based on active filters
  const filteredTickets = useMemo(() => {
    return baseTickets
      .filter((t) => {
        if (selectedModule !== 'all' && t.moduleId !== selectedModule && t.moduleName.toLowerCase() !== selectedModule.toLowerCase()) {
          return false;
        }
        if (selectedQa !== 'all' && t.qaAssignee.toLowerCase() !== selectedQa.toLowerCase() && (t.createdBy || '').toLowerCase() !== selectedQa.toLowerCase()) {
          return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const match =
            t.ticketNumber.toLowerCase().includes(q) ||
            t.featureName.toLowerCase().includes(q) ||
            t.moduleName.toLowerCase().includes(q) ||
            t.developer.toLowerCase().includes(q) ||
            t.qaAssignee.toLowerCase().includes(q) ||
            (t.createdBy && t.createdBy.toLowerCase().includes(q)) ||
            t.priority.toLowerCase().includes(q) ||
            t.status.toLowerCase().includes(q);
          if (!match) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'priority') {
          const priorityWeight: Record<string, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };
          return (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
        }
        if (sortBy === 'testCases') {
          return b.testCasesCount - a.testCasesCount;
        }
        if (sortBy === 'observations') {
          return b.observationsCount - a.observationsCount;
        }
        return b.id.localeCompare(a.id);
      });
  }, [baseTickets, selectedModule, selectedQa, searchQuery, sortBy]);

  // Handle clicking on a ticket in Dashboard: Enforces creator-only draft lock
  const handleTicketRowClick = (t: TicketSummary) => {
    const check = canUserOpenTicket(t, currentUser);
    if (!check.allowed) {
      setLockedModalTicket({
        ticketNumber: t.ticketNumber,
        createdBy: t.createdBy || 'Creator',
        reason: check.reason || `Ticket #${t.ticketNumber} is currently in Draft / Edit mode.`,
      });
      return;
    }

    onSelectTicket(t);
    onNavigateTab('ai-test-hub');
  };

  // Aggregated Dynamic Stats
  const totalTickets = filteredTickets.length;
  const inTesting = filteredTickets.filter((t) => t.status === 'In Testing' || t.status === 'Retesting').length;
  const completed = filteredTickets.filter((t) => t.status === 'Passed' || t.status === 'Closed').length;
  const totalObservations = filteredTickets.reduce((acc, t) => acc + t.observationsCount, 0);
  const totalTestCases = filteredTickets.reduce((acc, t) => acc + t.testCasesCount, 0);
  const totalPassed = filteredTickets.reduce((acc, t) => acc + t.passedCount, 0);
  const passPercentage = totalTestCases > 0 ? Math.round((totalPassed / totalTestCases) * 100) : 100;
  const criticalObservations = filteredTickets
    .filter((t) => t.priority === 'Critical')
    .reduce((acc, t) => acc + t.observationsCount, 0);

  const handleOpenAdoAttach = (t: TicketSummary, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedAdoTicket(t);
    setIsAdoModalOpen(true);
  };

  return (
    <div className="p-6 max-w-[1500px] mx-auto flex-1 flex flex-col space-y-6">
      {/* Top Banner with Direct Azure DevOps Attach Action */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-xl p-4 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/20 border border-blue-400/30 rounded-xl text-blue-300">
            <UploadCloud className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold flex items-center gap-2">
              <span>Azure DevOps Direct Ticket Integration</span>
              <span className="px-2 py-0.5 bg-emerald-500/30 text-emerald-200 text-[10px] rounded-full font-mono">
                Active Sync
              </span>
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Directly attach test case matrices and observation files to Azure DevOps work items with zero double-work.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setSelectedAdoTicket(filteredTickets[0] || tickets[0]);
            setIsAdoModalOpen(true);
          }}
          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-lg shadow-sm flex items-center gap-2 transition-all cursor-pointer shrink-0"
        >
          <UploadCloud className="w-4 h-4" />
          <span>🚀 Direct Azure DevOps Attach</span>
        </button>
      </div>

      {/* Azure DevOps Notification Banner */}
      {adoNotice && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
          <span>{adoNotice}</span>
        </div>
      )}

      {/* Dynamic 7 Metric Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 flex-shrink-0">
        <div className="bg-white p-3 border border-slate-200 rounded-xl shadow-2xs">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Tickets</p>
          <p className="text-xl font-bold mt-1 text-slate-900">{totalTickets}</p>
        </div>
        <div className="bg-white p-3 border border-slate-200 rounded-xl shadow-2xs">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">In Testing</p>
          <p className="text-xl font-bold mt-1 text-blue-600">{inTesting}</p>
        </div>
        <div className="bg-white p-3 border border-slate-200 rounded-xl shadow-2xs border-l-4 border-l-orange-400">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pending Obs</p>
          <p className="text-xl font-bold mt-1 text-orange-600">{totalObservations}</p>
        </div>
        <div className="bg-white p-3 border border-slate-200 rounded-xl shadow-2xs border-l-4 border-l-red-500">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Critical Obs</p>
          <p className="text-xl font-bold mt-1 text-red-600">
            {criticalObservations > 0 ? String(criticalObservations).padStart(2, '0') : '00'}
          </p>
        </div>
        <div className="bg-white p-3 border border-slate-200 rounded-xl shadow-2xs">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Test Cases Written</p>
          <p className="text-xl font-bold mt-1 text-slate-900">{totalTestCases.toLocaleString()}</p>
        </div>
        <div className="bg-white p-3 border border-slate-200 rounded-xl shadow-2xs bg-green-50/60 border-green-200">
          <p className="text-[10px] font-bold text-green-700 uppercase tracking-wider">Pass Rate</p>
          <p className="text-xl font-bold mt-1 text-green-600">{passPercentage}%</p>
        </div>
        <div className="bg-white p-3 border border-slate-200 rounded-xl shadow-2xs">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Completed</p>
          <p className="text-xl font-bold mt-1 text-slate-900">{completed}</p>
        </div>
      </div>

      {/* FILTER & SORT TOOLBAR FOR DASHBOARD */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Scope Toggle: All Users vs Created by Me */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
            <button
              type="button"
              onClick={() => setTicketScope('all')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                ticketScope === 'all'
                  ? 'bg-white text-blue-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Users ({tickets.length})
            </button>
            <button
              type="button"
              onClick={() => setTicketScope('mine')}
              className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
                ticketScope === 'mine'
                  ? 'bg-white text-blue-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Created by Me</span>
            </button>
          </div>

          {/* Live Search Box */}
          <div className="relative w-full sm:w-60">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search ticket #, module, creator, feature..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white text-slate-800"
            />
          </div>

          {/* Module Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-bold uppercase text-[10px]">Module:</span>
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">All Modules ({modules.length})</option>
              {modules.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Assigned QA Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-bold uppercase text-[10px]">User:</span>
            <select
              value={selectedQa}
              onChange={(e) => setSelectedQa(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">All Creators &amp; QA</option>
              {qaAssignees.map((qa) => (
                <option key={qa} value={qa}>
                  {qa}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Sorting Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-bold uppercase text-[10px] flex items-center gap-1">
            <ArrowUpDown className="w-3 h-3 text-slate-400" />
            <span>Sort By:</span>
          </span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
          >
            <option value="priority">Severity / Priority (Urgent First)</option>
            <option value="testCases">Most Test Cases Written</option>
            <option value="observations">Most Pending Observations</option>
            <option value="newest">Ticket Number</option>
          </select>
        </div>
      </div>

      {/* 2-Column High Density Workspace */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
        {/* Left Card: Priority Tickets Queue with exact Pending Observations & Test Cases numbers */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-2xs flex flex-col min-h-0">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900">All Users&apos; Tickets Queue</h3>
              <p className="text-[11px] text-slate-500">
                Visible to all users. Draft tickets can only be opened and edited by their creator.
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('tickets')}
              className="text-blue-600 text-xs font-semibold hover:underline cursor-pointer"
            >
              View All ({tickets.length})
            </button>
          </div>
          <div className="flex-1 overflow-x-auto p-2 max-h-[420px]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="text-[10px] text-slate-400 uppercase tracking-wider bg-slate-50">
                  <th className="p-2 font-semibold">Ticket #</th>
                  <th className="p-2 font-semibold">Module &amp; Feature</th>
                  <th className="p-2 font-semibold text-center">Status / Mode</th>
                  <th className="p-2 font-semibold text-center">Test Cases</th>
                  <th className="p-2 font-semibold text-center">Obs</th>
                  <th className="p-2 font-semibold text-center">Action</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-slate-100">
                {filteredTickets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Ticket className="w-8 h-8 text-slate-300" />
                        <p className="font-semibold text-slate-600">No tickets found</p>
                        <p className="text-[11px] text-slate-400 max-w-xs">
                          No tickets match your filters. Create a new Azure DevOps ticket to begin testing.
                        </p>
                        <button
                          type="button"
                          onClick={() => onNavigateTab('tickets')}
                          className="mt-2 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs cursor-pointer shadow-xs transition-colors"
                        >
                          + Add Azure DevOps Ticket
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredTickets.map((t) => {
                    const inDraft = isTicketInDraft(t);
                    const isCreator = isUserTicketCreator(t, currentUser);

                    return (
                      <tr
                        key={t.id}
                        onClick={() => handleTicketRowClick(t)}
                        className={`transition-colors cursor-pointer group ${
                          inDraft && !isCreator
                            ? 'bg-amber-50/20 hover:bg-amber-50/50'
                            : 'hover:bg-blue-50/40'
                        }`}
                      >
                        <td className="p-2 font-mono text-blue-600 font-bold whitespace-nowrap">
                          {t.ticketNumber}
                        </td>
                        <td className="p-2">
                          <div className="font-bold text-slate-900 truncate max-w-[180px]">{t.featureName}</div>
                          <div className="text-[10px] text-slate-500">
                            {t.moduleName} • Created by: <strong className="text-slate-700">{t.createdBy || 'QA'}</strong>
                          </div>
                        </td>
                        <td className="p-2 text-center whitespace-nowrap">
                          {inDraft ? (
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                isCreator
                                  ? 'bg-blue-50 text-blue-800 border-blue-200'
                                  : 'bg-amber-50 text-amber-800 border-amber-300'
                              }`}
                            >
                              <Lock className="w-2.5 h-2.5 shrink-0" />
                              <span>{isCreator ? 'Draft (You)' : 'Draft / Edit'}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                              <CheckCircle2 className="w-2.5 h-2.5 shrink-0 text-emerald-600" />
                              <span>Submitted</span>
                            </span>
                          )}
                        </td>
                        <td className="p-2 text-center whitespace-nowrap">
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded font-mono font-bold text-[11px]">
                            {t.testCasesCount} Cases
                          </span>
                        </td>
                        <td className="p-2 text-center whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded font-mono font-bold text-[11px] ${
                              t.observationsCount > 0
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {t.observationsCount} Obs
                          </span>
                        </td>
                        <td className="p-2 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          {inDraft && !isCreator ? (
                            <button
                              type="button"
                              onClick={() => handleTicketRowClick(t)}
                              title="Locked: This ticket is currently being drafted/edited by its creator."
                              className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded text-[11px] font-bold flex items-center gap-1 mx-auto cursor-pointer"
                            >
                              <Lock className="w-3 h-3 text-amber-700" />
                              <span>Locked</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleTicketRowClick(t)}
                              className={`px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1 mx-auto cursor-pointer transition-colors ${
                                isCreator
                                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-2xs'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200'
                              }`}
                            >
                              {isCreator ? (
                                <span>Edit Ticket</span>
                              ) : (
                                <>
                                  <Eye className="w-3 h-3 text-blue-600" />
                                  <span>View (Read-Only)</span>
                                </>
                              )}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Card: Recent Observations & Active QA Sign-off Board */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-2xs flex flex-col min-h-0">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-red-800 flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 text-red-600" />
                <span>Active Observations &amp; RFE Tracker</span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Pending observation counts per Ticket ID across all users
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('observations')}
              className="text-blue-600 text-xs font-semibold hover:underline cursor-pointer"
            >
              Observations Sheet
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[420px]">
            {filteredTickets.length === 0 ? (
              <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center gap-2 h-full">
                <AlertOctagon className="w-8 h-8 text-slate-300" />
                <p className="font-semibold text-slate-600">No active observations</p>
                <p className="text-[11px] text-slate-400 max-w-xs">
                  Observations and RFEs will be tracked when logged on tickets.
                </p>
              </div>
            ) : (
              filteredTickets.map((t) => {
                const inDraft = isTicketInDraft(t);
                const isCreator = isUserTicketCreator(t, currentUser);

                return (
                  <div
                    key={t.id}
                    onClick={() => {
                      if (inDraft && !isCreator) {
                        setLockedModalTicket({
                          ticketNumber: t.ticketNumber,
                          createdBy: t.createdBy || 'Creator',
                          reason: `Ticket #${t.ticketNumber} is currently in Draft / Edit mode by "${t.createdBy}". You cannot view its observations until the creator submits it.`,
                        });
                        return;
                      }
                      onSelectTicket(t);
                      onNavigateTab('observations');
                    }}
                    className={`border rounded-lg p-3 transition-all cursor-pointer shadow-2xs ${
                      inDraft && !isCreator
                        ? 'border-amber-200 bg-amber-50/20 hover:bg-amber-50/60'
                        : 'border-slate-200 bg-slate-50/50 hover:bg-white hover:border-blue-300'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-blue-700">#{t.ticketNumber}</span>
                        <span className="text-xs font-bold text-slate-800">{t.featureName}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {inDraft && !isCreator && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5" /> Locked
                          </span>
                        )}
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                            t.observationsCount > 0
                              ? 'bg-red-100 text-red-700 border border-red-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {t.observationsCount} Pending Obs
                        </span>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-500 mt-1 flex flex-wrap items-center gap-3">
                      <span>Module: <strong className="text-slate-700">{t.moduleName}</strong></span>
                      <span>Created by: <strong className="text-slate-700">{t.createdBy || 'QA'}</strong></span>
                      <span>Dev: <strong className="text-slate-700">{t.developer}</strong></span>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[11px] pt-2 border-t border-slate-200/60">
                      <span className="text-slate-500 font-medium">
                        Test Cases Written: <strong className="text-slate-800">{t.testCasesCount}</strong> ({t.passedCount} Passed)
                      </span>
                      <span className="text-blue-600 font-semibold group-hover:underline flex items-center gap-0.5">
                        <span>{inDraft && !isCreator ? 'Locked by Creator' : 'Open Sheet'}</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Azure DevOps Direct Attachment Modal */}
      {selectedAdoTicket && (
        <AzureDevopsModal
          isOpen={isAdoModalOpen}
          onClose={() => setIsAdoModalOpen(false)}
          ticketNumber={selectedAdoTicket.ticketNumber}
          taskName={selectedAdoTicket.featureName}
          getFileBlob={() =>
            getTestCasesExcelBlob(
              {
                ticketNo: selectedAdoTicket.ticketNumber,
                clientName: selectedAdoTicket.clientName || 'Treasury Master',
                sha: selectedAdoTicket.shaCommit || 'SHA-1: 4710b619ea012cba75ee657d64ebd49e656948df*',
                taskName: selectedAdoTicket.featureName,
                taskDoneBy: selectedAdoTicket.qaAssignee || 'Maseera Sayyed',
                signOffBy: selectedAdoTicket.signOffBy || '',
              },
              []
            )
          }
          defaultComment={`QA Test Cases & Execution Matrix for "${selectedAdoTicket.featureName}" (Ticket #${selectedAdoTicket.ticketNumber}) verified by ${selectedAdoTicket.qaAssignee}.`}
          onSuccessNotice={(msg) => {
            setAdoNotice(msg);
            setTimeout(() => setAdoNotice(null), 5000);
          }}
        />
      )}

      {/* Locked Draft Ticket Notice Modal */}
      <TicketLockedModal
        isOpen={Boolean(lockedModalTicket)}
        onClose={() => setLockedModalTicket(null)}
        ticketNumber={lockedModalTicket?.ticketNumber || ''}
        createdBy={lockedModalTicket?.createdBy}
        reason={lockedModalTicket?.reason}
      />
    </div>
  );
};
