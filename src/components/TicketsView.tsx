import React, { useState } from 'react';
import { Ticket, Plus, Search, Filter, CheckCircle2, AlertTriangle, PlayCircle } from 'lucide-react';
import { TicketSummary, BeaconModule } from '../types';

interface TicketsViewProps {
  tickets: TicketSummary[];
  modules: BeaconModule[];
  onSelectTicket: (ticket: TicketSummary) => void;
  onNavigateTab: (tab: any) => void;
}

export const TicketsView: React.FC<TicketsViewProps> = ({
  tickets,
  modules,
  onSelectTicket,
  onNavigateTab,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredTickets = tickets.filter((t) => {
    const matchesSearch =
      t.ticketNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.featureName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.moduleName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.developer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.qaAssignee.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-blue-50 text-blue-600 rounded-md border border-blue-100">
              <Ticket className="w-4 h-4" />
            </span>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Beacon Ticket Queue</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Track feature tickets received from developers, QA assignments, execution status, and retest counts.
          </p>
        </div>

        <button
          onClick={() => alert("Ticket creation modal will bind directly to your PostgreSQL database in Phase 2!")}
          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-md flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Beacon Ticket</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search ticket #, feature, module, QA or dev..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-100 border-none rounded-md py-1.5 pl-8 pr-4 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-800"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          {['all', 'Ready for QA', 'In Testing', 'Observation Raised', 'Retesting', 'Passed'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                statusFilter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {status === 'all' ? 'All Statuses' : status}
            </button>
          ))}
        </div>
      </div>

      {/* Tickets Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase font-semibold text-[10px] tracking-wider">
              <tr>
                <th className="p-2.5 font-semibold">Ticket #</th>
                <th className="p-2.5 font-semibold">Feature &amp; Module</th>
                <th className="p-2.5 font-semibold">Priority</th>
                <th className="p-2.5 font-semibold">Developer / QA</th>
                <th className="p-2.5 font-semibold">Test Cases</th>
                <th className="p-2.5 font-semibold">Status</th>
                <th className="p-2.5 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredTickets.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-2.5 font-mono font-bold text-blue-600">{t.ticketNumber}</td>
                  <td className="p-2.5">
                    <div className="font-semibold text-slate-900 max-w-sm truncate">{t.featureName}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{t.moduleName}</div>
                  </td>
                  <td className="p-2.5">
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                        t.priority === 'Critical'
                          ? 'bg-red-100 text-red-600'
                          : t.priority === 'High'
                          ? 'bg-orange-100 text-orange-600'
                          : 'bg-blue-100 text-blue-600'
                      }`}
                    >
                      {t.priority}
                    </span>
                  </td>
                  <td className="p-2.5 text-[11px]">
                    <div>Dev: <strong className="text-slate-700">{t.developer}</strong></div>
                    <div className="text-slate-500">QA: <strong className="text-slate-700">{t.qaAssignee}</strong></div>
                  </td>
                  <td className="p-2.5">
                    <div className="font-bold text-slate-900">
                      {t.passedCount}/{t.testCasesCount} Passed
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {t.failedCount > 0 ? (
                        <span className="text-red-600">{t.failedCount} Failed</span>
                      ) : (
                        <span className="text-emerald-600">0 Failed</span>
                      )}
                    </div>
                  </td>
                  <td className="p-2.5">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-semibold border ${
                        t.status === 'In Testing'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : t.status === 'Observation Raised'
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td className="p-2.5 text-right space-x-1.5">
                    <button
                      onClick={() => {
                        onSelectTicket(t);
                        onNavigateTab('ai-test-hub');
                      }}
                      className="px-2.5 py-1 text-[11px] font-semibold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors cursor-pointer"
                    >
                      AI Test Hub
                    </button>
                    <button
                      onClick={() => {
                        onSelectTicket(t);
                        onNavigateTab('observations');
                      }}
                      className="px-2.5 py-1 text-[11px] font-semibold text-red-700 hover:text-red-900 bg-red-50 hover:bg-red-100 rounded border border-red-200 transition-colors cursor-pointer"
                    >
                      Observations ({t.observationsCount})
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
