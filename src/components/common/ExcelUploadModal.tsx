import React, { useState, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  X,
  FileText,
  Building2,
  GitBranch,
  User,
  ListChecks,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { TestCaseItem, TestCaseHeaderMeta } from '../../types';
import { parseCorporateExcelSheet, CorporateExcelParseResult } from '../../utils/fileParser';

interface ExcelUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (result: {
    headerMeta: Partial<TestCaseHeaderMeta>;
    testCases: TestCaseItem[];
    mode: 'replace' | 'append';
  }) => void;
  currentTicketNo: string;
  currentTestCaseCount: number;
}

export const ExcelUploadModal: React.FC<ExcelUploadModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
  currentTicketNo,
  currentTestCaseCount,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parseResult, setParseResult] = useState<CorporateExcelParseResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileProcess = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'xlsx' && ext !== 'xls' && ext !== 'csv') {
      setErrorMessage('Please upload a valid Excel file (.xlsx, .xls, or .csv).');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const result = await parseCorporateExcelSheet(file);
      if (result.testCases.length === 0) {
        setErrorMessage(
          'No test cases could be parsed from the uploaded file. Please ensure the Excel contains rows for TestCase_ID, Test Scenario, Test Cases, or Expected Result.'
        );
        setIsProcessing(false);
        return;
      }
      setParseResult(result);
    } catch (err: any) {
      setErrorMessage(`Failed to parse Excel file: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileProcess(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileProcess(files[0]);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleConfirmImport = () => {
    if (!parseResult || parseResult.testCases.length === 0) return;
    onImportSuccess({
      headerMeta: parseResult.headerMeta,
      testCases: parseResult.testCases,
      mode: importMode,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-[#1E293B] border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-200">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Submit & Import Test Cases Excel (.xlsx)</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Treasury & Beacon Format Supported
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Upload your QA test case sheet. Automatically extracts Ticket metadata and maps all test case rows.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Dropzone area */}
          {!parseResult ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                isDragging
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                  : 'border-slate-600 hover:border-emerald-400 hover:bg-slate-800/50 bg-slate-900/40 text-slate-400'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileInputChange}
                className="hidden"
              />
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                <Upload className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">
                  {isProcessing ? 'Processing Excel Sheet...' : 'Click or Drag & Drop Excel Sheet Here'}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Supports .xlsx, .xls, and .csv files with standard header rows (Ticket No, Client Name, Task Name, TestCase_ID...)
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 mt-2 text-[11px] text-slate-400">
                <span className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700">✓ Auto-detects Header block</span>
                <span className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700">✓ Maps Scenario & Steps</span>
                <span className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700">✓ Preserves Status & Evidence</span>
              </div>
            </div>
          ) : (
            /* Parsed Summary & Verification */
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Found {parseResult.totalRows} Test Cases in Sheet: "{parseResult.sheetName}"
                    </h3>
                    <p className="text-xs text-slate-400">
                      All columns have been mapped successfully. Review extracted metadata and preview rows below.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setParseResult(null)}
                  className="px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-600 transition-colors"
                >
                  Upload Another File
                </button>
              </div>

              {/* Extracted Header Metadata */}
              <div className="bg-slate-900/60 border border-slate-700/80 rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-emerald-400" />
                  Extracted Header Metadata
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                  <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700/60">
                    <span className="text-slate-400 block text-[10px]">Ticket Number</span>
                    <span className="font-semibold text-white">
                      {parseResult.headerMeta.ticketNo || currentTicketNo || 'Not specified'}
                    </span>
                  </div>
                  <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700/60">
                    <span className="text-slate-400 block text-[10px]">Client Name</span>
                    <span className="font-semibold text-white">
                      {parseResult.headerMeta.clientName || 'Treasury Master'}
                    </span>
                  </div>
                  <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700/60">
                    <span className="text-slate-400 block text-[10px]">Branch / Release</span>
                    <span className="font-semibold text-white">
                      {parseResult.headerMeta.branch || 'Beaconweb+Release'}
                    </span>
                  </div>
                  <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700/60 sm:col-span-2">
                    <span className="text-slate-400 block text-[10px]">Task / Feature Name</span>
                    <span className="font-semibold text-white">
                      {parseResult.headerMeta.taskName || 'Test Specification'}
                    </span>
                  </div>
                  <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700/60">
                    <span className="text-slate-400 block text-[10px]">Task done by (QA)</span>
                    <span className="font-semibold text-white">
                      {parseResult.headerMeta.taskDoneBy || 'Maseera Sayyed'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Import Options (Replace vs Append) */}
              <div className="bg-slate-900/60 border border-slate-700/80 rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Select Import Mode
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label
                    onClick={() => setImportMode('replace')}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      importMode === 'replace'
                        ? 'bg-emerald-500/10 border-emerald-500 text-white shadow-xs'
                        : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="mt-1 text-emerald-500 focus:ring-emerald-500"
                    />
                    <div>
                      <div className="text-xs font-bold text-white">Replace Current Table</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Clear existing {currentTestCaseCount} rows and load all {parseResult.totalRows} test cases from the Excel sheet.
                      </div>
                    </div>
                  </label>

                  <label
                    onClick={() => setImportMode('append')}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      importMode === 'append'
                        ? 'bg-emerald-500/10 border-emerald-500 text-white shadow-xs'
                        : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'append'}
                      onChange={() => setImportMode('append')}
                      className="mt-1 text-emerald-500 focus:ring-emerald-500"
                    />
                    <div>
                      <div className="text-xs font-bold text-white">Append to Current Table</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Keep existing {currentTestCaseCount} rows and add the {parseResult.totalRows} new test cases to the end.
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Rows Preview Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <ListChecks className="w-3.5 h-3.5 text-emerald-400" />
                    Preview Rows ({Math.min(parseResult.testCases.length, 5)} of {parseResult.testCases.length} shown)
                  </h4>
                  <span className="text-[11px] text-slate-400">Ready to submit into QA Hub</span>
                </div>

                <div className="overflow-x-auto border border-slate-700 rounded-xl max-h-48 bg-slate-900/40">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-800 text-slate-400 text-[10px] uppercase tracking-wider sticky top-0">
                      <tr>
                        <th className="p-2 border-b border-slate-700 w-16">TC ID</th>
                        <th className="p-2 border-b border-slate-700 min-w-[200px]">Test Scenario</th>
                        <th className="p-2 border-b border-slate-700 min-w-[200px]">Test Cases</th>
                        <th className="p-2 border-b border-slate-700 min-w-[180px]">Expected Result</th>
                        <th className="p-2 border-b border-slate-700 w-20 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {parseResult.testCases.slice(0, 5).map((tc, idx) => (
                        <tr key={tc.id || idx} className="hover:bg-slate-800/40">
                          <td className="p-2 font-mono font-bold text-emerald-400">{tc.testCaseId}</td>
                          <td className="p-2 truncate max-w-xs">{tc.testScenario}</td>
                          <td className="p-2 truncate max-w-xs text-slate-400">{tc.testCases}</td>
                          <td className="p-2 truncate max-w-xs text-slate-400">{tc.expectedResult}</td>
                          <td className="p-2 text-center">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 uppercase">
                              {tc.status || 'PASS'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 flex items-start gap-2.5 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-700 bg-slate-900/80 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-600 transition-colors"
          >
            Cancel
          </button>

          {parseResult && (
            <button
              onClick={handleConfirmImport}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-md flex items-center gap-2 cursor-pointer transition-transform active:scale-95"
            >
              <span>
                {importMode === 'replace'
                  ? `Submit & Replace with ${parseResult.totalRows} Test Cases`
                  : `Submit & Append ${parseResult.totalRows} Test Cases`}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
