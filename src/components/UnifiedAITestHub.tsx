import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Sparkles,
  FileSpreadsheet,
  Download,
  Plus,
  Trash2,
  Copy,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Clock,
  Wand2,
  Upload,
  Camera,
  Layers,
  Code2,
  FileText,
  Search,
  Check,
  RotateCcw,
  Maximize2,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Eye,
  Target,
  ShieldAlert,
  Tag,
  X,
  CopyCheck,
  UploadCloud,
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
  // State for Header Metadata
  const [header, setHeader] = useState<TestCaseHeaderMeta>(initialHeader);

  // State for Test Cases List (all editable row-wise inline)
  const [testCases, setTestCases] = useState<TestCaseItem[]>(initialTestCases);

  // Selected Ticket for QA-Developer matching
  const [selectedTicketNumber, setSelectedTicketNumber] = useState<string>(initialHeader.ticketNo || '21653');

  // UI state
  const [filterModule, setFilterModule] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);
  const [polishNotification, setPolishNotification] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [testTypeFilter, setTestTypeFilter] = useState<'all' | 'positive' | 'negative'>('all');

  // Column Sort & Filter state
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
    attachments: '',
    screenshot1: '',
  });

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
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

  const handleResetFilters = () => {
    setColumnFilters({
      testCaseId: '',
      testModule: '',
      featureTab: '',
      testScenario: '',
      testCases: '',
      testInputs: '',
      expectedResult: '',
      actualResult: '',
      status: '',
      attachments: '',
      screenshot1: '',
    });
    setSearchQuery('');
    setFilterModule('all');
    setFilterStatus('all');
    setSortKey(null);
    setSortDirection(null);
  };

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    filterModule !== 'all' ||
    filterStatus !== 'all' ||
    Boolean(sortKey) ||
    Object.values(columnFilters).some((v) => typeof v === 'string' && v.trim() !== '');

  // Screenshot scanner state
  const [uploadedScreenshot, setUploadedScreenshot] = useState<string | null>(null);
  const [screenshotFileName, setScreenshotFileName] = useState<string>('');
  const [isScanningFields, setIsScanningFields] = useState<boolean>(false);
  const [detectedFields, setDetectedFields] = useState<string[]>([]);
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState<boolean>(false);
  const [isAdoModalOpen, setIsAdoModalOpen] = useState<boolean>(false);
  const [adoNotification, setAdoNotification] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Find currently matched ticket
  const matchedTicket = tickets.find(
    (t) => t.ticketNumber.toLowerCase() === selectedTicketNumber.toLowerCase()
  ) || tickets[0];

  // Ticket Context states for AI Generation (editable by QA)
  const [ticketDescription, setTicketDescription] = useState<string>(
    matchedTicket?.description ||
      matchedTicket?.qaRequirementDoc ||
      'Automate overdue penalty interest and principal calculation for Term Loans after loan disbursement.'
  );
  const [ticketScenarios, setTicketScenarios] = useState<string>(
    matchedTicket?.scenarioDetails ||
      'Scenario 1: Overdue past grace period (5 days) triggers daily penalty accrual.\nScenario 2: Pre-disbursement deals must suppress all penalty rows.\nScenario 3: Excel export must preserve formatted figures without number truncation.'
  );
  const [impactPoints, setImpactPoints] = useState<string[]>(
    matchedTicket?.impactPoints || [
      'Cashflow Engine & Amortization Schedule',
      'General Ledger (GL) Daily Interest Accrual',
      'Overdue Report Grid & Filter Sorting',
      'Excel Export (.xlsx) Leading Zero Preservation',
      'Pre-Disbursement Validation Guard',
    ]
  );
  const [newImpactPoint, setNewImpactPoint] = useState<string>('');

  // Auto-sync matched ticket to Header and AI generation states when user changes selected ticket
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
        signOffBy: found.signOffBy || header.signOffBy || 'Ashwini poke',
      };
      setHeader(updatedHeader);
      onUpdateHeader?.(updatedHeader);
      if (found.description) {
        setTicketDescription(found.description);
      } else if (found.qaRequirementDoc) {
        setTicketDescription(found.qaRequirementDoc);
      }
      if (found.scenarioDetails) {
        setTicketScenarios(found.scenarioDetails);
      }
      if (found.impactPoints && found.impactPoints.length > 0) {
        setImpactPoints(found.impactPoints);
      }
      if (found.detectedFormFields) {
        setDetectedFields(found.detectedFormFields);
      }
    }
  };

  // Add a new Impact Testing point
  const handleAddImpactPoint = () => {
    if (!newImpactPoint.trim()) return;
    if (!impactPoints.includes(newImpactPoint.trim())) {
      setImpactPoints([...impactPoints, newImpactPoint.trim()]);
    }
    setNewImpactPoint('');
  };

  // Remove an Impact Testing point
  const handleRemoveImpactPoint = (indexToRemove: number) => {
    setImpactPoints(impactPoints.filter((_, idx) => idx !== indexToRemove));
  };

  // Add row attachment (multiple screenshots / logs)
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
        const nextAttachments = [...existing, newAtt];
        return {
          ...tc,
          attachments: nextAttachments,
          screenshot1: nextAttachments.length > 0 ? nextAttachments[0].name : '',
        };
      }
      return tc;
    });
    updateTestCases(updated);
  };

  // Remove row attachment
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

  // Sync test cases back to parent state
  const updateTestCases = (newCases: TestCaseItem[]) => {
    setTestCases(newCases);
    onUpdateTestCases?.(newCases);
  };

  // Inline Cell Update Handler (Excel-style)
  const handleCellChange = (id: string, field: keyof TestCaseItem, value: any) => {
    const updated = testCases.map((tc) => {
      if (tc.id === id) {
        return { ...tc, [field]: value };
      }
      return tc;
    });
    updateTestCases(updated);
  };

  // Add a new row directly at bottom of table
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

  // Duplicate a row
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

  // Delete a row
  const handleDeleteRow = (id: string) => {
    if (testCases.length <= 1) {
      alert("At least one test case row must remain in the sheet.");
      return;
    }
    const filtered = testCases.filter((tc) => tc.id !== id);
    updateTestCases(filtered);
  };

  // Polish a single test case row (Grammar, Spelling, Standard QA phrasing)
  const handlePolishSingleRow = (id: string) => {
    const updated = testCases.map((tc) => {
      if (tc.id === id) {
        return polishTestCaseItem(tc);
      }
      return tc;
    });
    updateTestCases(updated);
    showPolishFeedback(`Test Case row auto-polished with professional QA grammar!`);
  };

  // Auto-Polish All Test Cases in Sheet
  const handlePolishAllCases = () => {
    const updated = testCases.map((tc) => polishTestCaseItem(tc));
    updateTestCases(updated);
    showPolishFeedback(`All ${testCases.length} test cases polished! Spelling & QA sentence structures refined.`);
  };

  const showPolishFeedback = (msg: string) => {
    setPolishNotification(msg);
    setTimeout(() => setPolishNotification(null), 4000);
  };

  // Handle Excel Download with rich styling (colors, borders, status pills, links)
  const handleDownloadExcel = async () => {
    try {
      await exportTestCasesToExcel(header, testCases);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err) {
      console.error('Failed to export styled Excel', err);
      alert('Failed to export Excel file. Please try again.');
    }
  };

  // Handle Screenshot file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processScreenshotFile(file);
  };

  const processScreenshotFile = (file: File) => {
    setScreenshotFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setUploadedScreenshot(result);
      scanFieldsFromImage(file.name);
    };
    reader.readAsDataURL(file);
  };

  // Handle Paste (Ctrl+V) anywhere on screen
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

  // Simulate field detection from uploaded screenshot
  const scanFieldsFromImage = (name: string) => {
    setIsScanningFields(true);
    setTimeout(() => {
      const simulatedFields = [
        'Loan Account No (Dropdown / Search)',
        'Penalty Interest % (Numeric 0-100)',
        'Penalty Principal % (Numeric 0-100)',
        'Grace Period Days (Integer input)',
        'Overdue As-Of Date (Date picker)',
        'Disbursement Status (Read-only Badge)',
        'Include Penalties in Cashflow (Checkbox)',
        'Export Excel Button',
      ];
      setDetectedFields(simulatedFields);
      setIsScanningFields(false);
    }, 900);
  };

  // Generate AI Test Cases based on matched ticket, description, scenarios, impact points & detected fields
  const handleGenerateAiCases = (mode: 'all' | 'positive' | 'negative' | 'impact') => {
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
              id: `att-ai-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              name: screenshotFileName || 'beacon_ui_scan.png',
              url: uploadedScreenshot,
              size: '185 KB',
              uploadedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
          ]
        : [];

      // 1. Positive Test Cases
      if (mode === 'all' || mode === 'positive') {
        const scenarioLine = ticketScenarios.split('\n')[0] || 'Valid overdue calculation past grace period';
        newGeneratedCases.push({
          id: `tc-${Date.now()}-pos1`,
          testCaseId: `TC${baseIndex + newGeneratedCases.length}`,
          testModule: tModule,
          featureTab: `${feature} core calculation`,
          testScenario: polishTestScenario(
            `Verify ${ticketDescription.slice(0, 75)} executes successfully for loan ${ticketNum}`
          ),
          testCases: polishTestSteps(
            `1. Open ${tModule} module and navigate to deal #${ticketNum}.\n2. Input scenario details: ${scenarioLine}.\n3. Verify form fields: ${detectedFields.slice(0, 3).join(', ') || 'Standard parameters'}.\n4. Click Calculate / Save Report.`
          ),
          testInputs: `Ticket: #${ticketNum}\nScope: ${ticketDescription.slice(0, 60)}\nFields: ${detectedFields.slice(0, 2).join(', ') || 'Standard inputs'}`,
          expectedResult: polishExpectedResult(
            `The system should calculate values accurately as specified in ticket description and display updated schedule records.`
          ),
          actualResult: `Pending execution`,
          status: 'not run',
          screenshot1: initialAttachments.length > 0 ? initialAttachments[0].name : '',
          attachments: [...initialAttachments],
          isAiGenerated: true,
        });

        newGeneratedCases.push({
          id: `tc-${Date.now()}-pos2`,
          testCaseId: `TC${baseIndex + newGeneratedCases.length}`,
          testModule: tModule,
          featureTab: `${feature} export verification`,
          testScenario: polishTestScenario(
            `Verify Excel download (.xlsx) preserves exact values and headers for ${ticketNum}`
          ),
          testCases: polishTestSteps(
            `1. Open ${feature} report for loan ${ticketNum}.\n2. Apply current financial year filter.\n3. Click 'Export to Excel'.\n4. Inspect exported workbook formatting.`
          ),
          testInputs: `Format: .xlsx\nScope: ${scenarioLine}\nTicket: #${ticketNum}`,
          expectedResult: polishExpectedResult(
            `Excel file should download successfully with complete column headers and preserved numeric precision.`
          ),
          actualResult: `Pending execution`,
          status: 'not run',
          screenshot1: initialAttachments.length > 0 ? initialAttachments[0].name : '',
          attachments: [...initialAttachments],
          isAiGenerated: true,
        });
      }

      // 2. Negative Test Cases
      if (mode === 'all' || mode === 'negative') {
        newGeneratedCases.push({
          id: `tc-${Date.now()}-neg1`,
          testCaseId: `TC${baseIndex + newGeneratedCases.length}`,
          testModule: tModule,
          featureTab: `${feature} boundary validation`,
          testScenario: polishTestScenario(
            `[Negative] Verify system prevents negative percentages (-5%) and invalid boundary inputs`
          ),
          testCases: polishTestSteps(
            `1. Open ${feature} configuration modal for loan ${ticketNum}.\n2. In rate field, enter invalid negative value '-5%'.\n3. Leave mandatory fields blank and click Save.`
          ),
          testInputs: `Rate: -5%\nMandatory fields: [Empty]\nTicket: #${ticketNum}`,
          expectedResult: polishExpectedResult(
            `System should display explicit validation error banners and prevent invalid persistence.`
          ),
          actualResult: `Pending execution`,
          status: 'not run',
          screenshot1: initialAttachments.length > 0 ? initialAttachments[0].name : '',
          attachments: [...initialAttachments],
          isAiGenerated: true,
        });

        newGeneratedCases.push({
          id: `tc-${Date.now()}-neg2`,
          testCaseId: `TC${baseIndex + newGeneratedCases.length}`,
          testModule: tModule,
          featureTab: `${feature} state guard`,
          testScenario: polishTestScenario(
            `[Negative] Verify execution is suppressed when loan status is UN-DISBURSED or deal is in draft`
          ),
          testCases: polishTestSteps(
            `1. Select loan deal ${ticketNum} where disbursement_status is 'PENDING / UN-DISBURSED'.\n2. Attempt to trigger ${feature} calculation.\n3. Verify cashflow and report grid.`
          ),
          testInputs: `Disbursement Status: UN-DISBURSED\nTicket: #${ticketNum}`,
          expectedResult: polishExpectedResult(
            `System should halt calculation with guard warning: 'Loan deal must be disbursed before processing'.`
          ),
          actualResult: `Pending execution`,
          status: 'not run',
          screenshot1: initialAttachments.length > 0 ? initialAttachments[0].name : '',
          attachments: [...initialAttachments],
          isAiGenerated: true,
        });
      }

      // 3. Impact Testing Cases (derived from impactPoints)
      if (mode === 'all' || mode === 'impact') {
        const selectedImpacts = impactPoints.length > 0 ? impactPoints.slice(0, 3) : ['Cashflow Engine', 'General Ledger (GL)'];
        selectedImpacts.forEach((impactItem, i) => {
          newGeneratedCases.push({
            id: `tc-${Date.now()}-imp${i + 1}`,
            testCaseId: `TC${baseIndex + newGeneratedCases.length}`,
            testModule: tModule,
            featureTab: `impact: ${impactItem.toLowerCase().slice(0, 24)}`,
            testScenario: polishTestScenario(
              `[Impact Testing] Verify ${impactItem} integrity when ${feature} logic executes for ${ticketNum}`
            ),
            testCases: polishTestSteps(
              `1. Execute ${feature} for loan deal #${ticketNum}.\n2. Open downstream subsystem: ${impactItem}.\n3. Verify historical ledger postings and balance integrity.\n4. Check that existing paid schedules remain untampered.`
            ),
            testInputs: `Impact Area: ${impactItem}\nScope: Full Amortization Lifecycle\nTicket: #${ticketNum}`,
            expectedResult: polishExpectedResult(
              `Downstream ${impactItem} must operate cleanly without regressions, unbalanced debit/credit postings, or schedule corruption.`
            ),
            actualResult: `Pending execution`,
            status: 'not run',
            screenshot1: initialAttachments.length > 0 ? initialAttachments[0].name : '',
            attachments: [...initialAttachments],
            isAiGenerated: true,
          });
        });
      }

      updateTestCases([...testCases, ...newGeneratedCases]);
      setIsGenerating(false);
      showPolishFeedback(
        `Generated ${newGeneratedCases.length} AI test cases (${mode.toUpperCase()} mode: Description + Scenarios + Impact Points) and appended to table!`
      );
    }, 700);
  };

  // Filtered and sorted rows for the view
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
            tc.actualResult.toLowerCase().includes(q) ||
            tc.status.toLowerCase().includes(q);
          if (!match) return false;
        }

        // Per-column filters
        if (columnFilters.testCaseId.trim()) {
          if (!tc.testCaseId.toLowerCase().includes(columnFilters.testCaseId.toLowerCase().trim())) {
            return false;
          }
        }
        if (columnFilters.testModule.trim()) {
          if (!tc.testModule.toLowerCase().includes(columnFilters.testModule.toLowerCase().trim())) {
            return false;
          }
        }
        if (columnFilters.featureTab.trim()) {
          if (!tc.featureTab.toLowerCase().includes(columnFilters.featureTab.toLowerCase().trim())) {
            return false;
          }
        }
        if (columnFilters.testScenario.trim()) {
          if (!tc.testScenario.toLowerCase().includes(columnFilters.testScenario.toLowerCase().trim())) {
            return false;
          }
        }
        if (columnFilters.testCases.trim()) {
          if (!tc.testCases.toLowerCase().includes(columnFilters.testCases.toLowerCase().trim())) {
            return false;
          }
        }
        if (columnFilters.testInputs.trim()) {
          if (!tc.testInputs.toLowerCase().includes(columnFilters.testInputs.toLowerCase().trim())) {
            return false;
          }
        }
        if (columnFilters.expectedResult.trim()) {
          if (!tc.expectedResult.toLowerCase().includes(columnFilters.expectedResult.toLowerCase().trim())) {
            return false;
          }
        }
        if (columnFilters.actualResult.trim()) {
          if (!tc.actualResult.toLowerCase().includes(columnFilters.actualResult.toLowerCase().trim())) {
            return false;
          }
        }
        if (columnFilters.status.trim()) {
          if (tc.status.toLowerCase() !== columnFilters.status.toLowerCase().trim()) {
            return false;
          }
        }
        if (columnFilters.attachments && columnFilters.attachments.trim()) {
          const q = columnFilters.attachments.toLowerCase().trim();
          const matchAtt =
            (tc.attachments && tc.attachments.some((a) => a.name.toLowerCase().includes(q))) ||
            (tc.screenshot1 && tc.screenshot1.toLowerCase().includes(q));
          if (!matchAtt) return false;
        }
        if (columnFilters.screenshot1.trim()) {
          const sName = (tc.screenshot1 || '').toLowerCase();
          const matchAtt = tc.attachments && tc.attachments.some((a) => a.name.toLowerCase().includes(columnFilters.screenshot1.toLowerCase().trim()));
          if (!sName.includes(columnFilters.screenshot1.toLowerCase().trim()) && !matchAtt) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (!sortKey || !sortDirection) return 0;
        let valA: any = (a as any)[sortKey] ?? '';
        let valB: any = (b as any)[sortKey] ?? '';

        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortDirection === 'asc' ? valA - valB : valB - valA;
        }

        const comp = String(valA).localeCompare(String(valB));
        return sortDirection === 'asc' ? comp : -comp;
      });
  }, [testCases, filterModule, filterStatus, searchQuery, columnFilters, sortKey, sortDirection]);

  return (
    <div className="p-6 max-w-[1500px] mx-auto space-y-5">
      {/* Top Header & Primary Action Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">
              <Sparkles className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                  AI Test Case Hub &amp; Excel Exporter
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800">
                  Unified Single Hub
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                  Excel-Like Inline Grid
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Edit test cases directly row-by-row (no extra popups). Match QA &amp; Developer specs by Ticket Number, auto-polish grammar, and export exact Excel (.xlsx).
              </p>
            </div>
          </div>
        </div>

        {/* Global Toolbar Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Polish All Sentences Button */}
          <button
            onClick={handlePolishAllCases}
            title="Auto-correct spelling, punctuation and standardize to professional QA phrasing"
            className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Wand2 className="w-3.5 h-3.5 text-purple-600" />
            <span>Auto-Polish Sentences &amp; Grammar</span>
          </button>

          {/* AI Generator & Screenshot Drawer Toggle */}
          <button
            onClick={() => setIsAiDrawerOpen(!isAiDrawerOpen)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-colors cursor-pointer border ${
              isAiDrawerOpen
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>{isAiDrawerOpen ? 'Hide AI & SS Scanner' : 'Attach Screenshot & AI Generate'}</span>
          </button>

          {/* Add Row Button */}
          <button
            onClick={handleAddRow}
            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Row</span>
          </button>

          {/* Download Excel (.xlsx) Button */}
          <button
            onClick={handleDownloadExcel}
            title="Download Excel with exact Beacon navy headers, thin cell borders, status color fills, wrapped text & attachment links"
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-md flex items-center gap-2 transition-all shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Formatted Excel (.xlsx)</span>
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

      {/* Polish Feedback Banner */}
      {polishNotification && (
        <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-xs text-purple-900 flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
          <span>{polishNotification}</span>
        </div>
      )}

      {/* Azure DevOps Notification Banner */}
      {adoNotification && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
          <span>{adoNotification}</span>
        </div>
      )}

      {/* Download Success Banner */}
      {downloadSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            Excel file <strong>{header.taskName.replace(/[^a-zA-Z0-9_-]/g, '_')}_testing.xlsx</strong> downloaded with <strong>Beacon Corporate Navy header (#1E3A8A)</strong>, thin cell grid borders, color-coded Pass/Fail badges, and wrapped rows!
          </span>
        </div>
      )}

      {/* Ticket Matching & Handover Bar (Responsive & Polished) */}
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
                const text = matchedTicket?.shaCommit || header.sha;
                navigator.clipboard.writeText(text);
                showPolishFeedback('Copied SHA commit hash to clipboard!');
              }}
              title="Click to copy commit SHA"
              className="flex items-center gap-1.5 font-mono text-[11px] px-2.5 py-1 bg-blue-950/80 hover:bg-blue-900 text-blue-300 border border-blue-800/60 rounded-md cursor-pointer transition-colors shadow-2xs"
            >
              <span className="text-blue-400 font-bold">SHA:</span>
              <span className="truncate max-w-[200px] select-all">{matchedTicket?.shaCommit || header.sha}</span>
              <Copy className="w-3 h-3 text-blue-400 shrink-0" />
            </div>
          </div>
        </div>

        {/* Matched Documents Viewer: QA Requirement vs Dev Handover */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700/60">
            <div className="flex items-center gap-1.5 text-blue-400 font-bold mb-1">
              <FileText className="w-3.5 h-3.5" />
              <span>QA Requirement &amp; Acceptance Criteria</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed whitespace-pre-line">
              {matchedTicket?.qaRequirementDoc ||
                'Overdue report must show penalty interest and principal breakdown once loan is disbursed. Without disbursement, overdue report must suppress penalty rows.'}
            </p>
          </div>

          <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700/60">
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold mb-1">
              <Code2 className="w-3.5 h-3.5" />
              <span>Developer Handover Notes &amp; Contracts</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed whitespace-pre-line">
              {matchedTicket?.devHandoverNotes ||
                'Logic: penalty applied only if overdue_days > grace_period AND disbursement_status == "DISBURSED".\nDB Tables: beacon_loans, loan_amortization_schedules, overdue_penalties'}
            </p>
          </div>
        </div>
      </div>

      {/* Expandable AI Test Case Hub Generator & Impact Testing Drawer */}
      {isAiDrawerOpen && (
        <div className="bg-white border-2 border-blue-300 rounded-xl p-5 shadow-md space-y-5 animate-fadeIn">
          {/* Drawer Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                <Sparkles className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>AI Test Case Generator &amp; Impact Analysis Hub</span>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-semibold rounded-full">
                    Ticket #{selectedTicketNumber}
                  </span>
                </h2>
                <p className="text-[11px] text-slate-500">
                  Custom-tailor cases from Ticket Description, Acceptance Scenarios, and Impact Testing Points. Edit any input directly below!
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 px-2.5 py-1 rounded border border-slate-200 shrink-0">
              <span>💡 Press</span>
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-mono font-bold text-slate-700 shadow-2xs">
                Ctrl + V
              </kbd>
              <span>to paste screenshot anytime</span>
            </div>
          </div>

          {/* Section 1: Ticket Description & Functional Scenarios (Editable) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  <span>Ticket Description &amp; Scope (Editable)</span>
                </label>
                <span className="text-[10px] text-slate-400">Directly feeds AI Expected Results</span>
              </div>
              <textarea
                rows={3}
                value={ticketDescription}
                onChange={(e) => setTicketDescription(e.target.value)}
                placeholder="Enter or refine ticket description..."
                className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 leading-relaxed font-sans resize-none"
              />
            </div>

            <div className="space-y-1.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Ticket Scenarios &amp; Acceptance Criteria (Editable)</span>
                </label>
                <span className="text-[10px] text-slate-400">Feeds AI Test Steps &amp; Inputs</span>
              </div>
              <textarea
                rows={3}
                value={ticketScenarios}
                onChange={(e) => setTicketScenarios(e.target.value)}
                placeholder="Enter acceptance criteria, boundary rules, or scenario points..."
                className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 leading-relaxed font-sans resize-none"
              />
            </div>
          </div>

          {/* Section 2: Impact Testing Points (Editable Tags & Add Custom) */}
          <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-3.5 space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                <Target className="w-4 h-4 text-amber-600" />
                <span>Impact Testing Points (Downstream modules to verify for regressions)</span>
              </div>
              <span className="text-[10px] text-amber-700/80 font-medium">
                Click (x) to remove, or type a custom impact area and hit Add
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {impactPoints.map((point, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-amber-300 text-amber-950 font-medium rounded-md text-xs shadow-2xs"
                >
                  <Tag className="w-3 h-3 text-amber-600" />
                  <span>{point}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveImpactPoint(idx)}
                    title="Remove impact point"
                    className="hover:text-red-600 p-0.5 rounded cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}

              {/* Add Custom Impact Point Input */}
              <div className="inline-flex items-center gap-1">
                <input
                  type="text"
                  value={newImpactPoint}
                  onChange={(e) => setNewImpactPoint(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddImpactPoint();
                    }
                  }}
                  placeholder="+ Add custom impact point..."
                  className="px-2.5 py-1 bg-white border border-amber-300 rounded text-xs text-slate-800 placeholder:text-amber-700/50 focus:outline-none focus:ring-1 focus:ring-amber-500 w-52"
                />
                <button
                  type="button"
                  onClick={handleAddImpactPoint}
                  className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded cursor-pointer transition-colors"
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          {/* Section 3: Product Screenshot Field Scanner & Detected Fields */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Screenshot Drop / Upload Zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-blue-200 hover:border-blue-400 rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer bg-blue-50/20 transition-all min-h-[110px]"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
              {uploadedScreenshot ? (
                <div className="flex items-center gap-3">
                  <img
                    src={uploadedScreenshot}
                    alt="Beacon Screenshot Preview"
                    className="max-h-20 max-w-[160px] rounded border border-slate-200 object-contain shadow-2xs"
                  />
                  <div className="text-left space-y-1">
                    <div className="text-xs font-bold text-blue-900">{screenshotFileName}</div>
                    <div className="text-[10px] text-blue-600">Attached to all generated cases! (Click to replace)</div>
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <Upload className="w-5 h-5 text-blue-500 mx-auto" />
                  <div className="text-xs font-bold text-slate-800">
                    Attach Beacon Screenshot or Paste Image (<kbd className="font-mono text-[10px]">Ctrl+V</kbd>)
                  </div>
                  <div className="text-[10px] text-slate-500">
                    AI scans fields to extract form parameters into Positive &amp; Negative test cases
                  </div>
                </div>
              )}
            </div>

            {/* Detected Product Fields */}
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-blue-600" />
                  <span>Detected Beacon Product Form Fields</span>
                </span>
                {isScanningFields && (
                  <span className="text-[10px] font-normal text-blue-600 animate-pulse">
                    Scanning UI...
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                {detectedFields.map((field, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 bg-white border border-slate-200 text-slate-700 rounded text-[11px]"
                  >
                    {field}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Section 4: AI Generation Trigger Buttons */}
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-slate-600 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>Select case generation scope:</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                disabled={isGenerating}
                onClick={() => handleGenerateAiCases('positive')}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Generate Positive Cases</span>
              </button>

              <button
                disabled={isGenerating}
                onClick={() => handleGenerateAiCases('negative')}
                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-800 border border-red-300 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
                <span>Generate Negative Cases</span>
              </button>

              <button
                disabled={isGenerating}
                onClick={() => handleGenerateAiCases('impact')}
                className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Target className="w-3.5 h-3.5 text-amber-600" />
                <span>Generate Impact Scenarios</span>
              </button>

              <button
                disabled={isGenerating}
                onClick={() => handleGenerateAiCases('all')}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isGenerating ? 'Generating Cases...' : '✨ Generate All (Positive, Negative & Impact)'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Editable Header Metadata Block (Excel Rows 1-6) */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Excel Header Metadata (Rows 1–6 in Exported .xlsx)
            </h2>
          </div>
          <span className="text-[11px] text-slate-400 italic">
            Click any field to edit directly
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
              Ticket No -
            </label>
            <input
              type="text"
              value={header.ticketNo}
              onChange={(e) => {
                const next = { ...header, ticketNo: e.target.value };
                setHeader(next);
                onUpdateHeader?.(next);
              }}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-mono font-semibold text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white text-xs"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
              Client Name:-
            </label>
            <input
              type="text"
              value={header.clientName}
              onChange={(e) => {
                const next = { ...header, clientName: e.target.value };
                setHeader(next);
                onUpdateHeader?.(next);
              }}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-semibold text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white text-xs"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
              Task Name:
            </label>
            <input
              type="text"
              value={header.taskName}
              onChange={(e) => {
                const next = { ...header, taskName: e.target.value };
                setHeader(next);
                onUpdateHeader?.(next);
              }}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-semibold text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white text-xs"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
              Task done by-
            </label>
            <input
              type="text"
              value={header.taskDoneBy}
              onChange={(e) => {
                const next = { ...header, taskDoneBy: e.target.value };
                setHeader(next);
                onUpdateHeader?.(next);
              }}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-semibold text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white text-xs"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
              Sign off By -
            </label>
            <input
              type="text"
              value={header.signOffBy}
              onChange={(e) => {
                const next = { ...header, signOffBy: e.target.value };
                setHeader(next);
                onUpdateHeader?.(next);
              }}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-semibold text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white text-xs"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
              SHA :
            </label>
            <input
              type="text"
              value={header.sha}
              onChange={(e) => {
                const next = { ...header, sha: e.target.value };
                setHeader(next);
                onUpdateHeader?.(next);
              }}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-mono text-[11px] text-slate-600 focus:outline-none focus:border-blue-500 focus:bg-white"
            />
          </div>
        </div>
      </div>

      {/* Search and Table Quick Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search test scenario, verification steps, inputs, expected results..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-xs font-medium text-slate-700 focus:outline-none"
          >
            <option value="all">All Statuses ({testCases.length})</option>
            <option value="pass">Pass ({testCases.filter((t) => t.status === 'pass').length})</option>
            <option value="fail">Fail ({testCases.filter((t) => t.status === 'fail').length})</option>
            <option value="blocked">Blocked ({testCases.filter((t) => t.status === 'blocked').length})</option>
            <option value="not run">Not Run ({testCases.filter((t) => t.status === 'not run').length})</option>
          </select>

          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="px-2.5 py-1.5 text-xs text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 rounded-md border border-rose-200 font-medium transition-colors cursor-pointer"
            >
              Reset Filters &amp; Sort
            </button>
          )}

          <span className="text-xs text-slate-400 font-medium">
            Showing {filteredTestCases.length} of {testCases.length} test cases
          </span>
        </div>
      </div>

      {/* EXCEL-LIKE SPREADSHEET TABLE (Row-wise inline editable) */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto max-h-[600px]">
          <table className="w-full text-left text-xs border-collapse min-w-[1450px]">
            {/* Table Header matching user's Row 9 with Sort & Filter on Every Column */}
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
                  className="min-w-[200px] border-r border-slate-700"
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

                <th className="p-2.5 w-20 text-center">Actions</th>
              </tr>
            </thead>

            {/* Table Body with Inline Editable Cells */}
            <tbody className="divide-y divide-slate-200 font-normal text-slate-800">
              {filteredTestCases.map((tc, index) => (
                <tr
                  key={tc.id}
                  className={`hover:bg-blue-50/30 transition-colors group ${
                    tc.isAiGenerated ? 'bg-indigo-50/20' : ''
                  }`}
                >
                  {/* Row Index */}
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

                  {/* 3. feature tab /flow report */}
                  <td className="p-1 border-r border-slate-100">
                    <input
                      type="text"
                      value={tc.featureTab}
                      onChange={(e) => handleCellChange(tc.id, 'featureTab', e.target.value)}
                      className="w-full px-1.5 py-1 text-slate-700 bg-transparent hover:bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 rounded text-xs"
                    />
                  </td>

                  {/* 4. Test Scenario (Inline textarea with ✨ quick polish) */}
                  <td className="p-1 border-r border-slate-100 relative group/scenario">
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
                      placeholder="Enter scenario..."
                      className="w-full px-2 py-1 text-slate-900 bg-transparent hover:bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 rounded text-xs resize-y"
                    />
                    <button
                      onClick={() => handlePolishSingleRow(tc.id)}
                      title="Auto-polish this row's grammar and QA phrasing"
                      className="absolute right-2 top-2 opacity-0 group-hover/scenario:opacity-100 p-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded border border-purple-200 transition-opacity cursor-pointer text-[10px]"
                    >
                      <Wand2 className="w-3 h-3" />
                    </button>
                  </td>

                  {/* 5. Test Cases (Verification Steps) */}
                  <td className="p-1 border-r border-slate-100">
                    <textarea
                      rows={2}
                      value={tc.testCases}
                      onChange={(e) => handleCellChange(tc.id, 'testCases', e.target.value)}
                      onBlur={(e) => {
                        const polished = correctSpelling(e.target.value);
                        if (polished !== e.target.value) {
                          handleCellChange(tc.id, 'testCases', polished);
                        }
                      }}
                      placeholder="Enter steps..."
                      className="w-full px-2 py-1 text-slate-800 bg-transparent hover:bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 rounded text-xs resize-y font-normal"
                    />
                  </td>

                  {/* 6. Test Inputs */}
                  <td className="p-1 border-r border-slate-100">
                    <textarea
                      rows={2}
                      value={tc.testInputs}
                      onChange={(e) => handleCellChange(tc.id, 'testInputs', e.target.value)}
                      placeholder="Enter inputs..."
                      className="w-full px-2 py-1 font-mono text-[11px] text-slate-700 bg-transparent hover:bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 rounded resize-y"
                    />
                  </td>

                  {/* 7. Expected Result */}
                  <td className="p-1 border-r border-slate-100">
                    <textarea
                      rows={2}
                      value={tc.expectedResult}
                      onChange={(e) => handleCellChange(tc.id, 'expectedResult', e.target.value)}
                      onBlur={(e) => {
                        const polished = correctSpelling(e.target.value);
                        if (polished !== e.target.value) {
                          handleCellChange(tc.id, 'expectedResult', polished);
                        }
                      }}
                      placeholder="Expected outcome..."
                      className="w-full px-2 py-1 text-slate-800 bg-transparent hover:bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 rounded text-xs resize-y"
                    />
                  </td>

                  {/* 8. Actual Result */}
                  <td className="p-1 border-r border-slate-100">
                    <textarea
                      rows={2}
                      value={tc.actualResult}
                      onChange={(e) => handleCellChange(tc.id, 'actualResult', e.target.value)}
                      placeholder="Actual outcome..."
                      className="w-full px-2 py-1 text-slate-800 bg-transparent hover:bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 rounded text-xs resize-y"
                    />
                  </td>

                  {/* 9. Status (Dropdown selector) */}
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
                      rowId={tc.id}
                      attachments={
                        tc.attachments && tc.attachments.length > 0
                          ? tc.attachments
                          : tc.screenshot1
                          ? [
                              {
                                id: `att-${tc.id}-legacy`,
                                name: tc.screenshot1,
                                url: '',
                                size: 'Attached',
                                uploadedAt: 'Initial',
                              },
                            ]
                          : []
                      }
                      onAddAttachment={(file) => handleAddAttachment(tc.id, file)}
                      onRemoveAttachment={(attId) => handleRemoveAttachment(tc.id, attId)}
                    />
                  </td>

                  {/* Row Actions: Duplicate, Delete, Polish */}
                  <td className="p-1 text-center">
                    <div className="flex items-center justify-center gap-1">
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

        {/* Bottom Table Toolbar */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={handleAddRow}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold rounded shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-blue-600" />
              <span>+ Insert New Row at Bottom</span>
            </button>
            <button
              onClick={handlePolishAllCases}
              className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-semibold rounded flex items-center gap-1.5 cursor-pointer"
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>Polish All Rows (Grammar &amp; QA Format)</span>
            </button>
          </div>

          <div className="flex items-center gap-4 text-slate-500">
            <div>
              Total: <strong className="text-slate-800">{testCases.length}</strong>
            </div>
            <div>
              Pass: <strong className="text-emerald-700">{testCases.filter((t) => t.status === 'pass').length}</strong>
            </div>
            <div>
              Fail: <strong className="text-red-700">{testCases.filter((t) => t.status === 'fail').length}</strong>
            </div>
            <div>
              Blocked: <strong className="text-amber-700">{testCases.filter((t) => t.status === 'blocked').length}</strong>
            </div>
            <div>
              Not Run: <strong className="text-slate-700">{testCases.filter((t) => t.status === 'not run').length}</strong>
            </div>
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
        defaultComment={`QA Test Cases & Execution Matrix for "${header.taskName}" (Ticket #${selectedTicketNumber}) verified by ${header.taskDoneBy}. Total Cases: ${testCases.length} (Passed: ${testCases.filter((t) => t.status === 'pass').length}, Failed: ${testCases.filter((t) => t.status === 'fail').length}).`}
        onSuccessNotice={(msg) => {
          setAdoNotification(msg);
          setTimeout(() => setAdoNotification(null), 5000);
        }}
      />
    </div>
  );
};
