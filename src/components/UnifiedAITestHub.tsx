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
  Search,
  Check,
  UploadCloud,
  CopyCheck,
  AlertTriangle,
  Send,
  Lock,
  History,
  MessageSquare,
  X,
  FileCheck2,
  RotateCcw,
} from 'lucide-react';
import {
  TestCaseHeaderMeta,
  TestCaseItem,
  TicketSummary,
  BeaconModule,
  FileAttachment,
  UserProfile,
  TestCaseReviewStatus,
  ReviewComment,
  TestCaseRevision,
} from '../types';
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
import { fetchWorkItemFromAzure } from '../utils/azureDevopsService';
import { generateTestCaseFromOneLine, aiReviewTestCases } from '../utils/aiGenerator';

interface UnifiedAITestHubProps {
  initialHeader: TestCaseHeaderMeta;
  initialTestCases: TestCaseItem[];
  tickets: TicketSummary[];
  modules: BeaconModule[];
  currentUser?: UserProfile;
  onUpdateHeader?: (header: TestCaseHeaderMeta) => void;
  onUpdateTestCases?: (testCases: TestCaseItem[]) => void;
}

export const UnifiedAITestHub: React.FC<UnifiedAITestHubProps> = ({
  initialHeader,
  initialTestCases,
  tickets,
  modules,
  currentUser,
  onUpdateHeader,
  onUpdateTestCases,
}) => {
  // Currently Matched Ticket Number
  const [selectedTicketNumber, setSelectedTicketNumber] = useState<string>(initialHeader.ticketNo || '21653');

  // Currently Matched Ticket
  const matchedTicket = useMemo(() => {
    return (
      tickets.find((t) => t.ticketNumber.toLowerCase() === selectedTicketNumber.toLowerCase()) ||
      tickets[0]
    );
  }, [tickets, selectedTicketNumber]);

  // Header Metadata
  const [header, setHeader] = useState<TestCaseHeaderMeta>(() => ({
    ...initialHeader,
    ticketNo: matchedTicket?.ticketNumber || initialHeader.ticketNo || '21653',
    taskName: matchedTicket?.featureName || initialHeader.taskName,
    taskDoneBy: matchedTicket?.qaAssignee || initialHeader.taskDoneBy || 'Maseera Sayyed',
    signOffBy: matchedTicket?.signOffBy || initialHeader.signOffBy || 'Ashwini Poke',
    reviewStatus: initialHeader.reviewStatus || 'Draft',
    version: initialHeader.version || '1.0',
    revisionsHistory: initialHeader.revisionsHistory || [],
    comments: initialHeader.comments || [],
  }));

  // Test Cases List
  const [testCases, setTestCases] = useState<TestCaseItem[]>(initialTestCases);

  // One-line input for Instant AI Test Case Generation
  const [oneLineRequirement, setOneLineRequirement] = useState<string>('');
  const [isGeneratingOneLine, setIsGeneratingOneLine] = useState<boolean>(false);

  // UI & Search State
  const [filterModule, setFilterModule] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [copiedRowId, setCopiedRowId] = useState<string | null>(null);

  // Revisioning history drawer / comments modal
  const [showHistoryDrawer, setShowHistoryDrawer] = useState<boolean>(false);

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
  const [isFetchingAdo, setIsFetchingAdo] = useState<boolean>(false);

  // Check if current user is the Assigned QA for this ticket or Super Admin
  const isAssignedQaOrSuperAdmin = useMemo(() => {
    if (!currentUser) return true;
    if (currentUser.role === 'Super Admin') return true;
    const currentName = currentUser.name.toLowerCase().trim();
    const assignedName = (header.taskDoneBy || matchedTicket?.qaAssignee || '').toLowerCase().trim();
    return currentName.includes(assignedName) || assignedName.includes(currentName) || currentUser.role === 'Senior QA';
  }, [currentUser, header.taskDoneBy, matchedTicket]);

  // Is approved and read-only check
  const isApprovedAndReadOnly = header.reviewStatus === 'Approved';

  // Is in review lock check
  const isInReviewLocked = header.reviewStatus === 'In Review';

  // Sync when selecting a ticket
  const handleSelectTicket = (tNumber: string) => {
    setSelectedTicketNumber(tNumber);
    const found = tickets.find((t) => t.ticketNumber.toLowerCase() === tNumber.toLowerCase());
    if (found) {
      const updatedHeader: TestCaseHeaderMeta = {
        ...header,
        ticketNo: found.ticketNumber,
        taskName: found.featureName,
        clientName: found.clientName || header.clientName || 'Treasury Master',
        sha: found.shaCommit || header.sha,
        taskDoneBy: found.qaAssignee || header.taskDoneBy || 'Maseera Sayyed',
        signOffBy: found.signOffBy || header.signOffBy || 'Ashwini Poke',
      };
      setHeader(updatedHeader);
      onUpdateHeader?.(updatedHeader);
    }
  };

  // Sync test cases back
  const updateTestCases = (newCases: TestCaseItem[]) => {
    if (isApprovedAndReadOnly) {
      setNotification('Test case is approved and read-only. Click "Create New Revision" to make changes.');
      setTimeout(() => setNotification(null), 4000);
      return;
    }
    if (isInReviewLocked) {
      setNotification('Test case is currently being edited/reviewed. Approval and editing are unavailable.');
      setTimeout(() => setNotification(null), 4000);
      return;
    }
    setTestCases(newCases);
    onUpdateTestCases?.(newCases);
  };

  // 1. One-Line AI Test Case Generation
  const handleGenerateOneLineTestCase = () => {
    if (!oneLineRequirement.trim()) {
      setNotification('Please enter a requirement line first.');
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    setIsGeneratingOneLine(true);
    setTimeout(() => {
      const generated = generateTestCaseFromOneLine(
        oneLineRequirement,
        matchedTicket,
        testCases.length + 1
      );

      const newCase: TestCaseItem = {
        id: `tc-${Date.now()}`,
        testCaseId: generated.testCaseId || `TC${testCases.length + 1}`,
        testModule: generated.testModule || matchedTicket?.moduleName.toLowerCase() || 'term loan',
        featureTab: generated.featureTab || 'general',
        testScenario: generated.testScenario || oneLineRequirement,
        testCases: generated.testCases || `1. Execute verification for ${oneLineRequirement}`,
        testInputs: generated.testInputs || `Requirement: ${oneLineRequirement}`,
        expectedResult: generated.expectedResult || 'Expected system outcome',
        validationScenario: generated.validationScenario || '',
        additionalCoverage: generated.additionalCoverage || '',
        actualResult: 'Pending execution',
        status: 'not run',
        reviewStatus: 'Draft',
        version: header.version || '1.0',
        attachments: [],
        isAiGenerated: true,
      };

      const nextCases = [...testCases, newCase];
      updateTestCases(nextCases);
      setOneLineRequirement('');
      setIsGeneratingOneLine(false);
      setNotification('✨ AI Generated complete Test Case from your one-line input!');
      setTimeout(() => setNotification(null), 4000);
    }, 400);
  };

  // 2. Submit for Review
  const handleSubmitForReview = () => {
    if (testCases.length === 0) {
      alert('Please add at least one test case before submitting for review.');
      return;
    }

    const newHeader: TestCaseHeaderMeta = {
      ...header,
      reviewStatus: 'Review Pending',
    };
    setHeader(newHeader);
    onUpdateHeader?.(newHeader);

    // Update test cases status
    const updated = testCases.map((tc) => ({
      ...tc,
      reviewStatus: 'Review Pending' as TestCaseReviewStatus,
    }));
    setTestCases(updated);
    onUpdateTestCases?.(updated);

    setNotification('🚀 Test Cases submitted for Senior QA Review! Status set to "Review Pending".');
    setTimeout(() => setNotification(null), 5000);
  };

  // 3. Post-Approval Revisioning: "Create New Revision"
  const handleCreateNewRevision = () => {
    const currentVer = parseFloat(header.version || '1.0');
    const newVer = (currentVer + 0.1).toFixed(1);

    // Save current approved version into history
    const oldRevision: TestCaseRevision = {
      id: `rev-${Date.now()}`,
      version: header.version || '1.0',
      status: 'Approved',
      testCases: JSON.parse(JSON.stringify(testCases)),
      approvedBy: header.approvedBy,
      approvedAt: header.approvedAt,
      approvedVersion: header.approvedVersion,
      comments: header.comments || [],
      createdAt: new Date().toISOString(),
    };

    const nextHistory = [oldRevision, ...(header.revisionsHistory || [])];

    const newHeader: TestCaseHeaderMeta = {
      ...header,
      version: newVer,
      reviewStatus: 'Draft',
      approvedBy: undefined,
      approvedAt: undefined,
      approvedVersion: undefined,
      revisionsHistory: nextHistory,
    };

    const nextCases = testCases.map((tc) => ({
      ...tc,
      version: newVer,
      reviewStatus: 'Draft' as TestCaseReviewStatus,
    }));

    setHeader(newHeader);
    setTestCases(nextCases);
    onUpdateHeader?.(newHeader);
    onUpdateTestCases?.(nextCases);

    setNotification(`✨ New Revision Version ${newVer} created in Draft state! Previous version preserved in history.`);
    setTimeout(() => setNotification(null), 5000);
  };

  // Fetch ticket from Azure
  const handleFetchTicketFromAzure = async () => {
    setIsFetchingAdo(true);
    const res = await fetchWorkItemFromAzure({ workItemId: selectedTicketNumber });
    setIsFetchingAdo(false);

    if (res.success) {
      const newHeader: TestCaseHeaderMeta = {
        ...header,
        ticketNo: res.ticketNumber || selectedTicketNumber,
        taskName: res.title || header.taskName,
        taskDoneBy: res.assignee || header.taskDoneBy,
      };
      setHeader(newHeader);
      onUpdateHeader?.(newHeader);
      setNotification(`Fetched from Azure: "${res.title}"`);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  // Add/Delete Row
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
      reviewStatus: header.reviewStatus || 'Draft',
      version: header.version || '1.0',
      attachments: [],
    };
    updateTestCases([...testCases, newCase]);
  };

  const handleDeleteRow = (id: string) => {
    if (testCases.length <= 1) {
      alert('At least one test case row must remain.');
      return;
    }
    updateTestCases(testCases.filter((tc) => tc.id !== id));
  };

  // Cell Change
  const handleCellChange = (id: string, field: keyof TestCaseItem, value: any) => {
    const updated = testCases.map((tc) => {
      if (tc.id === id) {
        return { ...tc, [field]: value };
      }
      return tc;
    });
    updateTestCases(updated);
  };

  // Excel Export
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

  // Sort & Filter
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
        if (filterStatus !== 'all' && tc.status !== filterStatus) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const match =
            tc.testCaseId.toLowerCase().includes(q) ||
            tc.testScenario.toLowerCase().includes(q) ||
            tc.testCases.toLowerCase().includes(q) ||
            tc.testInputs.toLowerCase().includes(q) ||
            tc.expectedResult.toLowerCase().includes(q);
          if (!match) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (!sortKey || !sortDirection) return 0;
        const valA = (a as any)[sortKey] ?? '';
        const valB = (b as any)[sortKey] ?? '';
        const comp = String(valA).localeCompare(String(valB));
        return sortDirection === 'asc' ? comp : -comp;
      });
  }, [testCases, filterStatus, searchQuery, sortKey, sortDirection]);

  return (
    <div className="p-6 max-w-[1500px] mx-auto space-y-5">
      {/* Top Banner & Status Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <span className="p-2 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">
            <Sparkles className="w-5 h-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                AI Test Case Hub (Ticket #{selectedTicketNumber})
              </h1>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                  header.reviewStatus === 'Approved'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : header.reviewStatus === 'Review Pending'
                    ? 'bg-blue-100 text-blue-800 border border-blue-300'
                    : header.reviewStatus === 'Changes Required'
                    ? 'bg-red-100 text-red-800 border border-red-300'
                    : 'bg-slate-100 text-slate-800 border border-slate-300'
                }`}
              >
                Status: {header.reviewStatus || 'Draft'} (v{header.version || '1.0'})
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Assigned QA: <strong>{header.taskDoneBy}</strong> • Senior QA: <strong>{header.signOffBy}</strong>
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {isApprovedAndReadOnly ? (
            <button
              onClick={handleCreateNewRevision}
              className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-md flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Create New Revision</span>
            </button>
          ) : (
            <button
              onClick={handleSubmitForReview}
              disabled={isInReviewLocked}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-md flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit for Review</span>
            </button>
          )}

          <button
            onClick={() => setShowHistoryDrawer(true)}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-bold rounded-md flex items-center gap-1.5 cursor-pointer"
          >
            <History className="w-3.5 h-3.5 text-slate-600" />
            <span>Version History ({header.revisionsHistory?.length || 0})</span>
          </button>

          <button
            onClick={handleDownloadExcel}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-md flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* Approval Banner if Approved */}
      {isApprovedAndReadOnly && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between text-xs text-emerald-950 animate-fadeIn">
          <div className="flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p className="font-bold text-sm">Test Case Approved</p>
              <p className="text-emerald-800 mt-0.5">
                Approved By: <strong>{header.approvedBy || 'Ashwini Poke'}</strong> • Approval Date: <strong>{header.approvedAt || new Date().toLocaleDateString()}</strong> • Approved Version: <strong>v{header.approvedVersion || header.version}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={handleCreateNewRevision}
            className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded cursor-pointer"
          >
            + Create New Revision (v{(parseFloat(header.version || '1.0') + 0.1).toFixed(1)})
          </button>
        </div>
      )}

      {/* Senior QA Comments / Changes Required Notice */}
      {header.reviewStatus === 'Changes Required' && (
        <div className="p-4 bg-red-50 border border-red-300 rounded-xl space-y-2 text-xs text-red-950 animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <h3 className="font-bold text-red-900">Senior QA Feedback – Changes Required</h3>
          </div>
          {header.comments && header.comments.length > 0 ? (
            <div className="space-y-1.5 pl-6">
              {header.comments.map((c) => (
                <div key={c.id} className="p-2 bg-white rounded border border-red-200">
                  <div className="font-bold text-red-900">{c.author} ({c.createdAt}):</div>
                  <div className="text-slate-800 mt-0.5">{c.text}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-red-800 pl-6">Senior QA requested revisions. Please edit the test cases and click <strong>Resubmit for Review</strong>.</p>
          )}
        </div>
      )}

      {/* Toast Notification */}
      {notification && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-center gap-2 animate-fadeIn shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* ONE-LINE AI TEST CASE GENERATION CARD */}
      {!isApprovedAndReadOnly && (
        <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-slate-50 border border-blue-200 rounded-xl p-4 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <h2 className="text-xs font-bold text-slate-900">One-Line AI Test Case Generator</h2>
            </div>
            <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
              Instant Generation
            </span>
          </div>

          <p className="text-xs text-slate-600">
            Provide one simple requirement/scenario (e.g. <em>"Verify that invalid GSTIN details are restricted during Fees upload."</em>):
          </p>

          <div className="flex gap-2">
            <input
              type="text"
              value={oneLineRequirement}
              onChange={(e) => setOneLineRequirement(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleGenerateOneLineTestCase();
              }}
              placeholder="e.g. Verify that invalid GSTIN details are restricted during Fees upload."
              className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
            />

            <button
              onClick={handleGenerateOneLineTestCase}
              disabled={isGeneratingOneLine || isInReviewLocked}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isGeneratingOneLine ? 'Generating...' : 'AI Generate Test Case'}</span>
            </button>
          </div>
        </div>
      )}

      {/* SPREADSHEET TABLE: QA Test Cases */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto max-h-[580px]">
          <table className="w-full text-left text-xs border-collapse min-w-[1400px]">
            <thead className="bg-[#1E293B] text-slate-200 uppercase font-semibold text-[11px] tracking-wider sticky top-0 z-20 shadow-2xs">
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
                  title="Expected Result"
                  columnKey="expectedResult"
                  sortKey={sortKey}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  filterValue={columnFilters.expectedResult}
                  onFilterChange={handleFilterChange}
                  className="min-w-[220px] border-r border-slate-700"
                />

                <th className="p-2.5 min-w-[180px] border-r border-slate-700 font-semibold">Validation / Negative Scenario</th>

                <th className="p-2.5 w-28 border-r border-slate-700 text-center font-semibold">Status</th>

                <th className="p-2.5 w-48 border-r border-slate-700 font-semibold">Evidence</th>

                <th className="p-2.5 w-20 text-center font-semibold">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 text-slate-800">
              {filteredTestCases.map((tc, index) => (
                <tr key={tc.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="p-2 text-center text-slate-400 font-mono text-[11px] border-r border-slate-100 bg-slate-50/50">
                    {index + 1}
                  </td>

                  {/* TestCase_ID */}
                  <td className="p-1 border-r border-slate-100 font-mono font-bold text-blue-700">
                    <input
                      type="text"
                      disabled={isApprovedAndReadOnly || !isAssignedQaOrSuperAdmin}
                      value={tc.testCaseId}
                      onChange={(e) => handleCellChange(tc.id, 'testCaseId', e.target.value)}
                      className="w-full px-1.5 py-1 bg-transparent focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 rounded text-xs"
                    />
                  </td>

                  {/* Test Scenario */}
                  <td className="p-1 border-r border-slate-100">
                    <textarea
                      rows={2}
                      disabled={isApprovedAndReadOnly || !isAssignedQaOrSuperAdmin}
                      value={tc.testScenario}
                      onChange={(e) => handleCellChange(tc.id, 'testScenario', e.target.value)}
                      className="w-full px-2 py-1 text-slate-900 bg-transparent focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 rounded text-xs resize-y"
                    />
                  </td>

                  {/* Test Cases (Steps) */}
                  <td className="p-1 border-r border-slate-100">
                    <textarea
                      rows={2}
                      disabled={isApprovedAndReadOnly || !isAssignedQaOrSuperAdmin}
                      value={tc.testCases}
                      onChange={(e) => handleCellChange(tc.id, 'testCases', e.target.value)}
                      className="w-full px-2 py-1 text-slate-800 bg-transparent focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 rounded text-xs resize-y"
                    />
                  </td>

                  {/* Expected Result */}
                  <td className="p-1 border-r border-slate-100">
                    <textarea
                      rows={2}
                      disabled={isApprovedAndReadOnly || !isAssignedQaOrSuperAdmin}
                      value={tc.expectedResult}
                      onChange={(e) => handleCellChange(tc.id, 'expectedResult', e.target.value)}
                      className="w-full px-2 py-1 text-slate-800 bg-transparent focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 rounded text-xs resize-y"
                    />
                  </td>

                  {/* Validation / Negative Scenario */}
                  <td className="p-1 border-r border-slate-100">
                    <textarea
                      rows={2}
                      disabled={isApprovedAndReadOnly || !isAssignedQaOrSuperAdmin}
                      value={tc.validationScenario || ''}
                      onChange={(e) => handleCellChange(tc.id, 'validationScenario', e.target.value)}
                      placeholder="Negative / boundary scenario..."
                      className="w-full px-2 py-1 text-slate-700 italic bg-transparent focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 rounded text-xs resize-y"
                    />
                  </td>

                  {/* Status */}
                  <td className="p-1.5 border-r border-slate-100 text-center">
                    <select
                      disabled={isApprovedAndReadOnly || !isAssignedQaOrSuperAdmin}
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

                  {/* Evidence */}
                  <td className="p-1 border-r border-slate-100">
                    <RowAttachmentsCell
                      id={`tc-att-${tc.id}`}
                      attachments={tc.attachments || []}
                      onAddAttachment={(f) => {
                        const currentAtts = tc.attachments || [];
                        const nextAtts = [
                          ...currentAtts,
                          { id: `att-${Date.now()}`, name: f.name, url: f.url },
                        ];
                        handleCellChange(tc.id, 'attachments', nextAtts);
                      }}
                      onRemoveAttachment={(attId) => {
                        const remaining = (tc.attachments || []).filter((a) => a.id !== attId);
                        handleCellChange(tc.id, 'attachments', remaining);
                      }}
                    />
                  </td>

                  {/* Actions */}
                  <td className="p-1 text-center">
                    {!isApprovedAndReadOnly && isAssignedQaOrSuperAdmin && (
                      <button
                        onClick={() => handleDeleteRow(tc.id)}
                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Bottom Bar */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          {!isApprovedAndReadOnly && isAssignedQaOrSuperAdmin && (
            <button
              onClick={handleAddRow}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold rounded shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-blue-600" />
              <span>+ Insert Test Case Row</span>
            </button>
          )}

          <div className="flex items-center gap-4 text-slate-500 font-medium">
            <span>Total: <strong className="text-slate-800">{testCases.length}</strong></span>
            <span>Version: <strong className="text-blue-700">v{header.version || '1.0'}</strong></span>
          </div>
        </div>
      </div>

      {/* Version History Modal */}
      {showHistoryDrawer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden space-y-4 p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-blue-600" />
                <h2 className="text-base font-bold text-slate-900">Revision History (Ticket #{selectedTicketNumber})</h2>
              </div>
              <button onClick={() => setShowHistoryDrawer(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs max-h-[350px] overflow-y-auto">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex justify-between items-center font-bold text-blue-900">
                  <span>Current Version: v{header.version}</span>
                  <span className="px-2 py-0.5 bg-blue-200 text-blue-900 rounded">{header.reviewStatus}</span>
                </div>
                <div className="text-slate-600 mt-1">
                  Active working set with {testCases.length} test cases.
                </div>
              </div>

              {header.revisionsHistory && header.revisionsHistory.length > 0 ? (
                header.revisionsHistory.map((rev) => (
                  <div key={rev.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                    <div className="flex justify-between items-center font-bold text-slate-800">
                      <span>Version v{rev.version}</span>
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold">
                        {rev.status}
                      </span>
                    </div>
                    <div className="text-slate-500 text-[11px]">
                      Approved By: {rev.approvedBy || 'Ashwini Poke'} • Date: {rev.createdAt} • Cases: {rev.testCases?.length || 0}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-slate-400">No previous revisions recorded.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
