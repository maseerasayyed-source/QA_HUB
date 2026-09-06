import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Edit2,
  Trash2,
  Copy,
  Sparkles,
  ExternalLink,
  Save,
  Check,
  FileDown,
} from 'lucide-react';
import { TestCaseHeaderMeta, TestCaseItem, BeaconModule } from '../types';
import { exportTestCasesToExcel } from '../utils/excelExport';

interface TestCasesViewProps {
  initialHeader?: TestCaseHeaderMeta;
  initialTestCases?: TestCaseItem[];
  modules: BeaconModule[];
  onNavigateToGenerator?: () => void;
}

export const TestCasesView: React.FC<TestCasesViewProps> = ({
  initialHeader,
  initialTestCases,
  modules,
  onNavigateToGenerator,
}) => {
  const [headerMeta, setHeaderMeta] = useState<TestCaseHeaderMeta>(
    initialHeader || {
      ticketNo: '21653',
      clientName: 'Treasury Master',
      sha: 'SHA-1: 4710b619ea012cba75ee657d64ebd49e656948df*',
      taskName: 'penalty overdue report',
      taskDoneBy: 'Maseera Sayyed',
      signOffBy: 'Ashwini poke',
    }
  );

  const [testCases, setTestCases] = useState<TestCaseItem[]>(
    initialTestCases || []
  );

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pass' | 'fail' | 'blocked' | 'not run'>('all');
  const [isEditingHeader, setIsEditingHeader] = useState(false);
  const [downloadSuccessToast, setDownloadSuccessToast] = useState<string | null>(null);

  // Modal State for adding/editing a test case
  const [editingCase, setEditingCase] = useState<TestCaseItem | null>(null);
  const [isNewCase, setIsNewCase] = useState(false);

  // Summary Metrics
  const totalCases = testCases.length;
  const passedCount = testCases.filter((c) => c.status === 'pass').length;
  const failedCount = testCases.filter((c) => c.status === 'fail').length;
  const blockedCount = testCases.filter((c) => c.status === 'blocked').length;
  const passRate = totalCases > 0 ? Math.round((passedCount / totalCases) * 100) : 0;

  // Filtered cases
  const filteredCases = testCases.filter((c) => {
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      c.testCaseId.toLowerCase().includes(q) ||
      c.testModule.toLowerCase().includes(q) ||
      c.featureTab.toLowerCase().includes(q) ||
      c.testScenario.toLowerCase().includes(q) ||
      c.testCases.toLowerCase().includes(q) ||
      c.testInputs.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const handleDownloadExcel = () => {
    exportTestCasesToExcel(headerMeta, testCases);
    const fileName = `${(headerMeta.taskName || 'test_cases').replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase()}_testing.xlsx`;
    setDownloadSuccessToast(`Downloaded ${fileName} in your exact Excel format!`);
    setTimeout(() => {
      setDownloadSuccessToast(null);
    }, 4500);
  };

  const handleAddNewRow = () => {
    const nextNum = testCases.length + 1;
    const newCase: TestCaseItem = {
      id: `tc-${Date.now()}`,
      testCaseId: `TC${nextNum}`,
      testModule: 'term loan',
      featureTab: 'penalty',
      testScenario: '',
      testCases: '',
      testInputs: '',
      expectedResult: '',
      actualResult: '',
      status: 'not run',
      screenshot1: '',
    };
    setEditingCase(newCase);
    setIsNewCase(true);
  };

  const handleSaveModalCase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCase) return;

    if (isNewCase) {
      setTestCases((prev) => [...prev, editingCase]);
    } else {
      setTestCases((prev) =>
        prev.map((item) => (item.id === editingCase.id ? editingCase : item))
      );
    }
    setEditingCase(null);
    setIsNewCase(false);
  };

  const handleDeleteCase = (id: string) => {
    if (confirm('Are you sure you want to delete this test case row?')) {
      setTestCases((prev) => prev.filter((item) => item.id !== id));
    }
  };

  const handleDuplicateCase = (tc: TestCaseItem) => {
    const duplicate: TestCaseItem = {
      ...tc,
      id: `tc-${Date.now()}`,
      testCaseId: `TC${testCases.length + 1}`,
      status: 'not run',
    };
    setTestCases((prev) => [...prev, duplicate]);
  };

  const cycleStatus = (id: string) => {
    setTestCases((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const cycle: Record<TestCaseItem['status'], TestCaseItem['status']> = {
          'not run': 'pass',
          pass: 'fail',
          fail: 'blocked',
          blocked: 'pass',
        };
        return { ...c, status: cycle[c.status] };
      })
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      {/* Toast alert when Excel file is downloaded */}
      {downloadSuccessToast && (
        <div className="bg-emerald-600 text-white px-4 py-2.5 rounded-lg shadow-md flex items-center justify-between text-xs font-semibold animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-200" />
            <span>{downloadSuccessToast}</span>
          </div>
          <button
            onClick={() => setDownloadSuccessToast(null)}
            className="text-emerald-200 hover:text-white text-xs underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top Action & Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-md border border-emerald-200">
              <FileSpreadsheet className="w-4 h-4" />
            </span>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Test Case Workbench &amp; Excel Exporter
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Write, review, edit, and export test cases formatted directly to your Beacon financial Excel standard.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onNavigateToGenerator && (
            <button
              onClick={onNavigateToGenerator}
              className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-md flex items-center gap-1.5 border border-indigo-200 transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>AI Case Generator</span>
            </button>
          )}

          <button
            onClick={handleAddNewRow}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-md flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Test Case</span>
          </button>

          {/* MAIN DOWNLOAD EXCEL BUTTON */}
          <button
            onClick={handleDownloadExcel}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-md flex items-center gap-2 shadow-xs transition-all cursor-pointer ring-2 ring-emerald-400/20"
            title="Download test cases in exact Excel (.xlsx) format"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* Excel Rows 1-6 Metadata Block (Header Info) */}
      <div className="bg-[#418AB3] text-white rounded-lg p-4 shadow-sm border border-[#357294] space-y-3">
        <div className="flex items-center justify-between border-b border-white/20 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-wider bg-black/20 px-2 py-0.5 rounded">
              Excel Header Block (Rows 1 – 6)
            </span>
            <span className="text-xs text-blue-100">
              This metadata block is automatically preserved at the top of your exported Excel file
            </span>
          </div>
          <button
            onClick={() => setIsEditingHeader(!isEditingHeader)}
            className="text-xs bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded flex items-center gap-1 font-semibold transition-colors cursor-pointer"
          >
            <Edit2 className="w-3 h-3" />
            <span>{isEditingHeader ? 'Finish Editing' : 'Edit Header Details'}</span>
          </button>
        </div>

        {isEditingHeader ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block text-[11px] text-blue-100 mb-0.5 font-medium">Ticket No</label>
              <input
                type="text"
                value={headerMeta.ticketNo}
                onChange={(e) => setHeaderMeta({ ...headerMeta, ticketNo: e.target.value })}
                className="w-full bg-white text-slate-900 px-2.5 py-1 rounded text-xs focus:ring-2 focus:ring-blue-300 font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] text-blue-100 mb-0.5 font-medium">Client Name</label>
              <input
                type="text"
                value={headerMeta.clientName}
                onChange={(e) => setHeaderMeta({ ...headerMeta, clientName: e.target.value })}
                className="w-full bg-white text-slate-900 px-2.5 py-1 rounded text-xs focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <div>
              <label className="block text-[11px] text-blue-100 mb-0.5 font-medium">SHA / Commit</label>
              <input
                type="text"
                value={headerMeta.sha}
                onChange={(e) => setHeaderMeta({ ...headerMeta, sha: e.target.value })}
                className="w-full bg-white text-slate-900 px-2.5 py-1 rounded text-xs focus:ring-2 focus:ring-blue-300 font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] text-blue-100 mb-0.5 font-medium">Task Name</label>
              <input
                type="text"
                value={headerMeta.taskName}
                onChange={(e) => setHeaderMeta({ ...headerMeta, taskName: e.target.value })}
                className="w-full bg-white text-slate-900 px-2.5 py-1 rounded text-xs focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <div>
              <label className="block text-[11px] text-blue-100 mb-0.5 font-medium">Task done by (QA)</label>
              <input
                type="text"
                value={headerMeta.taskDoneBy}
                onChange={(e) => setHeaderMeta({ ...headerMeta, taskDoneBy: e.target.value })}
                className="w-full bg-white text-slate-900 px-2.5 py-1 rounded text-xs focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <div>
              <label className="block text-[11px] text-blue-100 mb-0.5 font-medium">Sign off By (Lead / Peer)</label>
              <input
                type="text"
                value={headerMeta.signOffBy}
                onChange={(e) => setHeaderMeta({ ...headerMeta, signOffBy: e.target.value })}
                className="w-full bg-white text-slate-900 px-2.5 py-1 rounded text-xs focus:ring-2 focus:ring-blue-300"
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-2 gap-x-6 text-xs font-mono">
            <div>
              <span className="font-semibold text-blue-100">Ticket No - </span>
              <span className="font-bold text-white">{headerMeta.ticketNo}</span>
            </div>
            <div>
              <span className="font-semibold text-blue-100">Client Name:- </span>
              <span className="font-bold text-white">{headerMeta.clientName}</span>
            </div>
            <div className="truncate">
              <span className="font-semibold text-blue-100">SHA : </span>
              <span className="text-white text-[11px]">{headerMeta.sha}</span>
            </div>
            <div>
              <span className="font-semibold text-blue-100">Task Name: </span>
              <span className="font-bold text-white">{headerMeta.taskName}</span>
            </div>
            <div>
              <span className="font-semibold text-blue-100">Task done by- </span>
              <span className="font-bold text-white">{headerMeta.taskDoneBy}</span>
            </div>
            <div>
              <span className="font-semibold text-blue-100">Sign off By - </span>
              <span className="font-bold text-white">{headerMeta.signOffBy}</span>
            </div>
          </div>
        )}
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search test case ID, scenario, inputs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-100 border-none rounded-md py-1.5 pl-8 pr-3 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-800"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          {(['all', 'pass', 'fail', 'blocked', 'not run'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1 rounded text-xs font-bold capitalize transition-colors cursor-pointer ${
                statusFilter === status
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {status === 'all' ? `All (${totalCases})` : `${status} (${testCases.filter((c) => c.status === status).length})`}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-500 pl-2">
          <span>Pass Rate: <strong className="text-emerald-600">{passRate}%</strong></span>
        </div>
      </div>

      {/* THE MAIN TEST CASES TABLE (Peach / Salmon headers matching user's Excel) */}
      <div className="bg-white border border-slate-300 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[580px] overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-10">
              {/* Styled exactly like Row 9 in Excel screenshot with peach/salmon fill */}
              <tr className="bg-[#F8CBAD] text-slate-900 border-b-2 border-slate-400 text-[11px] font-bold tracking-tight">
                <th className="p-2.5 border-r border-slate-300 w-16 text-center">TestCase_ID</th>
                <th className="p-2.5 border-r border-slate-300 w-24">Test Module</th>
                <th className="p-2.5 border-r border-slate-300 w-28">feature tab /flow report</th>
                <th className="p-2.5 border-r border-slate-300 min-w-[220px]">Test Scenario</th>
                <th className="p-2.5 border-r border-slate-300 min-w-[240px]">Test Cases</th>
                <th className="p-2.5 border-r border-slate-300 min-w-[180px]">Test Inputs</th>
                <th className="p-2.5 border-r border-slate-300 min-w-[220px]">Expected Result</th>
                <th className="p-2.5 border-r border-slate-300 min-w-[220px]">Actual Result</th>
                <th className="p-2.5 border-r border-slate-300 w-20 text-center">Status</th>
                <th className="p-2.5 border-r border-slate-300 w-24 text-center">Screenshot1</th>
                <th className="p-2.5 text-center w-20">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800">
              {filteredCases.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-slate-400 text-xs">
                    No test cases match your filter. Click <strong>"+ Add Test Case"</strong> to create one!
                  </td>
                </tr>
              ) : (
                filteredCases.map((tc) => (
                  <tr
                    key={tc.id}
                    className="hover:bg-blue-50/40 transition-colors group align-top"
                  >
                    {/* TestCase_ID */}
                    <td className="p-2.5 border-r border-slate-200 font-mono font-bold text-center text-blue-700 bg-slate-50/50">
                      {tc.testCaseId}
                    </td>

                    {/* Test Module */}
                    <td className="p-2.5 border-r border-slate-200 whitespace-nowrap text-slate-700 font-medium">
                      {tc.testModule}
                    </td>

                    {/* feature tab /flow report */}
                    <td className="p-2.5 border-r border-slate-200 text-slate-700 font-medium">
                      {tc.featureTab}
                    </td>

                    {/* Test Scenario */}
                    <td className="p-2.5 border-r border-slate-200 text-slate-900 leading-relaxed font-normal">
                      {tc.testScenario}
                    </td>

                    {/* Test Cases (Verification Steps) */}
                    <td className="p-2.5 border-r border-slate-200 text-slate-800 leading-relaxed">
                      {tc.testCases}
                    </td>

                    {/* Test Inputs */}
                    <td className="p-2.5 border-r border-slate-200 font-mono text-[11px] text-slate-700 whitespace-pre-line bg-slate-50/40">
                      {tc.testInputs}
                    </td>

                    {/* Expected Result */}
                    <td className="p-2.5 border-r border-slate-200 text-slate-800 leading-relaxed">
                      {tc.expectedResult}
                    </td>

                    {/* Actual Result */}
                    <td className="p-2.5 border-r border-slate-200 text-slate-700 leading-relaxed">
                      {tc.actualResult || <span className="text-slate-400 italic">Pending run</span>}
                    </td>

                    {/* Status Badge with Click to toggle */}
                    <td className="p-2.5 border-r border-slate-200 text-center">
                      <button
                        onClick={() => cycleStatus(tc.id)}
                        title="Click to toggle status (pass -> fail -> blocked)"
                        className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer transition-transform hover:scale-105 ${
                          tc.status === 'pass'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : tc.status === 'fail'
                            ? 'bg-red-100 text-red-800 border border-red-300'
                            : tc.status === 'blocked'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-slate-100 text-slate-600 border border-slate-300'
                        }`}
                      >
                        {tc.status}
                      </button>
                    </td>

                    {/* Screenshot1 */}
                    <td className="p-2.5 border-r border-slate-200 text-center text-[10px] text-slate-400">
                      {tc.screenshot1 ? (
                        <span className="text-blue-600 underline font-medium">Attached</span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="p-2 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => {
                            setEditingCase(tc);
                            setIsNewCase(false);
                          }}
                          className="p-1 hover:bg-blue-100 rounded text-slate-500 hover:text-blue-700 cursor-pointer"
                          title="Edit Row"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDuplicateCase(tc)}
                          className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-800 cursor-pointer"
                          title="Duplicate Row"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCase(tc.id)}
                          className="p-1 hover:bg-red-100 rounded text-slate-400 hover:text-red-600 cursor-pointer"
                          title="Delete Row"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Quick Add Row & Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 text-slate-500 font-medium">
            <span>Showing <strong>{filteredCases.length}</strong> of <strong>{testCases.length}</strong> test cases</span>
            <span>•</span>
            <span className="text-emerald-700"><strong>{passedCount}</strong> Passed</span>
            <span>•</span>
            <span className="text-red-700"><strong>{failedCount}</strong> Failed</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleAddNewRow}
              className="px-3 py-1 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Plus className="w-3 h-3" />
              <span>+ Add Row</span>
            </button>
            <button
              onClick={handleDownloadExcel}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>Export as Excel (.xlsx)</span>
            </button>
          </div>
        </div>
      </div>

      {/* EDIT / ADD TEST CASE MODAL */}
      {editingCase && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-2xl w-full p-5 shadow-2xl border border-slate-200 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h2 className="text-sm font-bold text-slate-900">
                {isNewCase ? 'Add New Test Case' : `Edit Test Case (${editingCase.testCaseId})`}
              </h2>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-200">
                Beacon Excel Schema
              </span>
            </div>

            <form onSubmit={handleSaveModalCase} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">TestCase_ID</label>
                  <input
                    type="text"
                    value={editingCase.testCaseId}
                    onChange={(e) => setEditingCase({ ...editingCase, testCaseId: e.target.value })}
                    required
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Test Module</label>
                  <input
                    type="text"
                    value={editingCase.testModule}
                    onChange={(e) => setEditingCase({ ...editingCase, testModule: e.target.value })}
                    required
                    placeholder="e.g. term loan, treasury, investments"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Feature Tab / Flow Report</label>
                  <input
                    type="text"
                    value={editingCase.featureTab}
                    onChange={(e) => setEditingCase({ ...editingCase, featureTab: e.target.value })}
                    placeholder="e.g. penalty, overdue report"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Test Scenario</label>
                <textarea
                  rows={2}
                  value={editingCase.testScenario}
                  onChange={(e) => setEditingCase({ ...editingCase, testScenario: e.target.value })}
                  placeholder="e.g. Penalty entries appear in the cashflow when overdue occurs after loan disbursement."
                  required
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Test Cases (Verification Steps)</label>
                <textarea
                  rows={2}
                  value={editingCase.testCases}
                  onChange={(e) => setEditingCase({ ...editingCase, testCases: e.target.value })}
                  placeholder="Verify that penalty is applied and displayed in cashflow when interest or principal becomes overdue after disbursement."
                  required
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Test Inputs</label>
                <textarea
                  rows={2}
                  value={editingCase.testInputs}
                  onChange={(e) => setEditingCase({ ...editingCase, testInputs: e.target.value })}
                  placeholder="e.g. TL-23-24-00001&#10;penalty interest - 10%&#10;penalty principal - 10%"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs font-mono"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Expected Result</label>
                  <textarea
                    rows={2}
                    value={editingCase.expectedResult}
                    onChange={(e) => setEditingCase({ ...editingCase, expectedResult: e.target.value })}
                    placeholder="What the Beacon financial engine should compute or display"
                    required
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Actual Result</label>
                  <textarea
                    rows={2}
                    value={editingCase.actualResult}
                    onChange={(e) => setEditingCase({ ...editingCase, actualResult: e.target.value })}
                    placeholder="Actual behavior observed during execution"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Execution Status</label>
                  <select
                    value={editingCase.status}
                    onChange={(e) => setEditingCase({ ...editingCase, status: e.target.value as any })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs font-bold"
                  >
                    <option value="pass">pass (Green)</option>
                    <option value="fail">fail (Red)</option>
                    <option value="blocked">blocked (Yellow)</option>
                    <option value="not run">not run (Slate)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Screenshot Reference (Screenshot1)</label>
                  <input
                    type="text"
                    value={editingCase.screenshot1 || ''}
                    onChange={(e) => setEditingCase({ ...editingCase, screenshot1: e.target.value })}
                    placeholder="e.g. img_2041_cashflow_penalty.png"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingCase(null)}
                  className="px-3.5 py-1.5 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Test Case</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
