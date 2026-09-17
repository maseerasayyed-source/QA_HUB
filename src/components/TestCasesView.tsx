import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Plus,
  Search,
  CheckCircle2,
  Edit2,
  Trash2,
  Copy,
  Sparkles,
  Save,
  Send,
  RotateCcw,
} from 'lucide-react';
import { TestCaseHeaderMeta, TestCaseItem, BeaconModule } from '../types';
import { exportTestCasesToExcel } from '../utils/excelExport';
import { generateTestCaseFromOneLine } from '../utils/aiGenerator';

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
      ticketNo: '',
      clientName: 'Treasury Master',
      sha: '',
      taskName: '',
      taskDoneBy: 'Maseera Sayyed',
      signOffBy: '',
      reviewStatus: 'Draft',
      version: '1.0',
    }
  );

  const [testCases, setTestCases] = useState<TestCaseItem[]>(
    initialTestCases || []
  );

  const [oneLineInput, setOneLineInput] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pass' | 'fail' | 'blocked' | 'not run'>('all');
  const [downloadSuccessToast, setDownloadSuccessToast] = useState<string | null>(null);

  // One-line AI generation
  const handleAiGenerateFromOneLine = () => {
    if (!oneLineInput.trim()) return;
    const generated = generateTestCaseFromOneLine(oneLineInput, undefined, testCases.length + 1);
    const newCase: TestCaseItem = {
      id: `tc-${Date.now()}`,
      testCaseId: generated.testCaseId || `TC${testCases.length + 1}`,
      testModule: generated.testModule || 'term loan',
      featureTab: generated.featureTab || 'penalty',
      testScenario: generated.testScenario || oneLineInput,
      testCases: generated.testCases || `1. Execute ${oneLineInput}`,
      testInputs: generated.testInputs || '',
      expectedResult: generated.expectedResult || '',
      validationScenario: generated.validationScenario || '',
      additionalCoverage: generated.additionalCoverage || '',
      actualResult: 'Pending execution',
      status: 'not run',
      reviewStatus: 'Draft',
      attachments: [],
    };
    setTestCases((prev) => [...prev, newCase]);
    setOneLineInput('');
  };

  const handleDownloadExcel = () => {
    exportTestCasesToExcel(headerMeta, testCases);
    setDownloadSuccessToast(`Downloaded formatted test cases Excel file!`);
    setTimeout(() => {
      setDownloadSuccessToast(null);
    }, 3500);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      {downloadSuccessToast && (
        <div className="bg-emerald-600 text-white px-4 py-2 rounded-lg shadow-md flex items-center justify-between text-xs font-semibold">
          <span>{downloadSuccessToast}</span>
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
              Test Case Workbench (Ticket #{headerMeta.ticketNo})
            </h1>
            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 font-bold rounded text-xs">
              {headerMeta.reviewStatus || 'Draft'} (v{headerMeta.version || '1.0'})
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Write, review, edit, and export test cases formatted directly to your Beacon financial Excel standard.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onNavigateToGenerator && (
            <button
              onClick={onNavigateToGenerator}
              className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-md flex items-center gap-1.5 border border-indigo-200 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>AI Case Hub</span>
            </button>
          )}
        </div>
      </div>

      {/* ONE-LINE AI GENERATION BAR */}
      <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>One-Line AI Test Case Generation (Multilingual QA Engine)</span>
          </div>
          <span className="text-[11px] text-indigo-700 font-medium">Any language / Hinglish supported</span>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={oneLineInput}
            onChange={(e) => setOneLineInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAiGenerateFromOneLine();
            }}
            placeholder="Type in any language (Hinglish/Hindi/English) e.g. 'agr loan amount 0 se kam ho to save nahi hona chahiye'..."
            className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            onClick={handleAiGenerateFromOneLine}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded cursor-pointer flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
            <span>AI Generate</span>
          </button>
        </div>
        <p className="text-[10px] text-slate-500">
          Enter any requirement in informal Hindi/Hinglish or English — AI outputs understandable English with scenario-consistent expected results.
        </p>
      </div>

      {/* TABLE ACTION TOOLBAR (RIGHT ABOVE THE TEST CASE TABLE) */}
      <div className="flex items-center justify-between bg-slate-50 px-4 py-2 border border-slate-200 rounded-t-lg">
        <span className="text-xs font-bold text-slate-700">Test Cases Table ({testCases.length} items)</span>
        <button
          onClick={handleDownloadExcel}
          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-md flex items-center gap-2 shadow-xs cursor-pointer transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download Excel</span>
        </button>
      </div>

      {/* MAIN TEST CASES TABLE */}
      <div className="bg-white border border-slate-300 rounded-b-lg border-t-0 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-10 bg-[#F8CBAD] text-slate-900 font-bold border-b border-slate-300">
              <tr>
                <th className="p-2.5 border-r border-slate-300 w-16 text-center">ID</th>
                <th className="p-2.5 border-r border-slate-300 min-w-[220px]">Test Scenario</th>
                <th className="p-2.5 border-r border-slate-300 min-w-[240px]">Test Cases</th>
                <th className="p-2.5 border-r border-slate-300 min-w-[220px]">Expected Result</th>
                <th className="p-2.5 border-r border-slate-300 w-24 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {testCases.map((tc, idx) => (
                <tr key={tc.id} className="hover:bg-slate-50">
                  <td className="p-2.5 border-r border-slate-200 font-mono font-bold text-blue-700">{tc.testCaseId}</td>
                  <td className="p-2.5 border-r border-slate-200">{tc.testScenario}</td>
                  <td className="p-2.5 border-r border-slate-200">{tc.testCases}</td>
                  <td className="p-2.5 border-r border-slate-200">{tc.expectedResult}</td>
                  <td className="p-2.5 border-r border-slate-200 text-center font-bold">{tc.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
