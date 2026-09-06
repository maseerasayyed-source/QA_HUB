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
} from 'lucide-react';
import { TicketSummary, BeaconModule } from '../types';
import { AzureDevopsModal } from './common/AzureDevopsModal';
import { getTestCasesExcelBlob } from '../utils/excelExport';

interface DashboardViewProps {
  tickets: TicketSummary[];
  modules: BeaconModule[];
  onSelectTicket: (ticket: TicketSummary) => void;
  onNavigateTab: (tab: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  tickets,
  modules,
  onSelectTicket,
  onNavigateTab,
}) => {
  // State for Filters & Search on Dashboard
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [selectedQa, setSelectedQa] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'priority' | 'testCases' | 'observations' | 'newest'>('priority');

  // State for Azure DevOps Direct Attach Modal
  const [isAdoModalOpen, setIsAdoModalOpen] = useState<boolean>(false);
  const [selectedAdoTicket, setSelectedAdoTicket] = useState<TicketSummary | null>(null);
  const [adoNotice, setAdoNotice] = useState<string | null>(null);

  // Extract unique QA assignees for filter
  const qaAssignees = useMemo(() => {
    const set = new Set<string>();
    tickets.forEach((t) => {
      if (t.qaAssignee) set.add(t.qaAssignee);
    });
    return Array.from(set);
  }, [tickets]);

  // Compute Dashboard Metrics dynamically based on active filters
  const filteredTickets = useMemo(() => {
    return tickets
      .filter((t) => {
        if (selectedModule !== 'all' && t.moduleId !== selectedModule && t.moduleName.toLowerCase() !== selectedModule.toLowerCase()) {
          return false;
        }
        if (selectedQa !== 'all' && t.qaAssignee.toLowerCase() !== selectedQa.toLowerCase()) {
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
  }, [tickets, selectedModule, selectedQa, searchQuery, sortBy]);

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
          {/* Live Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search ticket #, module, QA or feature..."
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
            <span className="text-slate-500 font-bold uppercase text-[10px]">Assigned QA:</span>
            <select
              value={selectedQa}
              onChange={(e) => setSelectedQa(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">All QA Assignees</option>
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
              <h3 className="font-bold text-sm text-slate-900">Priority Tickets Queue</h3>
              <p className="text-[11px] text-slate-500">
                Primary key link by Ticket Number. Click row to launch AI Test Case Hub.
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
                  <th className="p-2 font-semibold text-center">Test Cases Written</th>
                  <th className="p-2 font-semibold text-center">Pending Obs</th>
                  <th className="p-2 font-semibold text-center">Priority</th>
                  <th className="p-2 font-semibold text-center">Azure DevOps</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-slate-100">
                {filteredTickets.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => {
                      onSelectTicket(t);
                      onNavigateTab('ai-test-hub');
                    }}
                    className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                  >
                    <td className="p-2 font-mono text-blue-600 font-bold">{t.ticketNumber}</td>
                    <td className="p-2">
                      <div className="font-bold text-slate-900 truncate max-w-[180px]">{t.featureName}</div>
                      <div className="text-[10px] text-slate-500">{t.moduleName} • QA: {t.qaAssignee}</div>
                    </td>
                    <td className="p-2 text-center">
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded font-mono font-bold text-[11px]">
                        {t.testCasesCount} Cases
                      </span>
                    </td>
                    <td className="p-2 text-center">
                      <span
                        className={`px-2 py-0.5 rounded font-mono font-bold text-[11px] ${
                          t.observationsCount > 0
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {t.observationsCount} Pending
                      </span>
                    </td>
                    <td className="p-2 text-center">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          t.priority === 'Critical'
                            ? 'bg-red-100 text-red-600'
                            : t.priority === 'High'
                            ? 'bg-orange-100 text-orange-600'
                            : 'bg-blue-100 text-blue-600'
                        }`}
                      >
                        {t.priority.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-2 text-center">
                      <button
                        type="button"
                        onClick={(e) => handleOpenAdoAttach(t, e)}
                        title="Directly attach to Azure DevOps Work Item"
                        className="px-2 py-1 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 rounded text-[11px] font-semibold transition-colors flex items-center gap-1 mx-auto"
                      >
                        <UploadCloud className="w-3 h-3" />
                        <span>Attach</span>
                      </button>
                    </td>
                  </tr>
                ))}
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
                Pending observation counts per Ticket ID
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
            {filteredTickets.map((t) => (
              <div
                key={t.id}
                onClick={() => {
                  onSelectTicket(t);
                  onNavigateTab('observations');
                }}
                className="border border-slate-200 rounded-lg p-3 hover:border-blue-300 bg-slate-50/50 hover:bg-white transition-all cursor-pointer shadow-2xs"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-blue-700">#{t.ticketNumber}</span>
                    <span className="text-xs font-bold text-slate-800">{t.featureName}</span>
                  </div>
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

                <div className="text-[11px] text-slate-500 mt-1 flex flex-wrap items-center gap-3">
                  <span>Module: <strong className="text-slate-700">{t.moduleName}</strong></span>
                  <span>QA Assignee: <strong className="text-slate-700">{t.qaAssignee}</strong></span>
                  <span>Dev: <strong className="text-slate-700">{t.developer}</strong></span>
                </div>

                <div className="mt-2 flex items-center justify-between text-[11px] pt-2 border-t border-slate-200/60">
                  <span className="text-slate-500 font-medium">
                    Test Cases Written: <strong className="text-slate-800">{t.testCasesCount}</strong> ({t.passedCount} Passed)
                  </span>
                  <span className="text-blue-600 font-semibold group-hover:underline flex items-center gap-0.5">
                    <span>Open Sheet</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
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
                signOffBy: selectedAdoTicket.signOffBy || 'Ashwini Poke',
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
    </div>
  );
};
