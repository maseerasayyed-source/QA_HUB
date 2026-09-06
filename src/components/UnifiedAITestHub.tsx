import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Download,
  Plus,
  Trash2,
  Copy,
  CheckCircle2,
  Wand2,
  Camera,
  Layers,
  FileText,
  Search,
  Check,
  Target,
  ShieldAlert,
  Tag,
  X,
  UploadCloud,
  CopyCheck,
  AlertTriangle,
} from 'lucide-react';
import { TestCaseHeaderMeta, TestCaseItem, TicketSummary, BeaconModule, FileAttachment } from '../types';
import { exportTestCasesToExcel, getTestCasesExcelBlob } from '../utils/excelExport';
import {
  polishTestCaseItem,
  polishTestScenario,
  polishTestSteps,
  polishExpectedResult,
  correctSpelling,
} from '../utils/textPolisher';
import { ColumnHeader, SortDirection } from './common/ColumnHeader';
import { RowAttachmentsCell } from './common/RowAttachmentsCell';
import { AzureDevopsModal } from './common/AzureDevopsModal';

interface UnifiedAITestHubProps {
  initialHeader: TestCaseHeaderMeta;
  initialTestCases: TestCaseItem[];
  tickets: TicketSummary[];
  modules: BeaconModule[];
  onUpdateHeader?: (header: TestCaseHeaderMeta) => void;
  onUpdateTestCases?: (testCases: TestCaseItem[]) => void;
}

export const UnifiedAITestHub: React.FC<UnifiedAITestHubProps> = ({
  initialHeader,
  initialTestCases,
  tickets,
  modules,
  onUpdateHeader,
  onUpdateTestCases,
}) => {
  // Header Metadata
  const [header, setHeader] = useState<TestCaseHeaderMeta>(initialHeader);

  // Test Cases List
  const [testCases, setTestCases] = useState<TestCaseItem[]>(initialTestCases);

  // Currently Matched Ticket Number
  const [selectedTicketNumber, setSelectedTicketNumber] = useState<string>(initialHeader.ticketNo || '21653');

  // UI & Search State
  const [filterModule, setFilterModule] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [copiedRowId, setCopiedRowId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // Column Sort & Filter
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({
    testCaseId: '',
    testModule: '',
    featureTab: '',
    testScenario: '',
    testCases: '',
    testInputs: '',
    expectedResult: '',
    actualResult: '',
    status: '',
    screenshot1: '',
  });

  // AI Drawer & Azure DevOps Modal
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState<boolean>(false);
  const [isAdoModalOpen, setIsAdoModalOpen] = useState<boolean>(false);
  const [adoNotification, setAdoNotification] = useState<string | null>(null);

  // Screenshot scanner
  const [uploadedScreenshot, setUploadedScreenshot] = useState<string | null>(null);
  const [screenshotFileName, setScreenshotFileName] = useState<string>('');
  const [detectedFields, setDetectedFields] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Currently Matched Ticket
  const matchedTicket = useMemo(() => {
    return (
      tickets.find((t) => t.ticketNumber.toLowerCase() === selectedTicketNumber.toLowerCase()) ||
      tickets[0]
    );
  }, [tickets, selectedTicketNumber]);

  // Ticket Context states for AI Generator
  const [ticketDescription, setTicketDescription] = useState<string>(
    matchedTicket?.description ||
      matchedTicket?.qaRequirementDoc ||
      'Automate overdue penalty interest and principal calculation for Term Loans after loan disbursement.'
  );
  const [ticketScenarios, setTicketScenarios] = useState<string>(
    matchedTicket?.scenarioDetails ||
      'Scenario 1: Overdue past grace period (5 days) triggers daily penalty accrual.\nScenario 2: Pre-disbursement deals must suppress all penalty rows.\nScenario 3: Excel export must preserve formatted figures without number truncation.'
  );

  // Match Ticket Handler: Automatically syncs Header Meta (Ticket No, Client Name, SHA, Task Name, Task done by, Sign off By)
  const handleSelectTicket = (tNumber: string) => {
    setSelectedTicketNumber(tNumber);
    const found = tickets.find((t) => t.ticketNumber.toLowerCase() === tNumber.toLowerCase());
    if (found) {
      const updatedHeader: TestCaseHeaderMeta = {
        ...header,
        ticketNo: found.ticketNumber,
        taskName: found.featureName,
        clientName: found.clientName || header.clientName || 'Treasury Master',
        sha: found.shaCommit || header.sha || 'SHA-1: 4710b619ea012cba75ee657d64ebd49e656948df*',
        taskDoneBy: found.qaAssignee || header.taskDoneBy || 'Maseera Sayyed',
        signOffBy: found.signOffBy || header.signOffBy || 'Ashwini Poke',
      };
      setHeader(updatedHeader);
      onUpdateHeader?.(updatedHeader);

      if (found.description) setTicketDescription(found.description);
      else if (found.qaRequirementDoc) setTicketDescription(found.qaRequirementDoc);
      if (found.scenarioDetails) setTicketScenarios(found.scenarioDetails);
    }
  };

  // Sync test cases back to parent and check duplicates
  const updateTestCases = (newCases: TestCaseItem[]) => {
    setTestCases(newCases);
    onUpdateTestCases?.(newCases);
  };

  // Duplicate Check on Cell Change
  const checkDuplicateAndAlert = (id: string, field: keyof TestCaseItem, value: string) => {
    if (!value || value.trim().length < 3) return;
    const cleanVal = value.trim().toLowerCase();

    const existingIndex = testCases.findIndex(
      (tc) =>
        tc.id !== id &&
        ((field === 'testCaseId' && tc.testCaseId.trim().toLowerCase() === cleanVal) ||
          (field === 'testScenario' && tc.testScenario.trim().toLowerCase() === cleanVal) ||
          (field === 'testCases' && tc.testCases.trim().toLowerCase() === cleanVal))
    );

    if (existingIndex !== -1) {
      const targetRow = existingIndex + 1;
      const dupMsg = `⚠️ Test Case entry already written at Row ${targetRow}! ("${value.slice(0, 40)}...")`;
      setDuplicateWarning(dupMsg);
      setTimeout(() => setDuplicateWarning(null), 5000);
    }
  };

  // Inline Cell Update
  const handleCellChange = (id: string, field: keyof TestCaseItem, value: any) => {
    if (typeof value === 'string') {
      checkDuplicateAndAlert(id, field, value);
    }
    const updated = testCases.map((tc) => {
      if (tc.id === id) {
        return { ...tc, [field]: value };
      }
      return tc;
    });
    updateTestCases(updated);
  };

  // 1-Click Copy Solution to Clipboard (Scenario + Steps + Inputs + Expected)
  const handleCopySolution = (tc: TestCaseItem) => {
    const solutionText = `[${tc.testCaseId}] ${tc.testScenario}\nSteps:\n${tc.testCases}\nInputs: ${tc.testInputs}\nExpected Result: ${tc.expectedResult}\nStatus: ${tc.status.toUpperCase()}`;
    navigator.clipboard.writeText(solutionText);
    setCopiedRowId(tc.id);
    setNotification(`Copied Solution for [${tc.testCaseId}] to clipboard!`);
    setTimeout(() => {
      setCopiedRowId(null);
      setNotification(null);
    }, 3000);
  };

  // Add Row
  const handleAddRow = () => {
    const nextNum = testCases.length + 1;
    const newCase: TestCaseItem = {
      id: `tc-${Date.now()}`,
      testCaseId: `TC${nextNum}`,
      testModule: matchedTicket ? matchedTicket.moduleName.toLowerCase() : 'term loan',
      featureTab: matchedTicket ? matchedTicket.featureName.toLowerCase().split(' ')[0] : 'general',
      testScenario: '',
      testCases: '',
      testInputs: '',
      expectedResult: '',
      actualResult: '',
      status: 'not run',
      screenshot1: '',
      attachments: [],
    };
    updateTestCases([...testCases, newCase]);
  };

  // Duplicate Row
  const handleDuplicateRow = (id: string) => {
    const index = testCases.findIndex((t) => t.id === id);
    if (index === -1) return;
    const item = testCases[index];
    const clone: TestCaseItem = {
      ...item,
      id: `tc-${Date.now()}`,
      testCaseId: `TC${testCases.length + 1}`,
      actualResult: '',
      status: 'not run',
    };
    const next = [...testCases];
    next.splice(index + 1, 0, clone);
    updateTestCases(next);
  };

  // Delete Row
  const handleDeleteRow = (id: string) => {
    if (testCases.length <= 1) {
      alert('At least one test case row must remain.');
      return;
    }
    updateTestCases(testCases.filter((tc) => tc.id !== id));
  };

  // Polish Single Row
  const handlePolishSingleRow = (id: string) => {
    const updated = testCases.map((tc) => {
      if (tc.id === id) {
        return polishTestCaseItem(tc);
      }
      return tc;
    });
    updateTestCases(updated);
    setNotification('Test case row auto-polished with professional QA grammar!');
    setTimeout(() => setNotification(null), 3000);
  };

  // Polish All Rows
  const handlePolishAllCases = () => {
    const updated = testCases.map((tc) => polishTestCaseItem(tc));
    updateTestCases(updated);
    setNotification(`All ${testCases.length} test cases polished! Spelling & QA phrasing refined.`);
    setTimeout(() => setNotification(null), 3500);
  };

  // Add Attachment to Row
  const handleAddAttachment = (id: string, file: { name: string; url: string; size?: string }) => {
    const updated = testCases.map((tc) => {
      if (tc.id === id) {
        const existing = tc.attachments || [];
        const newAtt: FileAttachment = {
          id: `att-tc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: file.name,
          url: file.url,
          size: file.size || '150 KB',
          uploadedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        const next = [...existing, newAtt];
        return {
          ...tc,
          attachments: next,
          screenshot1: next.length > 0 ? next[0].name : '',
        };
      }
      return tc;
    });
    updateTestCases(updated);
  };

  // Remove Attachment
  const handleRemoveAttachment = (id: string, attachmentId: string) => {
    const updated = testCases.map((tc) => {
      if (tc.id === id) {
        const remaining = (tc.attachments || []).filter((a) => a.id !== attachmentId);
        return {
          ...tc,
          attachments: remaining,
          screenshot1: remaining.length > 0 ? remaining[0].name : '',
        };
      }
      return tc;
    });
    updateTestCases(updated);
  };

  // Download Formatted Excel
  const handleDownloadExcel = async () => {
    try {
      await exportTestCasesToExcel(header, testCases);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err) {
      console.error(err);
      alert('Failed to export Excel file.');
    }
  };

  // File Upload / Screenshot Paste
  const processScreenshotFile = (file: File) => {
    setScreenshotFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setUploadedScreenshot(result);
      setDetectedFields(['Loan Account No', 'Penalty %', 'Grace Period', 'Disbursement Status']);
    };
    reader.readAsDataURL(file);
  };

  // Ctrl+V Paste anywhere on page
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            processScreenshotFile(blob);
            setIsAiDrawerOpen(true);
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  // Generate AI Cases
  const handleGenerateAiCases = (mode: 'all' | 'positive' | 'negative') => {
    setIsGenerating(true);
    setTimeout(() => {
      const tModule = matchedTicket?.moduleName.toLowerCase() || 'term loan';
      const feature = matchedTicket?.featureName.toLowerCase().split(' ')[0] || 'penalty';
      const ticketNum = matchedTicket?.ticketNumber || header.ticketNo;

      const newGeneratedCases: TestCaseItem[] = [];
      const baseIndex = testCases.length + 1;

      const initialAttachments: FileAttachment[] = uploadedScreenshot
        ? [
            {
              id: `att-ai-${Date.now()}`,
              name: screenshotFileName || 'beacon_ui_scan.png',
              url: uploadedScreenshot,
              size: '185 KB',
            },
          ]
        : [];

      if (mode === 'all' || mode === 'positive') {
        newGeneratedCases.push({
          id: `tc-${Date.now()}-pos1`,
          testCaseId: `TC${baseIndex + newGeneratedCases.length}`,
          testModule: tModule,
          featureTab: `${feature} core`,
          testScenario: polishTestScenario(`Verify ${ticketDescription.slice(0, 70)} for deal #${ticketNum}`),
          testCases: polishTestSteps(`1. Open ${tModule} module for deal #${ticketNum}.\n2. Input valid operational parameters.\n3. Execute calculation and verify schedules.`),
          testInputs: `Ticket: #${ticketNum}\nScope: ${ticketDescription.slice(0, 50)}`,
          expectedResult: polishExpectedResult('System should calculate values accurately and display updated schedules.'),
          actualResult: 'Pending execution',
          status: 'not run',
          screenshot1: initialAttachments.length > 0 ? initialAttachments[0].name : '',
          attachments: [...initialAttachments],
          isAiGenerated: true,
        });
      }

      if (mode === 'all' || mode === 'negative') {
        newGeneratedCases.push({
          id: `tc-${Date.now()}-neg1`,
          testCaseId: `TC${baseIndex + newGeneratedCases.length}`,
          testModule: tModule,
          featureTab: `${feature} guard`,
          testScenario: polishTestScenario(`[Negative] Verify execution is suppressed when deal is un-disbursed`),
          testCases: polishTestSteps(`1. Select deal #${ticketNum} where disbursement status is PENDING.\n2. Attempt calculation.\n3. Check error warning banner.`),
          testInputs: `Status: UN-DISBURSED\nTicket: #${ticketNum}`,
          expectedResult: polishExpectedResult('System should halt calculation with guard error warning.'),
          actualResult: 'Pending execution',
          status: 'not run',
          screenshot1: initialAttachments.length > 0 ? initialAttachments[0].name : '',
          attachments: [...initialAttachments],
          isAiGenerated: true,
        });
      }

      updateTestCases([...testCases, ...newGeneratedCases]);
      setIsGenerating(false);
      setNotification(`Generated ${newGeneratedCases.length} AI test cases!`);
      setTimeout(() => setNotification(null), 3000);
    }, 600);
  };

  // Sort & Filter logic
  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDirection === 'asc') setSortDirection('desc');
      else {
        setSortKey(null);
        setSortDirection(null);
      }
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setColumnFilters((prev) => ({ ...prev, [key]: value }));
  };

  const filteredTestCases = useMemo(() => {
    return testCases
      .filter((tc) => {
        if (filterModule !== 'all' && tc.testModule.toLowerCase() !== filterModule.toLowerCase()) return false;
        if (filterStatus !== 'all' && tc.status !== filterStatus) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const match =
            tc.testCaseId.toLowerCase().includes(q) ||
            tc.testModule.toLowerCase().includes(q) ||
            tc.featureTab.toLowerCase().includes(q) ||
            tc.testScenario.toLowerCase().includes(q) ||
            tc.testCases.toLowerCase().includes(q) ||
            tc.testInputs.toLowerCase().includes(q) ||
            tc.expectedResult.toLowerCase().includes(q) ||
            tc.actualResult.toLowerCase().includes(q);
          if (!match) return false;
        }

        if (columnFilters.testCaseId.trim() && !tc.testCaseId.toLowerCase().includes(columnFilters.testCaseId.toLowerCase().trim())) return false;
        if (columnFilters.testModule.trim() && !tc.testModule.toLowerCase().includes(columnFilters.testModule.toLowerCase().trim())) return false;
        if (columnFilters.featureTab.trim() && !tc.featureTab.toLowerCase().includes(columnFilters.featureTab.toLowerCase().trim())) return false;
        if (columnFilters.testScenario.trim() && !tc.testScenario.toLowerCase().includes(columnFilters.testScenario.toLowerCase().trim())) return false;
        if (columnFilters.testCases.trim() && !tc.testCases.toLowerCase().includes(columnFilters.testCases.toLowerCase().trim())) return false;
        if (columnFilters.status.trim() && tc.status.toLowerCase() !== columnFilters.status.toLowerCase().trim()) return false;

        return true;
      })
      .sort((a, b) => {
        if (!sortKey || !sortDirection) return 0;
        const valA = (a as any)[sortKey] ?? '';
        const valB = (b as any)[sortKey] ?? '';
        const comp = String(valA).localeCompare(String(valB));
        return sortDirection === 'asc' ? comp : -comp;
      });
  }, [testCases, filterModule, filterStatus, searchQuery, columnFilters, sortKey, sortDirection]);

  return (
    <div className="p-6 max-w-[1500px] mx-auto space-y-5">
      {/* Top Header & Global Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <span className="p-2 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">
            <Sparkles className="w-5 h-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                AI Test Case Hub &amp; Excel Generator
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800">
                Ticket Linked
              </span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                1-Click Solution Copy
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Edit test cases row-by-row, auto-detect duplicate rows, attach screenshots with Ctrl+V, and export exact Excel (.xlsx).
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handlePolishAllCases}
            title="Auto-correct spelling and QA grammar"
            className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Wand2 className="w-3.5 h-3.5 text-purple-600" />
            <span>Auto-Polish Grammar</span>
          </button>

          <button
            onClick={() => setIsAiDrawerOpen(!isAiDrawerOpen)}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5 text-blue-600" />
            <span>{isAiDrawerOpen ? 'Hide AI Generator' : '✨ AI Generate & SS Scanner'}</span>
          </button>

          <button
            onClick={handleAddRow}
            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Row</span>
          </button>

          {/* Attach Directly to Azure DevOps Ticket Button */}
          <button
            onClick={() => setIsAdoModalOpen(true)}
            title="Attach formatted test cases directly to the Azure DevOps Work Item"
            className="px-3.5 py-1.5 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white text-xs font-bold rounded-md flex items-center gap-2 transition-all shadow-xs cursor-pointer"
          >
            <UploadCloud className="w-3.5 h-3.5 text-blue-200" />
            <span>🚀 Attach to Azure DevOps</span>
          </button>
        </div>
      </div>

      {/* Duplicate Warning Popup Alert */}
      {duplicateWarning && (
        <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-900 flex items-center gap-2 animate-fadeIn shadow-xs">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span className="font-semibold">{duplicateWarning}</span>
        </div>
      )}

      {/* Polish / Copy Feedback Banner */}
      {notification && (
        <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-xs text-purple-900 flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Download Success Banner */}
      {downloadSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            Test cases Excel downloaded with <strong>Beacon Corporate Navy headers (#1E3A8A)</strong>, embedded screenshots, and thin borders!
          </span>
        </div>
      )}

      {/* Ticket Selection & Handover Context */}
      <div className="bg-slate-900 text-white p-4 rounded-xl border border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold text-slate-300">Match by Ticket Number:</span>
            <select
              value={selectedTicketNumber}
              onChange={(e) => handleSelectTicket(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-white text-xs font-mono font-bold rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              {tickets.map((t) => (
                <option key={t.id} value={t.ticketNumber}>
                  #{t.ticketNumber} - {t.featureName} ({t.moduleName})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700/70">
              <span className="text-slate-400">QA:</span>
              <strong className="text-white">{matchedTicket?.qaAssignee || header.taskDoneBy}</strong>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700/70">
              <span className="text-slate-400">Dev:</span>
              <strong className="text-white">{matchedTicket?.developer || 'Kunal Joshi'}</strong>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700/70">
              <span className="text-slate-400">Sign-off:</span>
              <strong className="text-white">{matchedTicket?.signOffBy || header.signOffBy}</strong>
            </div>
            <div
              onClick={() => {
                navigator.clipboard.writeText(matchedTicket?.shaCommit || header.sha);
                setNotification('Copied SHA commit hash to clipboard!');
                setTimeout(() => setNotification(null), 2500);
              }}
              title="Click to copy SHA"
              className="flex items-center gap-1.5 font-mono text-[11px] px-2.5 py-1 bg-blue-950/80 hover:bg-blue-900 text-blue-300 border border-blue-800/60 rounded-md cursor-pointer transition-colors"
            >
              <span className="text-blue-400 font-bold">SHA:</span>
              <span className="truncate max-w-[200px]">{matchedTicket?.shaCommit || header.sha}</span>
              <Copy className="w-3 h-3 text-blue-400 shrink-0" />
            </div>
          </div>
        </div>

        {/* Header Metadata Block (Rows 1-6 in Excel) */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-xs bg-slate-800/60 p-3 rounded-lg border border-slate-700/50">
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Ticket No -</label>
            <input
              type="text"
              value={header.ticketNo}
              onChange={(e) => setHeader({ ...header, ticketNo: e.target.value })}
              className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded font-mono font-bold text-blue-400"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Client Name:-</label>
            <input
              type="text"
              value={header.clientName}
              onChange={(e) => setHeader({ ...header, clientName: e.target.value })}
              className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded font-semibold text-slate-200"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Task Name:</label>
            <input
              type="text"
              value={header.taskName}
              onChange={(e) => setHeader({ ...header, taskName: e.target.value })}
              className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded font-semibold text-slate-200"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Task done by-</label>
            <input
              type="text"
              value={header.taskDoneBy}
              onChange={(e) => setHeader({ ...header, taskDoneBy: e.target.value })}
              className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded font-semibold text-slate-200"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Sign off By -</label>
            <input
              type="text"
              value={header.signOffBy}
              onChange={(e) => setHeader({ ...header, signOffBy: e.target.value })}
              className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded font-semibold text-slate-200"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">SHA :</label>
            <input
              type="text"
              value={header.sha}
              onChange={(e) => setHeader({ ...header, sha: e.target.value })}
              className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded font-mono text-[10px] text-slate-300"
            />
          </div>
        </div>
      </div>

      {/* Expandable Simple AI Generator */}
      {isAiDrawerOpen && (
        <div className="bg-white border-2 border-blue-200 rounded-xl p-4 shadow-sm space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <h2 className="text-xs font-bold text-slate-900">AI Test Case Generator (Ticket #{selectedTicketNumber})</h2>
            </div>
            <button onClick={() => setIsAiDrawerOpen(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="font-bold text-slate-700">Ticket Description / Acceptance Criteria</label>
              <textarea
                rows={2}
                value={ticketDescription}
                onChange={(e) => setTicketDescription(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs mt-1"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700">Attach Screenshot or Paste (<kbd>Ctrl+V</kbd>)</label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border border-dashed border-blue-300 rounded p-2.5 text-center cursor-pointer bg-blue-50/20 hover:bg-blue-50/50 mt-1"
              >
                <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) processScreenshotFile(f);
                }} />
                {uploadedScreenshot ? (
                  <span className="text-xs font-bold text-blue-900">{screenshotFileName} attached!</span>
                ) : (
                  <span className="text-xs text-slate-600">Click to upload or press Ctrl+V to paste image</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              disabled={isGenerating}
              onClick={() => handleGenerateAiCases('positive')}
              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs rounded cursor-pointer"
            >
              + Positive Cases
            </button>
            <button
              disabled={isGenerating}
              onClick={() => handleGenerateAiCases('negative')}
              className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-800 border border-red-300 font-bold text-xs rounded cursor-pointer"
            >
              + Negative Cases
            </button>
            <button
              disabled={isGenerating}
              onClick={() => handleGenerateAiCases('all')}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded shadow-xs cursor-pointer"
            >
              ✨ Generate All
            </button>
          </div>
        </div>
      )}

      {/* DOWNLOAD EXCEL BUTTON PLACED DIRECTLY ABOVE TABLE */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search test scenario, steps, inputs, expected result..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md font-medium text-slate-700"
          >
            <option value="all">All Statuses ({testCases.length})</option>
            <option value="pass">Pass ({testCases.filter((t) => t.status === 'pass').length})</option>
            <option value="fail">Fail ({testCases.filter((t) => t.status === 'fail').length})</option>
            <option value="blocked">Blocked ({testCases.filter((t) => t.status === 'blocked').length})</option>
            <option value="not run">Not Run ({testCases.filter((t) => t.status === 'not run').length})</option>
          </select>

          {/* Download Formatted Excel Button Placed DIRECTLY Above Table */}
          <button
            onClick={handleDownloadExcel}
            title="Download Excel with exact Beacon navy headers (#1E3A8A), thin grid borders, status color fills, and embedded screenshot images"
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-md flex items-center gap-2 transition-all shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Formatted Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* SPREADSHEET TABLE: Test Cases Grid */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto max-h-[600px]">
          <table className="w-full text-left text-xs border-collapse min-w-[1450px]">
            <thead className="bg-[#1E293B] text-slate-200 uppercase font-semibold text-[11px] tracking-wider sticky top-0 z-20 shadow-xs">
              <tr>
                <th className="p-2.5 w-12 text-center border-r border-slate-700">#</th>

                <ColumnHeader
                  title="TestCase_ID"
                  columnKey="testCaseId"
                  sortKey={sortKey}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  filterValue={columnFilters.testCaseId}
                  onFilterChange={handleFilterChange}
                  className="w-28 border-r border-slate-700"
                />

                <ColumnHeader
                  title="Test Module"
                  columnKey="testModule"
                  sortKey={sortKey}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  filterValue={columnFilters.testModule}
                  onFilterChange={handleFilterChange}
                  className="w-36 border-r border-slate-700"
                />

                <ColumnHeader
                  title="feature tab /flow report"
                  columnKey="featureTab"
                  sortKey={sortKey}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  filterValue={columnFilters.featureTab}
                  onFilterChange={handleFilterChange}
                  className="w-40 border-r border-slate-700"
                />

                <ColumnHeader
                  title="Test Scenario"
                  columnKey="testScenario"
                  sortKey={sortKey}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  filterValue={columnFilters.testScenario}
                  onFilterChange={handleFilterChange}
                  className="min-w-[260px] border-r border-slate-700"
                />

                <ColumnHeader
                  title="Test Cases (Steps)"
                  columnKey="testCases"
                  sortKey={sortKey}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  filterValue={columnFilters.testCases}
                  onFilterChange={handleFilterChange}
                  className="min-w-[260px] border-r border-slate-700"
                />

                <ColumnHeader
                  title="Test Inputs"
                  columnKey="testInputs"
                  sortKey={sortKey}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  filterValue={columnFilters.testInputs}
                  onFilterChange={handleFilterChange}
                  className="min-w-[180px] border-r border-slate-700"
                />

                <ColumnHeader
                  title="Expected Result"
                  columnKey="expectedResult"
                  sortKey={sortKey}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  filterValue={columnFilters.expectedResult}
                  onFilterChange={handleFilterChange}
                  className="min-w-[220px] border-r border-slate-700"
                />

                <ColumnHeader
                  title="Actual Result"
                  columnKey="actualResult"
                  sortKey={sortKey}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  filterValue={columnFilters.actualResult}
                  onFilterChange={handleFilterChange}
                  className="min-w-[200px] border-r border-slate-700"
                />

                <ColumnHeader
                  title="Status"
                  columnKey="status"
                  sortKey={sortKey}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  filterValue={columnFilters.status}
                  onFilterChange={handleFilterChange}
                  filterOptions={[
                    { label: 'All', value: '' },
                    { label: 'Pass', value: 'pass' },
                    { label: 'Fail', value: 'fail' },
                    { label: 'Blocked', value: 'blocked' },
                    { label: 'Not Run', value: 'not run' },
                  ]}
                  className="w-28 border-r border-slate-700"
                />

                <ColumnHeader
                  title="Screenshots & Files"
                  columnKey="screenshot1"
                  sortKey={sortKey}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  filterValue={columnFilters.screenshot1}
                  onFilterChange={handleFilterChange}
                  className="w-48 border-r border-slate-700"
                />

                <th className="p-2.5 w-24 text-center">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 font-normal text-slate-800">
              {filteredTestCases.map((tc, index) => (
                <tr key={tc.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="p-2 text-center text-slate-400 font-mono text-[11px] border-r border-slate-100 bg-slate-50/50">
                    {index + 1}
                  </td>

                  {/* 1. TestCase_ID */}
                  <td className="p-1 border-r border-slate-100">
                    <input
                      type="text"
                      value={tc.testCaseId}
                      onChange={(e) => handleCellChange(tc.id, 'testCaseId', e.target.value)}
                      className="w-full px-1.5 py-1 font-mono font-bold text-blue-700 bg-transparent hover:bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 rounded text-xs"
                    />
                  </td>

                  {/* 2. Test Module */}
                  <td className="p-1 border-r border-slate-100">
                    <input
                      type="text"
                      value={tc.testModule}
                      onChange={(e) => handleCellChange(tc.id, 'testModule', e.target.value)}
                      className="w-full px-1.5 py-1 font-medium text-slate-700 bg-transparent hover:bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 rounded text-xs"
                    />
                  </td>

                  {/* 3. Feature Tab */}
                  <td className="p-1 border-r border-slate-100">
                    <input
                      type="text"
                      value={tc.featureTab}
                      onChange={(e) => handleCellChange(tc.id, 'featureTab', e.target.value)}
                      className="w-full px-1.5 py-1 text-slate-700 bg-transparent hover:bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 rounded text-xs"
                    />
                  </td>

                  {/* 4. Test Scenario */}
                  <td className="p-1 border-r border-slate-100">
                    <textarea
                      rows={2}
                      value={tc.testScenario}
                      onChange={(e) => handleCellChange(tc.id, 'testScenario', e.target.value)}
                      onBlur={(e) => {
                        const polished = correctSpelling(e.target.value);
                        if (polished !== e.target.value) {
                          handleCellChange(tc.id, 'testScenario', polished);
                        }
                      }}
                      className="w-full px-2 py-1 text-slate-900 bg-transparent hover:bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 rounded text-xs resize-y"
                    />
                  </td>

                  {/* 5. Test Cases (Steps) */}
                  <td className="p-1 border-r border-slate-100">
                    <textarea
                      rows={2}
                      value={tc.testCases}
                      onChange={(e) => handleCellChange(tc.id, 'testCases', e.target.value)}
                      className="w-full px-2 py-1 text-slate-800 bg-transparent hover:bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 rounded text-xs resize-y"
                    />
                  </td>

                  {/* 6. Test Inputs */}
                  <td className="p-1 border-r border-slate-100">
                    <textarea
                      rows={2}
                      value={tc.testInputs}
                      onChange={(e) => handleCellChange(tc.id, 'testInputs', e.target.value)}
                      className="w-full px-2 py-1 font-mono text-[11px] text-slate-700 bg-transparent hover:bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 rounded resize-y"
                    />
                  </td>

                  {/* 7. Expected Result */}
                  <td className="p-1 border-r border-slate-100">
                    <textarea
                      rows={2}
                      value={tc.expectedResult}
                      onChange={(e) => handleCellChange(tc.id, 'expectedResult', e.target.value)}
                      className="w-full px-2 py-1 text-slate-800 bg-transparent hover:bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 rounded text-xs resize-y"
                    />
                  </td>

                  {/* 8. Actual Result */}
                  <td className="p-1 border-r border-slate-100">
                    <textarea
                      rows={2}
                      value={tc.actualResult}
                      onChange={(e) => handleCellChange(tc.id, 'actualResult', e.target.value)}
                      className="w-full px-2 py-1 text-slate-800 bg-transparent hover:bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 rounded text-xs resize-y"
                    />
                  </td>

                  {/* 9. Status */}
                  <td className="p-1.5 border-r border-slate-100 text-center">
                    <select
                      value={tc.status}
                      onChange={(e) => handleCellChange(tc.id, 'status', e.target.value)}
                      className={`w-full px-1.5 py-1 text-xs font-bold rounded border cursor-pointer focus:outline-none ${
                        tc.status === 'pass'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                          : tc.status === 'fail'
                          ? 'bg-red-50 text-red-700 border-red-300'
                          : tc.status === 'blocked'
                          ? 'bg-amber-50 text-amber-700 border-amber-300'
                          : 'bg-slate-100 text-slate-700 border-slate-300'
                      }`}
                    >
                      <option value="pass">pass</option>
                      <option value="fail">fail</option>
                      <option value="blocked">blocked</option>
                      <option value="not run">not run</option>
                    </select>
                  </td>

                  {/* 10. Screenshot & Multiple Row Attachments */}
                  <td className="p-1 border-r border-slate-100 align-middle">
                    <RowAttachmentsCell
                      id={`tc-attachments-${tc.id}`}
                      attachments={
                        tc.attachments && tc.attachments.length > 0
                          ? tc.attachments
                          : tc.screenshot1
                          ? [{ id: 'legacy-1', name: tc.screenshot1, url: '' }]
                          : []
                      }
                      onAddAttachment={(file) => handleAddAttachment(tc.id, file)}
                      onRemoveAttachment={(attId) => handleRemoveAttachment(tc.id, attId)}
                    />
                  </td>

                  {/* Actions: Copy Solution, Polish, Duplicate, Delete */}
                  <td className="p-1 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleCopySolution(tc)}
                        title="1-Click Copy Test Case Solution & Steps to Clipboard"
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded cursor-pointer"
                      >
                        {copiedRowId === tc.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <CopyCheck className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => handlePolishSingleRow(tc.id)}
                        title="Auto-polish grammar"
                        className="p-1 text-purple-600 hover:bg-purple-50 rounded cursor-pointer"
                      >
                        <Wand2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDuplicateRow(tc.id)}
                        title="Duplicate row"
                        className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteRow(tc.id)}
                        title="Delete row"
                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Bottom Toolbar */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <button
            onClick={handleAddRow}
            className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold rounded shadow-2xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-blue-600" />
            <span>+ Insert New Row at Bottom</span>
          </button>

          <div className="flex items-center gap-4 text-slate-500">
            <div>Total: <strong className="text-slate-800">{testCases.length}</strong></div>
            <div>Pass: <strong className="text-emerald-700">{testCases.filter((t) => t.status === 'pass').length}</strong></div>
            <div>Fail: <strong className="text-red-700">{testCases.filter((t) => t.status === 'fail').length}</strong></div>
            <div>Blocked: <strong className="text-amber-700">{testCases.filter((t) => t.status === 'blocked').length}</strong></div>
          </div>
        </div>
      </div>

      {/* Azure DevOps Direct Attachment Modal */}
      <AzureDevopsModal
        isOpen={isAdoModalOpen}
        onClose={() => setIsAdoModalOpen(false)}
        ticketNumber={selectedTicketNumber}
        taskName={header.taskName}
        getFileBlob={() => getTestCasesExcelBlob(header, testCases)}
        defaultComment={`QA Test Cases & Execution Matrix for "${header.taskName}" (Ticket #${selectedTicketNumber}) verified by ${header.taskDoneBy}. Total Cases: ${testCases.length}.`}
        onSuccessNotice={(msg) => {
          setAdoNotification(msg);
          setTimeout(() => setAdoNotification(null), 5000);
        }}
      />
    </div>
  );
};
