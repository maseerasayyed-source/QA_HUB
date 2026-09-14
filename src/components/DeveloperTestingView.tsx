import React, { useState, useMemo, useEffect } from 'react';
import {
  Code2,
  Download,
  Plus,
  Trash2,
  Copy,
  CheckCircle2,
  Wand2,
  Search,
  RotateCcw,
  Sparkles,
  UploadCloud,
  Send,
  Save,
  Lock,
  Eye,
  X,
  FileSpreadsheet,
} from 'lucide-react';
import {
  DeveloperTestHeaderMeta,
  DeveloperTestItem,
  TicketSummary,
  FileAttachment,
  UserProfile,
} from '../types';
import { exportDeveloperTestingToExcel, getDeveloperTestingExcelBlob } from '../utils/excelExport';
import { polishObservationText, correctSpelling } from '../utils/textPolisher';
import {
  INITIAL_DEV_TEST_HEADER,
  INITIAL_DEV_TEST_ITEMS,
} from '../data/initialData';
import { ColumnHeader, SortDirection } from './common/ColumnHeader';
import { RowAttachmentsCell } from './common/RowAttachmentsCell';
import { AzureDevopsModal } from './common/AzureDevopsModal';
import { CommonHeader } from './common/CommonHeader';
import {
  generateDevTestingFromPoint,
  generateDevTestingFromTicket,
} from '../utils/aiGenerator';
import { fetchWorkItemFromAzure } from '../utils/azureDevopsService';

interface DeveloperTestingViewProps {
  tickets?: TicketSummary[];
  currentUser?: UserProfile;
  devTestingMap?: Record<string, DeveloperTestItem[]>;
  devTestingHeadersMap?: Record<string, DeveloperTestHeaderMeta>;
  onUpdateDevTestingMap?: (
    ticketNo: string,
    items: DeveloperTestItem[],
    header?: DeveloperTestHeaderMeta
  ) => void;
}

export const DeveloperTestingView: React.FC<DeveloperTestingViewProps> = ({
  tickets = [],
  currentUser,
  devTestingMap = {},
  devTestingHeadersMap = {},
  onUpdateDevTestingMap,
}) => {
  // Selected Active Ticket
  const defaultTicketNo = INITIAL_DEV_TEST_HEADER.ticketNo;
  const [selectedTicketNo, setSelectedTicketNo] = useState<string>(defaultTicketNo);

  // Match current ticket
  const currentTicket = useMemo(() => {
    return (
      tickets.find((t) => t.ticketNumber.toLowerCase() === selectedTicketNo.toLowerCase()) ||
      tickets[0]
    );
  }, [tickets, selectedTicketNo]);

  // Header Meta State
  const [header, setHeader] = useState<DeveloperTestHeaderMeta>(() => {
    if (devTestingHeadersMap[selectedTicketNo]) {
      return devTestingHeadersMap[selectedTicketNo];
    }
    return {
      ticketNo: currentTicket?.ticketNumber || defaultTicketNo,
      featureName: currentTicket?.featureName || (INITIAL_DEV_TEST_HEADER as any).ticketName || 'Feature Verification',
      developer: currentTicket?.developer || currentUser?.name || 'Kunal Joshi',
      devTestDate: new Date().toISOString().split('T')[0],
      dealId: currentTicket?.dealId || `DEAL-${selectedTicketNo}`,
      status: 'Draft',
    };
  });

  // Developer Test Items
  const [items, setItems] = useState<DeveloperTestItem[]>(() => {
    if (devTestingMap[selectedTicketNo] && devTestingMap[selectedTicketNo].length > 0) {
      return devTestingMap[selectedTicketNo];
    }
    return INITIAL_DEV_TEST_ITEMS.map((item) => ({
      ...item,
      dealId: currentTicket?.dealId || `DEAL-${selectedTicketNo}`,
      developerName: currentTicket?.developer || currentUser?.name || 'Kunal Joshi',
      testingPoint: item.scenario || 'Verify that changing the Index Rate updates the Effective Rate.',
      expectedResult: item.expectedResult,
      submissionState: 'Draft',
    }));
  });

  // One-line input for instant AI generation
  const [singlePointInput, setSinglePointInput] = useState<string>('');
  const [isGeneratingAiPoint, setIsGeneratingAiPoint] = useState<boolean>(false);

  // UI state
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);
  const [globalSearch, setGlobalSearch] = useState<string>('');
  const [isAdoModalOpen, setIsAdoModalOpen] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [isFetchingFromAdo, setIsFetchingFromAdo] = useState<boolean>(false);

  // Image Preview Modal state
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  // Sorting & Filtering
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({
    dealId: '',
    developerName: '',
    testingPoint: '',
    expectedResult: '',
    submissionState: '',
  });

  // Sync when ticket changes
  const handleTicketChange = (tNo: string) => {
    setSelectedTicketNo(tNo);
    const found = tickets.find((t) => t.ticketNumber.toLowerCase() === tNo.toLowerCase());
    const existingHeader = devTestingHeadersMap[tNo];
    const existingItems = devTestingMap[tNo];

    if (existingHeader) {
      setHeader(existingHeader);
    } else {
      setHeader({
        ticketNo: tNo,
        featureName: found?.featureName || 'Feature Verification',
        developer: found?.developer || currentUser?.name || 'Kunal Joshi',
        devTestDate: new Date().toISOString().split('T')[0],
        dealId: found?.dealId || `DEAL-${tNo}`,
        description: found?.description || found?.featureName || '',
        testingScenarios: found?.testingScenarios || found?.scenarioDetails || '',
        status: 'Draft',
      });
    }

    if (existingItems && existingItems.length > 0) {
      setItems(existingItems);
    } else {
      setItems([
        {
          id: `dt-${Date.now()}-1`,
          scenarioId: 'DEV-01',
          dealId: found?.dealId || `DEAL-${tNo}`,
          developerName: found?.developer || currentUser?.name || 'Kunal Joshi',
          testingPoint: 'Verify that changing the Index Rate updates the Effective Rate.',
          scenario: 'Verify that changing the Index Rate updates the Effective Rate.',
          testDescription: 'Verify that changing the Index Rate updates the Effective Rate.',
          testData: 'Index Rate: 8.5%, Spread: 1.5%',
          expectedResult:
            'Effective Rate is dynamically recalculated using the new Index Rate and updated on deal schedule without rounding discrepancies.',
          actualResult: 'Verified & passed in dev workspace',
          status: 'Passed',
          submissionState: 'Draft',
          remarks: 'Pre-QA developer verification',
          attachments: [],
        },
      ]);
    }
  };

  // Sync updates back to store/parent
  const saveStateToStore = (newItems: DeveloperTestItem[], newHeader: DeveloperTestHeaderMeta) => {
    setItems(newItems);
    setHeader(newHeader);
    onUpdateDevTestingMap?.(newHeader.ticketNo, newItems, newHeader);
  };

  // 1. One-Line Input AI Generation Action
  const handleAiGenerateSinglePoint = () => {
    if (!singlePointInput.trim()) {
      setNotification('Please enter a testing point first.');
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    setIsGeneratingAiPoint(true);
    setTimeout(() => {
      const generated = generateDevTestingFromPoint(
        singlePointInput,
        header.ticketNo,
        header.dealId || `DEAL-${header.ticketNo}`,
        header.developer || currentUser?.name || 'Kunal Joshi'
      );

      const nextNum = items.length + 1;
      const newItem: DeveloperTestItem = {
        id: `dt-${Date.now()}`,
        scenarioId: `DEV-0${nextNum}`,
        dealId: generated.dealId || header.dealId || `DEAL-${header.ticketNo}`,
        developerName: generated.developerName || header.developer || currentUser?.name || 'Developer',
        testingPoint: generated.testingPoint || singlePointInput,
        scenario: generated.scenario || singlePointInput,
        testDescription: generated.testDescription || singlePointInput,
        testData: generated.testData || '',
        expectedResult: generated.expectedResult || '',
        actualResult: generated.actualResult || 'Verified in local build',
        status: 'Passed',
        submissionState: 'Draft',
        remarks: 'AI-generated testing point',
        isAiGenerated: true,
        attachments: [],
      };

      const updated = [...items, newItem];
      saveStateToStore(updated, header);
      setSinglePointInput('');
      setIsGeneratingAiPoint(false);
      setNotification('✨ AI Generated Expected Result and test details from testing point!');
      setTimeout(() => setNotification(null), 4000);
    }, 400);
  };

  // 2. Generate Developer Testing from Azure DevOps
  const handleGenerateFromAzureDevOpsTicket = async () => {
    setIsFetchingFromAdo(true);
    const res = await fetchWorkItemFromAzure({ workItemId: header.ticketNo });
    setIsFetchingFromAdo(false);

    let ticketForGen = currentTicket;
    if (res.success) {
      ticketForGen = {
        ...currentTicket,
        ticketNumber: res.ticketNumber || header.ticketNo,
        featureName: res.title || header.featureName,
        developer: res.assignee || header.developer,
        description: res.description || currentTicket?.description,
      };
    }

    const generatedItems = generateDevTestingFromTicket(ticketForGen);
    const merged = [...items, ...generatedItems];
    saveStateToStore(merged, header);

    setNotification(`🚀 Generated ${generatedItems.length} Developer Testing Points from Azure DevOps Ticket #${header.ticketNo}!`);
    setTimeout(() => setNotification(null), 4000);
  };

  // Cell Edit
  const handleCellChange = (id: string, field: keyof DeveloperTestItem, value: any) => {
    const updated = items.map((item) => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    });
    saveStateToStore(updated, header);
  };

  // Add Row
  const handleAddRow = () => {
    const nextNum = items.length + 1;
    const newItem: DeveloperTestItem = {
      id: `dt-${Date.now()}`,
      scenarioId: `DEV-0${nextNum}`,
      dealId: header.dealId || `DEAL-${header.ticketNo}`,
      developerName: header.developer || currentUser?.name || 'Kunal Joshi',
      testingPoint: '',
      scenario: '',
      testDescription: '',
      testData: '',
      expectedResult: '',
      actualResult: '',
      status: 'Passed',
      submissionState: 'Draft',
      attachments: [],
      remarks: '',
    };
    saveStateToStore([...items, newItem], header);
  };

  // Delete Row
  const handleDeleteRow = (id: string) => {
    if (items.length <= 1) {
      alert('At least one testing row must remain.');
      return;
    }
    saveStateToStore(
      items.filter((i) => i.id !== id),
      header
    );
  };

  // Attachments Handlers
  const handleAddAttachment = (id: string, file: { name: string; url: string; size?: string }) => {
    const updated = items.map((item) => {
      if (item.id === id) {
        const currentAtts = item.attachments || [];
        const newAtt: FileAttachment = {
          id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: file.name,
          url: file.url,
          size: file.size || '120 KB',
          uploadedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        const nextAtts = [...currentAtts, newAtt];
        return {
          ...item,
          attachments: nextAtts,
          screenshotName: nextAtts[0].name,
          screenshotUrl: nextAtts[0].url,
        };
      }
      return item;
    });
    saveStateToStore(updated, header);
  };

  const handleRemoveAttachment = (id: string, attachmentId: string) => {
    const updated = items.map((item) => {
      if (item.id === id) {
        const remaining = (item.attachments || []).filter((a) => a.id !== attachmentId);
        return {
          ...item,
          attachments: remaining,
          screenshotName: remaining.length > 0 ? remaining[0].name : '',
          screenshotUrl: remaining.length > 0 ? remaining[0].url : '',
        };
      }
      return item;
    });
    saveStateToStore(updated, header);
  };

  // 3. Save Draft vs Submit Developer Testing
  const handleSaveDraft = () => {
    const newHeader: DeveloperTestHeaderMeta = {
      ...header,
      status: 'Draft',
    };
    const updatedItems = items.map((item) => ({
      ...item,
      submissionState: 'Draft' as const,
    }));
    saveStateToStore(updatedItems, newHeader);
    setNotification('💾 Developer Testing saved as Draft! (Private & visible only to creator/Super Admin)');
    setTimeout(() => setNotification(null), 4000);
  };

  const handleSubmitDevTesting = () => {
    const nowStr = new Date().toLocaleString();
    const devName = currentUser?.name || header.developer || 'Kunal Joshi';
    const newHeader: DeveloperTestHeaderMeta = {
      ...header,
      status: 'Submitted',
      submittedAt: nowStr,
      submittedBy: devName,
    };
    const updatedItems = items.map((item) => ({
      ...item,
      submissionState: 'Submitted' as const,
      submittedAt: nowStr,
      submittedBy: devName,
    }));

    saveStateToStore(updatedItems, newHeader);
    setNotification(`🚀 Developer Testing submitted by ${devName} on ${nowStr}! Records now visible per permissions.`);
    setTimeout(() => setNotification(null), 5000);
  };

  // Role and Submission Privacy filter:
  // Before submission (Draft): Private to creating developer / Super Admin!
  const isCreatorOrSuperAdmin = useMemo(() => {
    if (!currentUser) return true;
    if (currentUser.role === 'Super Admin') return true;
    const currentName = currentUser.name.toLowerCase();
    const devName = (header.developer || '').toLowerCase();
    return currentName.includes('kunal') || currentName.includes('developer') || currentName === devName;
  }, [currentUser, header.developer]);

  const isVisibleToCurrentUser = header.status === 'Submitted' || isCreatorOrSuperAdmin;

  // Excel Export
  const handleDownloadExcel = async () => {
    try {
      await exportDeveloperTestingToExcel(header, items);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3500);
    } catch (err) {
      console.error(err);
      alert('Failed to export Developer Testing Excel file.');
    }
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

  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        if (globalSearch.trim()) {
          const q = globalSearch.toLowerCase();
          const match =
            (item.dealId || '').toLowerCase().includes(q) ||
            (item.developerName || '').toLowerCase().includes(q) ||
            (item.testingPoint || '').toLowerCase().includes(q) ||
            item.expectedResult.toLowerCase().includes(q) ||
            item.testData.toLowerCase().includes(q);
          if (!match) return false;
        }

        if (columnFilters.dealId.trim() && !(item.dealId || '').toLowerCase().includes(columnFilters.dealId.toLowerCase().trim())) return false;
        if (columnFilters.developerName.trim() && !(item.developerName || '').toLowerCase().includes(columnFilters.developerName.toLowerCase().trim())) return false;
        if (columnFilters.testingPoint.trim() && !(item.testingPoint || '').toLowerCase().includes(columnFilters.testingPoint.toLowerCase().trim())) return false;
        if (columnFilters.expectedResult.trim() && !item.expectedResult.toLowerCase().includes(columnFilters.expectedResult.toLowerCase().trim())) return false;

        return true;
      })
      .sort((a, b) => {
        if (!sortKey || !sortDirection) return 0;
        const valA = (a as any)[sortKey] ?? '';
        const valB = (b as any)[sortKey] ?? '';
        const comp = String(valA).localeCompare(String(valB));
        return sortDirection === 'asc' ? comp : -comp;
      });
  }, [items, globalSearch, columnFilters, sortKey, sortDirection]);

  if (!isVisibleToCurrentUser) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center space-y-3 shadow-2xs">
          <Lock className="w-8 h-8 text-amber-600 mx-auto" />
          <h2 className="text-base font-bold text-amber-900">Developer Testing Draft (Private)</h2>
          <p className="text-xs text-amber-800 max-w-md mx-auto">
            This Developer Testing record is currently in <strong>Draft state</strong> and private to the developer. It will become visible once submitted.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-5">
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <span className="p-2 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">
            <Code2 className="w-5 h-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                Developer Testing Documentation &amp; Tracking
              </h1>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                  header.status === 'Submitted'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}
              >
                {header.status === 'Submitted' ? `Submitted by ${header.submittedBy || 'Developer'}` : 'Draft (Private)'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter a simple testing point or generate directly from Azure DevOps ticket. Edit AI results, attach evidence, and submit.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleGenerateFromAzureDevOpsTicket}
            disabled={isFetchingFromAdo}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-md flex items-center gap-2 shadow-xs transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isFetchingFromAdo ? 'Fetching Ticket...' : 'Generate from Ticket'}</span>
          </button>

          <button
            onClick={handleSaveDraft}
            className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-bold rounded-md flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Save className="w-3.5 h-3.5 text-slate-600" />
            <span>Save Draft</span>
          </button>

          <button
            onClick={handleSubmitDevTesting}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-md flex items-center gap-2 shadow-xs transition-all cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Submit Developer Testing</span>
          </button>

          <button
            onClick={handleDownloadExcel}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-md flex items-center gap-2 shadow-xs transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* Feedback Toast */}
      {notification && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-center gap-2 animate-fadeIn shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Download Toast */}
      {downloadSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Developer Testing Excel file downloaded successfully!</span>
        </div>
      )}

      {/* COMMON MODULE HEADER */}
      <CommonHeader
        selectedTicketNumber={selectedTicketNo}
        tickets={tickets}
        description={header.description || currentTicket?.description || ''}
        testingScenarios={header.testingScenarios || currentTicket?.testingScenarios || ''}
        onSelectTicket={handleTicketChange}
        onChangeDescription={(val) => {
          const next = { ...header, description: val };
          setHeader(next);
          saveStateToStore(items, next);
        }}
        onChangeTestingScenarios={(val) => {
          const next = { ...header, testingScenarios: val };
          setHeader(next);
          saveStateToStore(items, next);
        }}
        showGenerateButton={false}
      />

      {/* DEVELOPER TESTING TABLE */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto max-h-[600px]">
          <table className="w-full text-left text-xs border-collapse min-w-[1300px]">
            <thead className="bg-[#1E293B] text-slate-200 uppercase font-semibold text-[11px] tracking-wider sticky top-0 z-20 shadow-2xs">
              <tr>
                <th className="p-2.5 w-12 text-center border-r border-slate-700">#</th>

                <ColumnHeader
                  title="Deal ID"
                  columnKey="dealId"
                  sortKey={sortKey}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  filterValue={columnFilters.dealId}
                  onFilterChange={handleFilterChange}
                  className="w-32 border-r border-slate-700"
                />

                <ColumnHeader
                  title="Developer Name"
                  columnKey="developerName"
                  sortKey={sortKey}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  filterValue={columnFilters.developerName}
                  onFilterChange={handleFilterChange}
                  className="w-40 border-r border-slate-700"
                />

                <ColumnHeader
                  title="Testing Point"
                  columnKey="testingPoint"
                  sortKey={sortKey}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  filterValue={columnFilters.testingPoint}
                  onFilterChange={handleFilterChange}
                  className="min-w-[280px] border-r border-slate-700"
                />

                <ColumnHeader
                  title="Expected Result"
                  columnKey="expectedResult"
                  sortKey={sortKey}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  filterValue={columnFilters.expectedResult}
                  onFilterChange={handleFilterChange}
                  className="min-w-[300px] border-r border-slate-700"
                />

                <th className="p-2.5 w-64 border-r border-slate-700 font-semibold">Evidence (Screenshots)</th>

                <th className="p-2.5 w-20 text-center font-semibold">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 text-slate-800">
              {filteredItems.map((item, index) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  {/* # */}
                  <td className="p-2 text-center text-slate-400 font-mono text-[11px] border-r border-slate-100 bg-slate-50/50">
                    {index + 1}
                  </td>

                  {/* Deal ID */}
                  <td className="p-1 border-r border-slate-100">
                    <input
                      type="text"
                      value={item.dealId || header.dealId || `DEAL-${header.ticketNo}`}
                      onChange={(e) => handleCellChange(item.id, 'dealId', e.target.value)}
                      className="w-full px-2 py-1 font-mono font-bold text-blue-700 bg-transparent hover:bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 rounded text-xs"
                    />
                  </td>

                  {/* Developer Name */}
                  <td className="p-1 border-r border-slate-100">
                    <input
                      type="text"
                      value={item.developerName || header.developer || 'Kunal Joshi'}
                      onChange={(e) => handleCellChange(item.id, 'developerName', e.target.value)}
                      className="w-full px-2 py-1 font-semibold text-slate-800 bg-transparent hover:bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 rounded text-xs"
                    />
                  </td>

                  {/* Testing Point */}
                  <td className="p-1 border-r border-slate-100">
                    <textarea
                      rows={2}
                      value={item.testingPoint || item.scenario || ''}
                      onChange={(e) => {
                        handleCellChange(item.id, 'testingPoint', e.target.value);
                        handleCellChange(item.id, 'scenario', e.target.value);
                      }}
                      placeholder="Enter simple testing point..."
                      className="w-full px-2 py-1 text-slate-900 font-medium bg-transparent hover:bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 rounded text-xs resize-y"
                    />
                  </td>

                  {/* Expected Result */}
                  <td className="p-1 border-r border-slate-100">
                    <textarea
                      rows={2}
                      value={item.expectedResult}
                      onChange={(e) => handleCellChange(item.id, 'expectedResult', e.target.value)}
                      placeholder="AI generated or manual expected result..."
                      className="w-full px-2 py-1 text-slate-800 bg-transparent hover:bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 rounded text-xs resize-y"
                    />
                  </td>

                  {/* Evidence (Multi-screenshot attach + Ctrl+V) */}
                  <td className="p-1 border-r border-slate-100">
                    <RowAttachmentsCell
                      id={`dev-att-${item.id}`}
                      attachments={item.attachments || []}
                      fallbackScreenshotName={item.screenshotName}
                      fallbackScreenshotUrl={item.screenshotUrl}
                      onAddAttachment={(file) => handleAddAttachment(item.id, file)}
                      onRemoveAttachment={(attId) => handleRemoveAttachment(item.id, attId)}
                    />
                  </td>

                  {/* Actions */}
                  <td className="p-1 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleDeleteRow(item.id)}
                        title="Delete testing row"
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
            <span>+ Add Testing Row</span>
          </button>

          <div className="flex items-center gap-4 text-slate-500 font-medium">
            <span>Total Points: <strong className="text-slate-800">{items.length}</strong></span>
            <span>State: <strong className={header.status === 'Submitted' ? 'text-emerald-700' : 'text-amber-700'}>{header.status || 'Draft'}</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
};
