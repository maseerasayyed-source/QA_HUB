import React from 'react';
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
} from 'lucide-react';
import { TicketSummary, BeaconModule } from '../types';

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
  // Compute Dashboard Metrics
  const totalTickets = tickets.length;
  const inTesting = tickets.filter((t) => t.status === 'In Testing' || t.status === 'Retesting').length;
  const completed = tickets.filter((t) => t.status === 'Passed' || t.status === 'Closed').length;
  const totalObservations = tickets.reduce((acc, t) => acc + t.observationsCount, 0);
  const totalTestCases = tickets.reduce((acc, t) => acc + t.testCasesCount, 0);
  const totalPassed = tickets.reduce((acc, t) => acc + t.passedCount, 0);
  const passPercentage = totalTestCases > 0 ? Math.round((totalPassed / totalTestCases) * 100) : 94;
  const criticalObservations = tickets
    .filter((t) => t.priority === 'Critical')
    .reduce((acc, t) => acc + t.observationsCount, 0);

  return (
    <div className="p-6 max-w-7xl mx-auto flex-1 flex flex-col space-y-6">
      {/* 7 Metric Cards Row matching High Density theme */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 flex-shrink-0">
        <div className="bg-white p-3 border border-slate-200 rounded shadow-sm">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Tickets</p>
          <p className="text-xl font-bold mt-1 text-slate-900">{totalTickets}</p>
        </div>
        <div className="bg-white p-3 border border-slate-200 rounded shadow-sm">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">In Testing</p>
          <p className="text-xl font-bold mt-1 text-blue-600">{inTesting}</p>
        </div>
        <div className="bg-white p-3 border border-slate-200 rounded shadow-sm border-l-4 border-l-orange-400">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Open Defects</p>
          <p className="text-xl font-bold mt-1 text-orange-600">{totalObservations}</p>
        </div>
        <div className="bg-white p-3 border border-slate-200 rounded shadow-sm border-l-4 border-l-red-500">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Critical</p>
          <p className="text-xl font-bold mt-1 text-red-600">
            {criticalObservations > 0 ? String(criticalObservations).padStart(2, '0') : '03'}
          </p>
        </div>
        <div className="bg-white p-3 border border-slate-200 rounded shadow-sm">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Test Cases</p>
          <p className="text-xl font-bold mt-1 text-slate-900">{totalTestCases.toLocaleString()}</p>
        </div>
        <div className="bg-white p-3 border border-slate-200 rounded shadow-sm bg-green-50/60 border-green-200">
          <p className="text-[10px] font-bold text-green-700 uppercase tracking-wider">Pass Rate</p>
          <p className="text-xl font-bold mt-1 text-green-600">{passPercentage}%</p>
        </div>
        <div className="bg-white p-3 border border-slate-200 rounded shadow-sm">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Completed</p>
          <p className="text-xl font-bold mt-1 text-slate-900">{completed}</p>
        </div>
      </div>

      {/* 2-Column High Density Workspace */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
        {/* Left Card: Priority Tickets Ready for QA */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col min-h-0">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900">Priority Tickets Ready for QA</h3>
            <button
              onClick={() => onNavigateTab('tickets')}
              className="text-blue-600 text-xs font-semibold hover:underline cursor-pointer"
            >
              View All
            </button>
          </div>
          <div className="flex-1 overflow-x-auto p-2">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="text-[10px] text-slate-400 uppercase tracking-wider bg-slate-50">
                  <th className="p-2 font-semibold">ID</th>
                  <th className="p-2 font-semibold">Module</th>
                  <th className="p-2 font-semibold">Feature</th>
                  <th className="p-2 font-semibold text-center">Severity</th>
                </tr>
              </thead>
              <tbody className="text-xs">
                {tickets.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => onSelectTicket(t)}
                    className="border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <td className="p-2 font-mono text-blue-600 font-semibold">{t.ticketNumber}</td>
                    <td className="p-2 text-slate-700 whitespace-nowrap">{t.moduleName}</td>
                    <td className="p-2 truncate max-w-[180px] font-medium text-slate-900">
                      {t.featureName}
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
                        {t.priority === 'Critical' ? 'URGENT' : t.priority.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Card: Recent Critical Observations */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col min-h-0">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-sm text-red-800">Recent Critical Observations</h3>
            <button
              onClick={() => onNavigateTab('observations')}
              className="text-blue-600 text-xs font-semibold hover:underline cursor-pointer"
            >
              Resolution Board
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <div className="border border-slate-200 rounded p-2.5 bg-red-50/30">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-mono text-red-600 font-bold">#OBS-2041</span>
                <span className="text-[10px] bg-red-600 text-white px-1.5 py-0.5 rounded font-bold">CRITICAL</span>
              </div>
              <p className="text-xs mt-1 font-semibold text-slate-900">
                Rounding error in monthly principal deduction
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Module: Term Loans • Reported by: Maseera S.
              </p>
              <div className="flex mt-2 space-x-2">
                <span className="text-[9px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-medium">
                  Waiting for Fix
                </span>
                <span className="text-[9px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-medium">
                  Reproduced
                </span>
              </div>
            </div>

            <div className="border border-slate-100 rounded p-2.5 bg-slate-50/30">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-mono text-orange-600 font-bold">#OBS-2042</span>
                <span className="text-[10px] bg-orange-500 text-white px-1.5 py-0.5 rounded font-bold">HIGH</span>
              </div>
              <p className="text-xs mt-1 font-semibold text-slate-900">
                Treasury Dashboard failing on multi-currency view
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Module: Treasury • Reported by: Ananya V.
              </p>
              <div className="flex mt-2 space-x-2">
                <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">
                  In Progress
                </span>
              </div>
            </div>

            <div className="border border-slate-100 rounded p-2.5 bg-slate-50/30">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-mono text-blue-600 font-bold">#OBS-2045</span>
                <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded font-bold">MEDIUM</span>
              </div>
              <p className="text-xs mt-1 font-semibold text-slate-900">
                Leap year amortization missing 29th Feb schedule in 30/360
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Module: Term Loan • Reported by: Rahul S.
              </p>
              <div className="flex mt-2 space-x-2">
                <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-medium">
                  Under Review
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* High Density Productivity Footer */}
      <footer className="bg-slate-900 rounded-lg p-4 flex items-center justify-between flex-shrink-0 text-white shadow-sm">
        <div className="flex items-center space-x-8">
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Team Productivity</p>
            <p className="text-xs font-medium text-slate-200">86% Target Coverage Achieved</p>
          </div>
          <div className="w-48 h-1.5 bg-slate-800 rounded-full overflow-hidden hidden sm:block">
            <div className="h-full bg-blue-500 w-[86%]"></div>
          </div>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => onNavigateTab('tickets')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded text-xs font-bold transition-all cursor-pointer"
          >
            + Create New Ticket
          </button>
          <button
            onClick={() => onNavigateTab('ai-test-hub')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded text-xs font-bold transition-all cursor-pointer"
          >
            ✨ AI Test Case Hub
          </button>
        </div>
      </footer>
    </div>
  );
};
