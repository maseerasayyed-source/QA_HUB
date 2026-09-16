import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Download,
  Plus,
  Trash2,
  Copy,
  CheckCircle2,
  Wand2,
  Search,
  UploadCloud,
  AlertTriangle,
  Send,
  RotateCcw,
  FileCheck2,
  ArrowLeft,
  ChevronRight,
  Edit3,
  Layers,
  Filter,
  Check,
  X,
  Clock,
  CheckCircle,
  ExternalLink,
  ShieldCheck,
  FileText,
  CheckCheck,
  Edit2,
  ArrowUpRight,
} from 'lucide-react';
import {
  TestCaseHeaderMeta,
  TestCaseItem,
  TicketSummary,
  BeaconModule,
  UserProfile,
  TestCaseReviewStatus,
  TestCaseRevision,
  AttachedDocOrImage,
  ReviewComment,
} from '../types';
import { exportTestCasesToExcel } from '../utils/excelExport';
import {
  polishTestCaseItem,
} from '../utils/textPolisher';
import { ColumnHeader, SortDirection } from './common/ColumnHeader';
import { RowAttachmentsCell } from './common/RowAttachmentsCell';
import { AzureDevopsModal } from './common/AzureDevopsModal';
import { CommonHeader } from './common/CommonHeader';
import { TestCaseSolutionModal } from './common/TestCaseSolutionModal';
import { getAllCreatedTicketsOnSystem } from '../data/dbStore';
import {
  generateTestCaseFromOneLine,
  generateComprehensiveTestCasesForTicket,
  generateTicketDetailsWithAi,
  generateScenariosFromInputsAndFiles,
  checkIsDuplicate,
} from '../utils/aiGenerator';

interface UnifiedAITestHubProps {
  initialHeader: TestCaseHeaderMeta;
  initialTestCases: TestCaseItem[];
  tickets: TicketSummary[];
  modules: BeaconModule[];
  currentUser?: UserProfile;
  activeTicketNumber?: string;
  testCasesMap?: Record<string, TestCaseItem[]>;
  testCaseHeadersMap?: Record<string, TestCaseHeaderMeta>;
  onSelectTicket?: (ticketNumber: string) => void;
  onNavigateTab?: (tab: any) => void;
  onUpdateHeader?: (header: TestCaseHeaderMeta) => void;
  onUpdateTestCases?: (testCases: TestCaseItem[], ticketNo?: string) => void;
  onAddTicket?: (ticket: TicketSummary) => void;
}

export const UnifiedAITestHub: React.FC<UnifiedAITestHubProps> = ({
  initialHeader,
  initialTestCases,
  tickets,
  modules,
  currentUser,
  activeTicketNumber,
  testCasesMap = {},
  testCaseHeadersMap = {},
  onSelectTicket,
  onNavigateTab,
  onUpdateHeader,
  onUpdateTestCases,
  onAddTicket,
}) => {
  // Hub Navigation Mode: Tickets Table vs Test Cases Screen
  const [hubMode, setHubMode] = useState<'tickets-table' | 'test-case-screen'>('tickets-table');

  // Currently Selected Ticket Number
  const [selectedTicketNumber, setSelectedTicketNumber] = useState<string>(
    activeTicketNumber || initialHeader.ticketNo || ''
  );

  // Synchronize when activeTicketNumber prop updates
  useEffect(() => {
    if (activeTicketNumber && activeTicketNumber !== selectedTicketNumber) {
      setSelectedTicketNumber(activeTicketNumber);
    }
  }, [activeTicketNumber]);

  // Currently Matched Ticket
  const matchedTicket = useMemo(() => {
    return (
      tickets.find((t) => t.ticketNumber.toLowerCase() === selectedTicketNumber.toLowerCase()) ||
      tickets[0] ||
      undefined
    );
  }, [tickets, selectedTicketNumber]);

  // Header Metadata - synchronized with testCaseHeadersMap
  const [header, setHeader] = useState<TestCaseHeaderMeta>(() => {
    const existing = selectedTicketNumber ? testCaseHeadersMap[selectedTicketNumber] : undefined;
    if (existing) return existing;
    return {
      ...initialHeader,
      ticketNo: matchedTicket?.ticketNumber || initialHeader.ticketNo || '',
      taskName: matchedTicket?.featureName || initialHeader.taskName || '',
      taskDoneBy: matchedTicket?.qaAssignee || initialHeader.taskDoneBy || currentUser?.name || 'Maseera Sayyed',
      signOffBy: matchedTicket?.signOffBy || initialHeader.signOffBy || '',
      reviewStatus: initialHeader.reviewStatus || 'Draft',
      version: initialHeader.version || '1.0',
      revisionsHistory: initialHeader.revisionsHistory || [],
      comments: initialHeader.comments || [],
    };
  });

  // Keep header synchronized when ticket changes or testCaseHeadersMap updates
  useEffect(() => {
    if (testCaseHeadersMap && testCaseHeadersMap[selectedTicketNumber]) {
      setHeader(testCaseHeadersMap[selectedTicketNumber]);
    }
  }, [selectedTicketNumber, testCaseHeadersMap]);

  // Test Cases List for Current Ticket
  const [testCases, setTestCases] = useState<TestCaseItem[]>(() => {
    if (testCasesMap[selectedTicketNumber]) {
      return testCasesMap[selectedTicketNumber];
    }
    return initialTestCases;
  });

  // Sync testCases when selectedTicketNumber or testCasesMap changes
  useEffect(() => {
    if (testCasesMap[selectedTicketNumber]) {
      setTestCases(testCasesMap[selectedTicketNumber]);
    } else if (selectedTicketNumber === initialHeader.ticketNo) {
      setTestCases(initialTestCases);
    } else {
      setTestCases([]);
    }
  }, [selectedTicketNumber, testCasesMap]);

  // Common Header State
  const [headerDescription, setHeaderDescription] = useState<string>(
    matchedTicket?.description || matchedTicket?.qaRequirementDoc || matchedTicket?.featureName || ''
  );
  const [headerTestingScenarios, setHeaderTestingScenarios] = useState<string>(
    matchedTicket?.testingScenarios || matchedTicket?.scenarioDetails || ''
  );

  // Tickets List View State
  const [ticketSearch, setTicketSearch] = useState<string>('');
  const [ticketStatusFilter, setTicketStatusFilter] = useState<string>('all');
  const [ticketModuleFilter, setTicketModuleFilter] = useState<string>('all');

  // Add Ticket Modal State
  const [isAddTicketModalOpen, setIsAddTicketModalOpen] = useState<boolean>(false);
  const [newTicketNumber, setNewTicketNumber] = useState<string>('');
  const [newFeatureName, setNewFeatureName] = useState<string>('');
  const [newModuleId, setNewModuleId] = useState<string>(modules[0]?.id || 'term-loan');
  const [customModuleName, setCustomModuleName] = useState<string>('');
  const [newPriority, setNewPriority] = useState<'Critical' | 'High' | 'Medium' | 'Low'>('High');
  const [newDeveloper, setNewDeveloper] = useState<string>('');
  const [newQaAssignee, setNewQaAssignee] = useState<string>(currentUser?.name || 'Maseera Sayyed');
  const [newScenarioDetails, setNewScenarioDetails] = useState<string>('');
  const [isAiGeneratingTicket, setIsAiGeneratingTicket] = useState<boolean>(false);
  const [fetchedHeaderNotice, setFetchedHeaderNotice] = useState<string | null>(null);

  // System-wide tickets created on this client across all modules
  const systemTicketsList = useMemo(() => {
    const map = new Map<string, TicketSummary>();
    (tickets || []).forEach((t) => {
      if (t.ticketNumber) {
        map.set(t.ticketNumber.trim().toLowerCase(), t);
      }
    });
    const storedTickets = getAllCreatedTicketsOnSystem();
    storedTickets.forEach((st) => {
      if (st.ticketNumber && !map.has(st.ticketNumber.trim().toLowerCase())) {
        map.set(st.ticketNumber.trim().toLowerCase(), st);
      }
    });
    return Array.from(map.values());
  }, [tickets]);

  const handleSelectExistingTicket = (selectedId: string) => {
    if (!selectedId) return;
    const cleanId = selectedId.trim().toLowerCase().replace('#', '');
    const matched = systemTicketsList.find(
      (t) => t.ticketNumber.trim().toLowerCase().replace('#', '') === cleanId
    );
    if (!matched) return;

    setNewTicketNumber(matched.ticketNumber);
    setNewFeatureName(matched.featureName || '');
    if (matched.priority) setNewPriority(matched.priority);
    if (matched.developer) setNewDeveloper(matched.developer);
    if (matched.qaAssignee) setNewQaAssignee(matched.qaAssignee);
    if (matched.scenarioDetails || matched.description) {
      setNewScenarioDetails(matched.scenarioDetails || matched.description || '');
    }
    setFetchedHeaderNotice(
      `✅ Headers auto-fetched from Ticket #${matched.ticketNumber} (${matched.moduleName || 'General'}). Select your target module below.`
    );
  };

  const handleTicketNumberChange = (val: string) => {
    setNewTicketNumber(val);
    const clean = val.trim().toLowerCase().replace('#', '');
    if (clean.length >= 2) {
      const matched = systemTicketsList.find(
        (t) => t.ticketNumber.trim().toLowerCase().replace('#', '') === clean
      );
      if (matched) {
        setNewFeatureName(matched.featureName || '');
        if (matched.priority) setNewPriority(matched.priority);
        if (matched.developer) setNewDeveloper(matched.developer);
        if (matched.qaAssignee) setNewQaAssignee(matched.qaAssignee);
        if (matched.scenarioDetails || matched.description) {
          setNewScenarioDetails(matched.scenarioDetails || matched.description || '');
        }
        setFetchedHeaderNotice(
          `✅ Headers auto-fetched from existing Ticket #${matched.ticketNumber} (${matched.moduleName || 'General'}).`
        );
        return;
      }
    }
    if (fetchedHeaderNotice) setFetchedHeaderNotice(null);
  };

  // Test Case Solution Modal State (from Image 3)
  const [editingSolutionCase, setEditingSolutionCase] = useState<TestCaseItem | null>(null);

  // Submit For Review Modal State
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState<boolean>(false);
  const [submittingTicket, setSubmittingTicket] = useState<TicketSummary | null>(null);
  const [selectedReviewerEmail, setSelectedReviewerEmail] = useState<string>(
    'maseerasayyed@quantumphinance.com'
  );
  const [customReviewerName, setCustomReviewerName] = useState<string>('');
  const [customReviewerEmail, setCustomReviewerEmail] = useState<string>('');
  const [submissionNotes, setSubmissionNotes] = useState<string>('');
  const [submissionChecklist, setSubmissionChecklist] = useState({
    positiveScenarios: true,
    negativeValidation: true,
    boundaryCoverage: true,
    clearInputsOutputs: true,
  });

  // Notification & Feedback
  const [notification, setNotification] = useState<string | null>(null);
  const [notificationAction, setNotificationAction] = useState<{ label: string; tab: string } | null>(null);
  const [isAdoModalOpen, setIsAdoModalOpen] = useState<boolean>(false);
  const [isAiGeneratingSuite, setIsAiGeneratingSuite] = useState<boolean>(false);

  // Column Sort & Filter for Test Cases Table
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({
    testCaseId: '',
    testScenario: '',
    testCases: '',
    expectedResult: '',
    status: '',
  });

  // Permissions & Review Locks
  const isAssignedQaOrSuperAdmin = useMemo(() => {
    if (!currentUser) return true;
    if (currentUser.role === 'Super Admin') return true;
    const currentName = currentUser.name.toLowerCase().trim();
    const assignedName = (header.taskDoneBy || matchedTicket?.qaAssignee || '').toLowerCase().trim();
    return (
      currentName.includes(assignedName) ||
      assignedName.includes(currentName) ||
      currentUser.role === 'Senior QA'
    );
  }, [currentUser, header.taskDoneBy, matchedTicket]);

  const isApprovedAndReadOnly = header.reviewStatus === 'Approved';
  const isInReviewLocked = header.reviewStatus === 'In Review';

  // Handle Opening Test Cases Screen for a Ticket
  const handleOpenTestCasesScreen = (ticket: TicketSummary) => {
    setSelectedTicketNumber(ticket.ticketNumber);
    onSelectTicket?.(ticket.ticketNumber);

    const updatedHeader: TestCaseHeaderMeta = {
      ...header,
      ticketNo: ticket.ticketNumber,
      taskName: ticket.featureName,
      description: ticket.description || ticket.featureName,
      testingScenarios: ticket.testingScenarios || ticket.scenarioDetails,
      clientName: ticket.clientName || header.clientName || 'Treasury Master',
      sha: ticket.shaCommit || header.sha,
      taskDoneBy: ticket.qaAssignee || header.taskDoneBy || 'Maseera Sayyed',
      signOffBy: ticket.signOffBy || header.signOffBy || '',
    };
    setHeader(updatedHeader);
    setHeaderDescription(ticket.description || ticket.featureName);
    setHeaderTestingScenarios(ticket.testingScenarios || ticket.scenarioDetails || '');
    onUpdateHeader?.(updatedHeader);

    // Switch view to test cases screen
    setHubMode('test-case-screen');
  };

  // Sync test cases back to parent
  const updateTestCases = (newCases: TestCaseItem[], tNo?: string) => {
    const targetTicket = tNo || selectedTicketNumber;
    setTestCases(newCases);
    onUpdateTestCases?.(newCases, targetTicket);
  };

  // AI Auto-Generate Full Test Suite for Selected Ticket
  const handleAiGenerateFullSuite = (ticketToGen?: TicketSummary) => {
    const target = ticketToGen || matchedTicket;
    if (!target) return;

    setIsAiGeneratingSuite(true);
    setTimeout(() => {
      const generatedSuite = generateComprehensiveTestCasesForTicket(target);
      updateTestCases(generatedSuite, target.ticketNumber);
      setIsAiGeneratingSuite(false);
      setNotification(`✨ AI generated full test suite (${generatedSuite.length} cases) for Ticket #${target.ticketNumber}!`);
      setTimeout(() => setNotification(null), 4000);
    }, 400);
  };

  // AI Generate Ticket Details in Add Ticket Modal
  const handleAiGenerateTicketModal = () => {
    if (!newFeatureName.trim()) {
      alert('Please enter a feature name first.');
      return;
    }
    setIsAiGeneratingTicket(true);
    const modObj = modules.find((m) => m.id === newModuleId);
    const modName = newModuleId === 'other' ? (customModuleName || 'Custom Module') : (modObj ? modObj.name : 'Financial Module');

    const result = generateTicketDetailsWithAi(newFeatureName, modName);
    setNewScenarioDetails(result.testingScenarios);
    setNewPriority(result.priority);
    setIsAiGeneratingTicket(false);
  };

  // Handle Creating a New Ticket
  const handleCreateTicketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicketNumber.trim() || !newFeatureName.trim()) {
      alert('Please fill in all mandatory fields.');
      return;
    }

    let finalModuleId = newModuleId;
    let finalModuleName = 'Custom Module';

    if (newModuleId === 'other') {
      finalModuleName = customModuleName.trim() || 'Custom Module';
      finalModuleId = `custom-${finalModuleName.toLowerCase().replace(/\s+/g, '-')}`;
    } else {
      const found = modules.find((m) => m.id === newModuleId);
      finalModuleName = found ? found.name : 'General Module';
    }

    const matchedExisting = systemTicketsList.find(
      (t) => t.ticketNumber.trim().toLowerCase().replace('#', '') === newTicketNumber.trim().toLowerCase().replace('#', '')
    );

    const newTicket: TicketSummary = {
      id: `ticket-${Date.now()}`,
      ticketNumber: newTicketNumber.trim(),
      featureName: newFeatureName.trim(),
      moduleId: finalModuleId,
      moduleName: finalModuleName,
      developer: newDeveloper.trim() || (matchedExisting?.developer || ''),
      qaAssignee: newQaAssignee.trim() || (matchedExisting?.qaAssignee || currentUser?.name || 'Maseera Sayyed'),
      priority: newPriority,
      status: 'Ready for QA',
      testCasesCount: 0,
      passedCount: 0,
      failedCount: 0,
      blockedCount: 0,
      observationsCount: 0,
      receivedDate: new Date().toISOString().split('T')[0],
      scenarioDetails: newScenarioDetails.trim() || (matchedExisting?.scenarioDetails || ''),
      testingScenarios: newScenarioDetails.trim() || (matchedExisting?.testingScenarios || ''),
      clientName: matchedExisting?.clientName || 'Treasury Master',
      description: matchedExisting?.description || `Test cases ticket #${newTicketNumber.trim()} in ${finalModuleName}`,
    };

    onAddTicket?.(newTicket);
    setIsAddTicketModalOpen(false);
    setFetchedHeaderNotice(null);
    setNewTicketNumber('');
    setNewFeatureName('');
    setCustomModuleName('');
    setNewScenarioDetails('');
    setNotification(`✅ Ticket #${newTicket.ticketNumber} created successfully!`);
    setTimeout(() => setNotification(null), 4000);
  };

  // Common Header AI Generation Action - Multi-Scenario Generation with Duplicate Prevention
  const handleCommonHeaderGenerateAi = () => {
    setIsAiGeneratingSuite(true);
    setTimeout(() => {
      const result = generateScenariosFromInputsAndFiles({
        ticket: matchedTicket,
        description: headerDescription,
        testingScenarios: headerTestingScenarios,
        attachedDocs: header.attachedDocs || [],
        screenFields: header.screenFields || [],
        targetMode: 'qa',
        existingItems: testCases,
      });

      if (result.newItems.length === 0 && result.skippedDuplicates.length > 0) {
        setNotification(
          `⚠️ All ${result.skippedDuplicates.length} candidate scenarios are already covered in the table! Duplicate rows were prevented.`
        );
        setTimeout(() => setNotification(null), 5000);
        setIsAiGeneratingSuite(false);
        return;
      }

      if (result.newItems.length === 0) {
        setNotification('Please enter a description, testing scenarios, or attach a screenshot/fields to generate test cases.');
        setTimeout(() => setNotification(null), 4000);
        setIsAiGeneratingSuite(false);
        return;
      }

      const nextCases = [...testCases, ...result.newItems];
      updateTestCases(nextCases);
      setIsAiGeneratingSuite(false);

      const dupText =
        result.skippedDuplicates.length > 0
          ? ` (${result.skippedDuplicates.length} duplicate scenarios already covered were skipped)`
          : '';
      setNotification(`🚀 Generated & added ${result.newItems.length} unique Test Cases into table!${dupText}`);
      setTimeout(() => setNotification(null), 5000);
    }, 400);
  };

  // Add Empty Row in Test Cases
  const handleAddRow = () => {
    const newCase: TestCaseItem = {
      id: `tc-${Date.now()}`,
      testCaseId: `TC0${testCases.length + 1}`,
      testModule: matchedTicket?.moduleName.toLowerCase() || 'term loan',
      featureTab: 'general',
      testScenario: '',
      testCases: '',
      testInputs: '',
      expectedResult: '',
      validationScenario: '',
      actualResult: 'Pending execution',
      status: 'not run',
      reviewStatus: 'Draft',
      version: header.version || '1.0',
      attachments: [],
    };
    updateTestCases([...testCases, newCase]);
  };

  // Delete Row
  const handleDeleteRow = (id: string) => {
    if (confirm('Delete this test case row?')) {
      updateTestCases(testCases.filter((c) => c.id !== id));
    }
  };

  // Duplicate Row
  const handleDuplicateRow = (id: string) => {
    const target = testCases.find((c) => c.id === id);
    if (!target) return;
    const duplicated: TestCaseItem = {
      ...target,
      id: `tc-${Date.now()}`,
      testCaseId: `TC0${testCases.length + 1}`,
      testScenario: `${target.testScenario} (Copy)`,
    };
    updateTestCases([...testCases, duplicated]);
  };

  // Inline Cell Change
  const handleCellChange = (id: string, field: keyof TestCaseItem, value: any) => {
    const updated = testCases.map((tc) => (tc.id === id ? { ...tc, [field]: value } : tc));
    updateTestCases(updated);
  };

  // Open Submit for Review Modal for specific ticket from tickets table
  const handleOpenSubmitModalForTicket = (ticket: TicketSummary) => {
    const cases = testCasesMap[ticket.ticketNumber] || (ticket.ticketNumber === header.ticketNo ? testCases : []);
    if (cases.length === 0) {
      handleOpenTestCasesScreen(ticket);
      setNotification(`💡 Please generate or create test cases before submitting Ticket #${ticket.ticketNumber} for review.`);
      setTimeout(() => setNotification(null), 4500);
      return;
    }
    setSubmittingTicket(ticket);
    setIsSubmitModalOpen(true);
  };

  // Open Submit for Review Modal from workbench
  const handleOpenSubmitModalFromWorkbench = () => {
    if (testCases.length === 0) {
      setNotification('⚠️ Please add or generate at least one test case before submitting for review.');
      setTimeout(() => setNotification(null), 4000);
      return;
    }
    setSubmittingTicket(null);
    setIsSubmitModalOpen(true);
  };

  // Submit for Test Case Review Action
  const handleConfirmSubmitForApproval = () => {
    const targetTicket = submittingTicket || matchedTicket;
    const targetTicketNo = targetTicket?.ticketNumber || header.ticketNo;
    const currentTicketHeader = testCaseHeadersMap[targetTicketNo] || (targetTicketNo === header.ticketNo ? header : {
      ticketNo: targetTicketNo,
      clientName: targetTicket?.clientName || 'Treasury Master',
      sha: targetTicket?.shaCommit || 'SHA-1: 4710b619ea012cba75ee657d',
      taskName: targetTicket?.featureName || 'Feature',
      taskDoneBy: targetTicket?.qaAssignee || currentUser?.name || 'Maseera Sayyed',
      signOffBy: targetTicket?.signOffBy || '',
      reviewStatus: 'Draft' as TestCaseReviewStatus,
      version: '1.0',
    });

    const targetCases = testCasesMap[targetTicketNo] || (targetTicketNo === header.ticketNo ? testCases : []);

    if (targetCases.length === 0) {
      alert('Please add or generate test cases before submitting for review.');
      return;
    }

    let reviewerName = 'Senior QA Lead';
    if (selectedReviewerEmail === 'custom') {
      reviewerName = customReviewerName.trim() || 'Senior QA Reviewer';
    } else if (selectedReviewerEmail.includes('maseera')) {
      reviewerName = 'Maseera Sayyed (Super Admin)';
    }

    const nowStr = new Date().toLocaleString();
    const submitterName = currentUser?.name || currentTicketHeader.taskDoneBy || 'QA Lead';

    // Prepare comments with submission note if provided
    const newComments: ReviewComment[] = [...(currentTicketHeader.comments || [])];
    if (submissionNotes.trim()) {
      newComments.push({
        id: `note-${Date.now()}`,
        author: submitterName,
        authorEmail: currentUser?.email || 'qa@quantumphinance.com',
        role: currentUser?.role || 'QA Specialist',
        text: `[Submission Note] ${submissionNotes.trim()}`,
        createdAt: nowStr,
      });
    }

    const updatedHeader: TestCaseHeaderMeta = {
      ...currentTicketHeader,
      ticketNo: targetTicketNo,
      taskName: targetTicket?.featureName || currentTicketHeader.taskName,
      description: targetTicket?.description || currentTicketHeader.description || headerDescription,
      testingScenarios: targetTicket?.testingScenarios || currentTicketHeader.testingScenarios || headerTestingScenarios,
      reviewStatus: 'Review Pending',
      submittedBy: submitterName,
      submittedTo: reviewerName,
      submittedAt: nowStr,
      signOffBy: reviewerName,
      comments: newComments,
    };

    if (targetTicketNo === header.ticketNo) {
      setHeader(updatedHeader);
    }
    onUpdateHeader?.(updatedHeader);

    const updatedCases = targetCases.map((tc) => ({
      ...tc,
      reviewStatus: 'Review Pending' as TestCaseReviewStatus,
    }));
    updateTestCases(updatedCases, targetTicketNo);

    setIsSubmitModalOpen(false);
    setSubmittingTicket(null);
    setSubmissionNotes('');

    setNotification(`🚀 Test Suite for Ticket #${targetTicketNo} (${updatedCases.length} cases) submitted to ${reviewerName} for review!`);
    setNotificationAction({
      label: 'View in Senior QA Review Queue',
      tab: 'review-queue',
    });
    setTimeout(() => {
      setNotification(null);
      setNotificationAction(null);
    }, 8000);
  };

  // Post-Approval Revisioning
  const handleCreateNewRevision = () => {
    const currentVer = parseFloat(header.version || '1.0');
    const newVer = (currentVer + 0.1).toFixed(1);

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
    updateTestCases(nextCases);
    onUpdateHeader?.(newHeader);
  };

  // Download Formatted Excel
  const handleDownloadExcel = () => {
    exportTestCasesToExcel(header, testCases);
    setNotification(`📥 Downloaded TestCases_${header.ticketNo}.xlsx with Beacon corporate styling!`);
    setTimeout(() => setNotification(null), 4000);
  };

  // Filtered Tickets for Tickets Table View
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      if (ticketStatusFilter !== 'all' && t.status.toLowerCase() !== ticketStatusFilter.toLowerCase()) {
        return false;
      }
      if (ticketModuleFilter !== 'all' && t.moduleId !== ticketModuleFilter) {
        return false;
      }
      if (ticketSearch.trim()) {
        const q = ticketSearch.toLowerCase().trim();
        const matches =
          t.ticketNumber.toLowerCase().includes(q) ||
          t.featureName.toLowerCase().includes(q) ||
          t.moduleName.toLowerCase().includes(q) ||
          t.qaAssignee.toLowerCase().includes(q) ||
          t.developer.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [tickets, ticketSearch, ticketStatusFilter, ticketModuleFilter]);

  // Filtered Test Cases for Table
  const filteredTestCases = useMemo(() => {
    return testCases
      .filter((tc) => {
        if (columnFilters.testCaseId && !tc.testCaseId.toLowerCase().includes(columnFilters.testCaseId.toLowerCase())) {
          return false;
        }
        if (columnFilters.testScenario && !tc.testScenario.toLowerCase().includes(columnFilters.testScenario.toLowerCase())) {
          return false;
        }
        if (columnFilters.testCases && !tc.testCases.toLowerCase().includes(columnFilters.testCases.toLowerCase())) {
          return false;
        }
        if (columnFilters.expectedResult && !tc.expectedResult.toLowerCase().includes(columnFilters.expectedResult.toLowerCase())) {
          return false;
        }
        if (columnFilters.status && tc.status.toLowerCase() !== columnFilters.status.toLowerCase()) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (!sortKey || !sortDirection) return 0;
        const valA = (a as any)[sortKey] || '';
        const valB = (b as any)[sortKey] || '';
        const comp = String(valA).localeCompare(String(valB));
        return sortDirection === 'asc' ? comp : -comp;
      });
  }, [testCases, columnFilters, sortKey, sortDirection]);

  // Render Tickets Table View
  if (hubMode === 'tickets-table') {
    return (
      <div className="p-6 max-w-[1500px] mx-auto space-y-5">
        {/* Hub Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100 shadow-2xs">
              <Sparkles className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                  QA AI Test Case Hub
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800">
                  Select Ticket to Open Test Cases
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Browse Azure DevOps tickets below. Click any row or &quot;Open Test Cases →&quot; to access full test case authoring and AI generation.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => {
                tickets.forEach((t) => {
                  if ((testCasesMap[t.ticketNumber] || []).length === 0) {
                    const generated = generateComprehensiveTestCasesForTicket(t);
                    onUpdateTestCases?.(generated, t.ticketNumber);
                  }
                });
                setNotification('✨ Auto-generated AI test suites for tickets without cases!');
                setTimeout(() => setNotification(null), 4000);
              }}
              className="px-3.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-bold rounded-md flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              <span>✨ Bulk AI Generate Suites</span>
            </button>

            <button
              onClick={() => setIsAddTicketModalOpen(true)}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-md flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Ticket</span>
            </button>
          </div>
        </div>

        {/* Toast Feedback */}
        {notification && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-center gap-2 animate-fadeIn shadow-2xs">
            <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
            <span>{notification}</span>
          </div>
        )}

        {/* Filter and Search Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs text-xs">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search by Ticket ID, feature name, module, assignee..."
                value={ticketSearch}
                onChange={(e) => setTicketSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Module Filter Dropdown */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Module:</span>
              <select
                value={ticketModuleFilter}
                onChange={(e) => setTicketModuleFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value="all">All Modules ({tickets.length})</option>
                {modules.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter Pills */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
              {['all', 'Ready for QA', 'In Testing', 'Passed'].map((st) => (
                <button
                  key={st}
                  onClick={() => setTicketStatusFilter(st)}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                    ticketStatusFilter === st
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {st === 'all' ? 'All' : st}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tickets Table View with requested columns */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[1100px]">
              <thead className="bg-[#1E293B] text-slate-200 uppercase font-semibold text-[11px] tracking-wider sticky top-0 z-20 shadow-2xs">
                <tr>
                  <th className="p-2.5 w-28 border-r border-slate-700">Ticket ID</th>
                  <th className="p-2.5 min-w-[220px] border-r border-slate-700">Feature / Task Name</th>
                  <th className="p-2.5 w-36 border-r border-slate-700">Module</th>
                  <th className="p-2.5 w-32 border-r border-slate-700">QA Assignee</th>
                  <th className="p-2.5 w-32 border-r border-slate-700">Developer</th>
                  <th className="p-2.5 w-24 text-center border-r border-slate-700">Priority</th>
                  <th className="p-2.5 w-24 text-center border-r border-slate-700">Status</th>
                  <th className="p-2.5 w-28 text-center border-r border-slate-700">Test Cases</th>
                  <th className="p-2.5 w-36 text-center border-r border-slate-700">Review Status</th>
                  <th className="p-2.5 min-w-[180px] text-center">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 text-slate-800">
                {filteredTickets.map((t) => {
                  const casesCount = (testCasesMap[t.ticketNumber] || []).length || t.testCasesCount || 0;
                  const ticketHeader = testCaseHeadersMap[t.ticketNumber];
                  const reviewStatus: TestCaseReviewStatus = ticketHeader?.reviewStatus || t.reviewStatus || 'Draft';
                  return (
                    <tr
                      key={t.id}
                      onClick={() => handleOpenTestCasesScreen(t)}
                      className="hover:bg-blue-50/40 cursor-pointer transition-colors group"
                    >
                      {/* Ticket ID */}
                      <td className="p-2.5 border-r border-slate-100">
                        <span className="font-mono font-bold text-blue-700 bg-blue-50 group-hover:bg-blue-100 px-2 py-0.5 rounded border border-blue-200 inline-block">
                          #{t.ticketNumber}
                        </span>
                      </td>

                      {/* Feature Name */}
                      <td className="p-2.5 border-r border-slate-100">
                        <div className="font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                          {t.featureName}
                        </div>
                        {t.testingScenarios && (
                          <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                            {t.testingScenarios}
                          </div>
                        )}
                      </td>

                      {/* Module */}
                      <td className="p-2.5 border-r border-slate-100 font-medium text-slate-700">
                        <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[11px]">
                          {t.moduleName}
                        </span>
                      </td>

                      {/* QA Assignee */}
                      <td className="p-2.5 border-r border-slate-100 text-slate-700">
                        {t.qaAssignee}
                      </td>

                      {/* Developer */}
                      <td className="p-2.5 border-r border-slate-100 text-slate-600">
                        {t.developer}
                      </td>

                      {/* Priority */}
                      <td className="p-2.5 border-r border-slate-100 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            t.priority === 'Critical'
                              ? 'bg-red-100 text-red-800'
                              : t.priority === 'High'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {t.priority}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="p-2.5 border-r border-slate-100 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          {t.status}
                        </span>
                      </td>

                      {/* Test Cases Count */}
                      <td className="p-2.5 border-r border-slate-100 text-center">
                        <span
                          className={`px-2 py-0.5 rounded font-mono font-bold text-xs ${
                            casesCount > 0
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {casesCount} Cases
                        </span>
                      </td>

                      {/* Review Status Column */}
                      <td className="p-2.5 border-r border-slate-100 text-center">
                        {reviewStatus === 'Approved' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1">
                            <CheckCircle className="w-3 h-3 text-emerald-600" />
                            <span>Approved</span>
                          </span>
                        ) : reviewStatus === 'Review Pending' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-300 inline-flex items-center gap-1">
                            <Clock className="w-3 h-3 text-purple-600 animate-pulse" />
                            <span>In Review</span>
                          </span>
                        ) : reviewStatus === 'Changes Required' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 inline-flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            <span>Changes Req</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200 inline-flex items-center gap-1">
                            <Edit3 className="w-3 h-3 text-slate-400" />
                            <span>Draft</span>
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td
                        className="p-2 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenTestCasesScreen(t)}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                            title="Open Test Case Suite Workbench"
                          >
                            <span>Open</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>

                          {/* Submit for Review Direct Button */}
                          {casesCount > 0 && (reviewStatus === 'Draft' || reviewStatus === 'Changes Required') && (
                            <button
                              onClick={() => handleOpenSubmitModalForTicket(t)}
                              className="px-2.5 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded text-xs font-bold flex items-center gap-1 cursor-pointer transition-all shadow-2xs whitespace-nowrap"
                              title="Submit test cases for Senior QA Review"
                            >
                              <Send className="w-3 h-3" />
                              <span>Submit Review</span>
                            </button>
                          )}

                          {reviewStatus === 'Review Pending' && (
                            <span
                              className="px-2 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded text-[11px] font-semibold flex items-center gap-1 cursor-default"
                              title="Pending Senior QA Review Queue"
                            >
                              <Clock className="w-3 h-3 text-purple-600" />
                              <span>In Review</span>
                            </span>
                          )}

                          <button
                            onClick={() => handleAiGenerateFullSuite(t)}
                            title="Generate AI Test Suite for this ticket"
                            className="p-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded cursor-pointer transition-colors"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {/* NO ITEM EMPTY STATE */}
                {filteredTickets.length === 0 && (
                  <tr>
                    <td colSpan={10} className="p-14 text-center bg-slate-50/50">
                      <div className="flex flex-col items-center justify-center space-y-2.5">
                        <span className="px-4 py-1 bg-slate-100 text-slate-700 rounded-full font-bold text-xs tracking-wider uppercase border border-slate-200 shadow-2xs">
                          NO item
                        </span>
                        <p className="text-xs text-slate-500 max-w-sm">
                          No tickets found matching your search or filters. Click &quot;+ Add Ticket&quot; to create a new ticket or generate with AI.
                        </p>
                        <button
                          onClick={() => setIsAddTicketModalOpen(true)}
                          className="mt-1 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg cursor-pointer"
                        >
                          + Add Ticket
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Ticket Modal with Other Option */}
        {isAddTicketModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
                    <Plus className="w-4 h-4" />
                  </span>
                  <h2 className="text-base font-bold text-slate-900">Add New Azure DevOps Ticket</h2>
                </div>
                <button
                  onClick={() => setIsAddTicketModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateTicketSubmit} className="space-y-3.5 text-xs">
                {/* Dropdown to select Ticket ID created on this system to reuse in another module */}
                {systemTicketsList.length > 0 && (
                  <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                        <Copy className="w-3.5 h-3.5 text-blue-600" />
                        <span>Select Existing Ticket ID (Copy Headers across Modules)</span>
                      </label>
                      <span className="text-[10px] font-semibold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full border border-blue-200">
                        {systemTicketsList.length} tickets available
                      </span>
                    </div>
                    <select
                      value=""
                      onChange={(e) => handleSelectExistingTicket(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-blue-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="">-- Choose Ticket ID to copy headers --</option>
                      {systemTicketsList.map((st) => (
                        <option key={`hub-st-${st.id}-${st.ticketNumber}`} value={st.ticketNumber}>
                          #{st.ticketNumber} — {st.featureName} (Module: {st.moduleName || 'General'})
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-blue-700 leading-relaxed">
                      Selecting a ticket automatically fills Title, Priority, Developer, QA, and Scenario notes. Select your target module below to link it.
                    </p>
                  </div>
                )}

                {/* Header Auto-fetch Notification Banner */}
                {fetchedHeaderNotice && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded-lg text-[11px] text-emerald-900 font-semibold flex items-start gap-1.5 animate-fadeIn">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{fetchedHeaderNotice}</span>
                  </div>
                )}

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Ticket ID / Work Item Number *
                  </label>
                  <input
                    type="text"
                    required
                    list="hub-existing-tickets-datalist"
                    placeholder="e.g. 21655 or TL-B-20-00006"
                    value={newTicketNumber}
                    onChange={(e) => handleTicketNumberChange(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-900"
                  />
                  <datalist id="hub-existing-tickets-datalist">
                    {systemTicketsList.map((st) => (
                      <option key={`hub-dl-${st.ticketNumber}`} value={st.ticketNumber}>
                        {st.featureName} ({st.moduleName})
                      </option>
                    ))}
                  </datalist>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-slate-700 font-bold">
                      Feature / Task Name *
                    </label>
                    <button
                      type="button"
                      onClick={handleAiGenerateTicketModal}
                      disabled={isAiGeneratingTicket}
                      className="text-[11px] text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2 py-0.5 rounded font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Sparkles className="w-3 h-3 text-purple-600" />
                      <span>{isAiGeneratingTicket ? 'Generating...' : '✨ AI Polish & Details'}</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Penalty interest computation for Cash Credit"
                    value={newFeatureName}
                    onChange={(e) => setNewFeatureName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Module *</label>
                    <select
                      value={newModuleId}
                      onChange={(e) => {
                        setNewModuleId(e.target.value);
                        if (e.target.value !== 'other') {
                          setCustomModuleName('');
                        }
                      }}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                    >
                      {modules.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                      <option value="other">➕ Other (Custom Module)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Priority</label>
                    <select
                      value={newPriority}
                      onChange={(e) => setNewPriority(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="Critical">Critical</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>

                  {newModuleId === 'other' && (
                    <div className="col-span-2 bg-blue-50/60 p-2.5 rounded-lg border border-blue-200 animate-fadeIn">
                      <label className="block text-slate-800 font-bold mb-1 text-[11px]">
                        Specify Custom Module Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Collateral Management, Payment Gateway, Risk..."
                        value={customModuleName}
                        onChange={(e) => setCustomModuleName(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-blue-400 rounded text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Developer</label>
                    <input
                      type="text"
                      value={newDeveloper}
                      onChange={(e) => setNewDeveloper(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">QA Assignee</label>
                    <input
                      type="text"
                      value={newQaAssignee}
                      onChange={(e) => setNewQaAssignee(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Testing Scenarios / Acceptance Notes
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Enter key testing scenarios or leave for AI generation..."
                    value={newScenarioDetails}
                    onChange={(e) => setNewScenarioDetails(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAddTicketModalOpen(false)}
                    className="px-3.5 py-1.5 bg-slate-100 text-slate-700 font-bold rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg cursor-pointer shadow-xs"
                  >
                    Create Ticket
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Render Test Cases Screen for Selected Ticket
  return (
    <div className="p-6 max-w-[1500px] mx-auto space-y-5">
      {/* Top Breadcrumb Navigation */}
      <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-2xs">
        <button
          onClick={() => setHubMode('tickets-table')}
          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>← Back to Tickets List</span>
        </button>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 font-medium">Viewing Test Cases for:</span>
          <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
            Ticket #{header.ticketNo}
          </span>
          <span className="font-bold text-slate-800">{header.taskName}</span>
        </div>
      </div>

      {/* Top Header Card */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <span className="p-2 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">
            <Sparkles className="w-5 h-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                Test Case Suite • Ticket #{header.ticketNo}
              </h1>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                  header.reviewStatus === 'Approved'
                    ? 'bg-emerald-100 text-emerald-800'
                    : header.reviewStatus === 'Review Pending'
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {header.reviewStatus || 'Draft'}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800">
                v{header.version || '1.0'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Assigned QA: <strong>{header.taskDoneBy}</strong> • Senior QA: <strong>{header.signOffBy}</strong> • Module: <strong>{matchedTicket?.moduleName || 'Term Loan'}</strong>
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleAiGenerateFullSuite()}
            disabled={isAiGeneratingSuite || isApprovedAndReadOnly}
            className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold rounded-md flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
            <span>{isAiGeneratingSuite ? 'Generating...' : '✨ AI Generate Full Suite'}</span>
          </button>

          <button
            onClick={handleAddRow}
            disabled={isApprovedAndReadOnly}
            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold rounded-md flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Row</span>
          </button>

          <button
            onClick={handleDownloadExcel}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-md flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Excel</span>
          </button>

          <button
            onClick={() => setIsAdoModalOpen(true)}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-md flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Azure DevOps</span>
          </button>

          {isApprovedAndReadOnly ? (
            <button
              onClick={handleCreateNewRevision}
              className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-md flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>+ Create Revision (v{(parseFloat(header.version || '1.0') + 0.1).toFixed(1)})</span>
            </button>
          ) : header.reviewStatus === 'Review Pending' ? (
            <div className="flex items-center gap-1.5">
              <span className="px-3 py-1.5 bg-purple-50 text-purple-800 border border-purple-200 text-xs font-bold rounded-md flex items-center gap-1.5 shadow-2xs">
                <Clock className="w-3.5 h-3.5 text-purple-600 animate-pulse" />
                <span>Submitted for Review</span>
              </span>
              {onNavigateTab && (
                <button
                  onClick={() => onNavigateTab('review-queue')}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-md flex items-center gap-1 shadow-xs cursor-pointer whitespace-nowrap"
                  title="Open in Senior QA Review Queue"
                >
                  <span>Review Queue</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={handleOpenSubmitModalFromWorkbench}
              className="px-4 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold rounded-md flex items-center gap-1.5 shadow-sm cursor-pointer transition-all transform active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{header.reviewStatus === 'Changes Required' ? 'Resubmit for Review' : 'Submit for Test Case Review'}</span>
            </button>
          )}
        </div>
      </div>

      {/* COMMON MODULE HEADER */}
      <CommonHeader
        mode="qa"
        selectedTicketNumber={selectedTicketNumber}
        tickets={tickets}
        developerName={matchedTicket?.developer || header.developer || ''}
        qaAssigneeName={matchedTicket?.qaAssignee || header.taskDoneBy || 'Maseera Sayyed'}
        reviewDoneBy={header.reviewDoneBy || header.approvedBy}
        reviewDoneAt={header.reviewDoneAt || header.approvedAt}
        reviewStatus={header.reviewStatus}
        description={headerDescription}
        testingScenarios={headerTestingScenarios}
        attachedDocs={header.attachedDocs || []}
        onUpdateAttachedDocs={(docs) => {
          const next = { ...header, attachedDocs: docs };
          setHeader(next);
          onUpdateHeader?.(next);
        }}
        screenFields={header.screenFields || []}
        onUpdateScreenFields={(fields) => {
          const next = { ...header, screenFields: fields };
          setHeader(next);
          onUpdateHeader?.(next);
        }}
        onSelectTicket={(tNo) => {
          setSelectedTicketNumber(tNo);
          onSelectTicket?.(tNo);
          const found = tickets.find((t) => t.ticketNumber === tNo);
          if (found) {
            handleOpenTestCasesScreen(found);
          }
        }}
        onChangeDescription={(val) => {
          setHeaderDescription(val);
          setHeader((prev) => ({ ...prev, description: val }));
        }}
        onChangeTestingScenarios={(val) => {
          setHeaderTestingScenarios(val);
          setHeader((prev) => ({ ...prev, testingScenarios: val }));
        }}
        onGenerateAi={handleCommonHeaderGenerateAi}
        isGenerating={isAiGeneratingSuite}
        generateButtonText="✨ AI Auto-Generate Test Cases into Table"
        showGenerateButton={true}
      />

      {/* Dynamic Review Status Lifecycle Workflow Banner */}
      {header.reviewStatus === 'Approved' ? (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs text-emerald-950 animate-fadeIn shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg shrink-0">
              <CheckCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-bold text-sm text-emerald-950">Test Case Suite Approved & Certified</p>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-200 text-emerald-900">
                  Ready for Test Execution
                </span>
              </div>
              <p className="text-emerald-800 mt-0.5">
                Reviewed & Signed Off By: <strong>{header.reviewDoneBy || header.approvedBy || header.signOffBy || 'QA Lead'}</strong> • Approval Date: <strong>{header.reviewDoneAt || header.approvedAt || new Date().toLocaleDateString()}</strong> • Certified Version: <strong>v{header.approvedVersion || header.version || '1.0'}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={handleCreateNewRevision}
            className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg cursor-pointer flex items-center gap-1.5 shadow-2xs whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>+ Create New Revision (v{(parseFloat(header.version || '1.0') + 0.1).toFixed(1)})</span>
          </button>
        </div>
      ) : header.reviewStatus === 'Review Pending' ? (
        <div className="p-4 bg-purple-50 border border-purple-300 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs text-purple-950 animate-fadeIn shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-100 text-purple-700 rounded-lg shrink-0">
              <Clock className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-bold text-sm text-purple-950">Submitted for Test Case Review (Pending Sign-off)</p>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-200 text-purple-900">
                  In Senior QA Queue
                </span>
              </div>
              <p className="text-purple-800 mt-0.5">
                Submitted by <strong>{header.submittedBy || header.taskDoneBy}</strong> to <strong>{header.submittedTo || header.signOffBy || 'Senior QA'}</strong> on <strong>{header.submittedAt || 'Today'}</strong>. Suite contains <strong>{testCases.length} test cases</strong> awaiting formal QA evaluation.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onNavigateTab && (
              <button
                onClick={() => onNavigateTab('review-queue')}
                className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg cursor-pointer flex items-center gap-1.5 shadow-2xs whitespace-nowrap"
              >
                <span>Open Senior QA Review Queue</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={handleOpenSubmitModalFromWorkbench}
              className="px-3 py-1.5 bg-white hover:bg-purple-100 text-purple-700 border border-purple-300 font-semibold rounded-lg cursor-pointer flex items-center gap-1 whitespace-nowrap"
            >
              <Edit2 className="w-3 h-3" />
              <span>Edit Submission</span>
            </button>
          </div>
        </div>
      ) : header.reviewStatus === 'Changes Required' ? (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs text-amber-950 animate-fadeIn shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-100 text-amber-700 rounded-lg shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-bold text-sm text-amber-950">Changes Requested by Senior QA Reviewer</p>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900">
                  Needs Revision
                </span>
              </div>
              <p className="text-amber-800 mt-0.5">
                Senior QA requested updates for Ticket #{header.ticketNo}. Please review comments, update test cases in the table below, and click <strong>Resubmit for Review</strong>.
              </p>
            </div>
          </div>
          <button
            onClick={handleOpenSubmitModalFromWorkbench}
            className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg cursor-pointer flex items-center gap-1.5 shadow-xs whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Resubmit for Test Case Review</span>
          </button>
        </div>
      ) : (
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs text-slate-800 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-slate-900">
                Draft Test Suite • <span className="text-blue-700">{testCases.length} Test Cases</span> configured for Ticket #{header.ticketNo}
              </p>
              <p className="text-slate-500 mt-0.5">
                Generate or refine your test scenarios below. Once complete, submit this suite to Senior QA for formal review, sign-off, and release approval.
              </p>
            </div>
          </div>
          <button
            onClick={handleOpenSubmitModalFromWorkbench}
            className="px-4 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-lg cursor-pointer flex items-center gap-1.5 shadow-sm whitespace-nowrap shrink-0 transition-all transform active:scale-95"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Submit for Test Case Review</span>
          </button>
        </div>
      )}

      {/* Toast Notification with Action Link */}
      {notification && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center justify-between gap-3 animate-fadeIn shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="font-medium">{notification}</span>
          </div>
          {notificationAction && onNavigateTab && (
            <button
              onClick={() => onNavigateTab(notificationAction.tab)}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-md flex items-center gap-1 cursor-pointer shrink-0 transition-colors shadow-2xs"
            >
              <span>{notificationAction.label}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* SPREADSHEET TABLE: QA Test Cases */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto max-h-[580px]">
          <table className="w-full text-left text-xs border-collapse min-w-[1300px]">
            <thead className="bg-[#1E293B] text-slate-200 uppercase font-semibold text-[11px] tracking-wider sticky top-0 z-20 shadow-2xs">
              <tr>
                <th className="p-2.5 w-12 text-center border-r border-slate-700">#</th>

                <ColumnHeader
                  title="TestCase_ID"
                  columnKey="testCaseId"
                  sortKey={sortKey}
                  sortDirection={sortDirection}
                  onSort={(k, d) => {
                    setSortKey(k);
                    setSortDirection(d);
                  }}
                  filterValue={columnFilters.testCaseId}
                  onFilterChange={(k, v) => setColumnFilters((p) => ({ ...p, [k]: v }))}
                  className="w-28 border-r border-slate-700"
                />

                <ColumnHeader
                  title="Test Scenario"
                  columnKey="testScenario"
                  sortKey={sortKey}
                  sortDirection={sortDirection}
                  onSort={(k, d) => {
                    setSortKey(k);
                    setSortDirection(d);
                  }}
                  filterValue={columnFilters.testScenario}
                  onFilterChange={(k, v) => setColumnFilters((p) => ({ ...p, [k]: v }))}
                  className="min-w-[240px] border-r border-slate-700"
                />

                <ColumnHeader
                  title="Test Cases (Steps)"
                  columnKey="testCases"
                  sortKey={sortKey}
                  sortDirection={sortDirection}
                  onSort={(k, d) => {
                    setSortKey(k);
                    setSortDirection(d);
                  }}
                  filterValue={columnFilters.testCases}
                  onFilterChange={(k, v) => setColumnFilters((p) => ({ ...p, [k]: v }))}
                  className="min-w-[240px] border-r border-slate-700"
                />

                <ColumnHeader
                  title="Expected Result"
                  columnKey="expectedResult"
                  sortKey={sortKey}
                  sortDirection={sortDirection}
                  onSort={(k, d) => {
                    setSortKey(k);
                    setSortDirection(d);
                  }}
                  filterValue={columnFilters.expectedResult}
                  onFilterChange={(k, v) => setColumnFilters((p) => ({ ...p, [k]: v }))}
                  className="min-w-[220px] border-r border-slate-700"
                />

                <th className="p-2.5 min-w-[180px] border-r border-slate-700 font-semibold">
                  Validation / Negative Scenario
                </th>

                <th className="p-2.5 w-28 border-r border-slate-700 text-center font-semibold">
                  Status
                </th>

                <th className="p-2.5 w-48 border-r border-slate-700 font-semibold">Evidence</th>

                <th className="p-2.5 w-32 text-center font-semibold">Actions</th>
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
                      placeholder="Negative scenario..."
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
                      <div className="flex items-center justify-center gap-1">
                        {/* Edit Solution Modal Button from Image 3 */}
                        <button
                          onClick={() => setEditingSolutionCase(tc)}
                          title="AI Solution & Fields Generator Modal"
                          className="px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold rounded cursor-pointer hover:bg-blue-100 flex items-center gap-0.5"
                        >
                          <Edit3 className="w-2.5 h-2.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => {
                            const polished = polishTestCaseItem(tc);
                            const next = testCases.map((c) => (c.id === tc.id ? polished : c));
                            updateTestCases(next);
                            setNotification('✨ Polished test case grammar!');
                            setTimeout(() => setNotification(null), 3000);
                          }}
                          title="AI Polish row language"
                          className="px-1.5 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold rounded cursor-pointer hover:bg-purple-100"
                        >
                          Polish
                        </button>
                        <button
                          onClick={() => handleDuplicateRow(tc.id)}
                          title="Duplicate test case"
                          className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded cursor-pointer"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteRow(tc.id)}
                          title="Delete row"
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}

              {/* NO ITEM EMPTY STATE FOR TEST CASES */}
              {filteredTestCases.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-14 text-center bg-slate-50/50">
                    <div className="flex flex-col items-center justify-center space-y-2.5">
                      <span className="px-4 py-1 bg-slate-100 text-slate-700 rounded-full font-bold text-xs tracking-wider uppercase border border-slate-200 shadow-2xs">
                        NO item
                      </span>
                      <p className="text-xs text-slate-500 max-w-sm">
                        No test cases found for Ticket #{header.ticketNo}. Click below to auto-generate a full test suite with AI or insert a row.
                      </p>
                      <button
                        onClick={() => handleAiGenerateFullSuite()}
                        disabled={isAiGeneratingSuite || isApprovedAndReadOnly}
                        className="mt-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs rounded-lg shadow-sm flex items-center gap-2 cursor-pointer transition-all"
                      >
                        <Sparkles className="w-4 h-4 text-yellow-300" />
                        <span>{isAiGeneratingSuite ? 'Generating AI Cases...' : `✨ AI Auto-Generate Test Cases for #${header.ticketNo}`}</span>
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Bar */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            {!isApprovedAndReadOnly && isAssignedQaOrSuperAdmin && (
              <button
                onClick={handleAddRow}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold rounded shadow-2xs flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-blue-600" />
                <span>+ Insert Test Case Row</span>
              </button>
            )}

            {!isApprovedAndReadOnly && testCases.length > 0 && (
              <button
                onClick={handleOpenSubmitModalFromWorkbench}
                className="px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded shadow-2xs flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{header.reviewStatus === 'Changes Required' ? 'Resubmit for Review' : 'Submit for Test Case Review'}</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-4 text-slate-500 font-medium">
            <span>Total: <strong className="text-slate-800">{testCases.length}</strong></span>
            <span>Passed: <strong className="text-emerald-700">{testCases.filter((c) => c.status === 'pass').length}</strong></span>
            <span>Failed: <strong className="text-red-700">{testCases.filter((c) => c.status === 'fail').length}</strong></span>
            <span>Blocked: <strong className="text-amber-700">{testCases.filter((c) => c.status === 'blocked').length}</strong></span>
            <span>Version: <strong className="text-blue-700">v{header.version || '1.0'}</strong></span>
          </div>
        </div>
      </div>

      {/* TestCaseSolutionModal from Image 3 */}
      {editingSolutionCase && (
        <TestCaseSolutionModal
          isOpen={Boolean(editingSolutionCase)}
          onClose={() => setEditingSolutionCase(null)}
          testCase={editingSolutionCase}
          ticket={matchedTicket}
          onSave={(updatedFields) => {
            const next = testCases.map((c) =>
              c.id === editingSolutionCase.id ? { ...c, ...updatedFields } : c
            );
            updateTestCases(next);
            setEditingSolutionCase(null);
            setNotification('✨ Saved test case solution and fields!');
            setTimeout(() => setNotification(null), 3000);
          }}
        />
      )}

      {/* Comprehensive Submit for Test Case Review Modal */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden p-6 space-y-4 max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Submit Test Cases for Review</h2>
                  <p className="text-[11px] text-slate-500">Formal sign-off routing for Senior QA Review Queue</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsSubmitModalOpen(false);
                  setSubmittingTicket(null);
                }}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs overflow-y-auto pr-1">
              {/* Ticket Context Card */}
              {(() => {
                const target = submittingTicket || matchedTicket;
                const targetCases = testCasesMap[target?.ticketNumber || header.ticketNo] || (target?.ticketNumber === header.ticketNo ? testCases : []);
                return (
                  <div className="p-3.5 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border border-blue-200 rounded-xl space-y-2 text-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs text-blue-800 bg-blue-100 px-2.5 py-0.5 rounded border border-blue-200">
                        Ticket #{target?.ticketNumber || header.ticketNo}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-indigo-800 border border-indigo-200 shadow-2xs">
                        {targetCases.length} Test Cases Ready
                      </span>
                    </div>
                    <p className="font-bold text-slate-900 text-xs">
                      {target?.featureName || header.taskName}
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1 border-t border-blue-100">
                      <div>Module: <strong>{target?.moduleName || 'Term Loan'}</strong></div>
                      <div>Submitter: <strong>{currentUser?.name || header.taskDoneBy || 'QA'}</strong></div>
                      <div>Priority: <strong>{target?.priority || 'High'}</strong></div>
                      <div>Version: <strong>v{header.version || '1.0'}</strong></div>
                    </div>
                  </div>
                );
              })()}

              {/* Reviewer Selection */}
              <div>
                <label className="font-bold text-slate-800 block mb-1.5 flex items-center justify-between">
                  <span>Select Senior QA Reviewer *</span>
                  <span className="text-[11px] text-blue-600 font-normal">Will receive notification in review queue</span>
                </label>
                <div className="space-y-2">
                  <label
                    onClick={() => setSelectedReviewerEmail('maseerasayyed@quantumphinance.com')}
                    className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                      selectedReviewerEmail === 'maseerasayyed@quantumphinance.com'
                        ? 'bg-blue-50/70 border-blue-400 ring-1 ring-blue-400'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name="reviewerChoice"
                        checked={selectedReviewerEmail === 'maseerasayyed@quantumphinance.com'}
                        onChange={() => setSelectedReviewerEmail('maseerasayyed@quantumphinance.com')}
                        className="text-blue-600"
                      />
                      <div>
                        <div className="font-bold text-slate-900">Maseera Sayyed</div>
                        <div className="text-[11px] text-slate-500">Super Admin • maseerasayyed@quantumphinance.com</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
                      Super Admin
                    </span>
                  </label>

                  <label
                    onClick={() => setSelectedReviewerEmail('custom')}
                    className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                      selectedReviewerEmail === 'custom'
                        ? 'bg-blue-50/70 border-blue-400 ring-1 ring-blue-400'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name="reviewerChoice"
                        checked={selectedReviewerEmail === 'custom'}
                        onChange={() => setSelectedReviewerEmail('custom')}
                        className="text-blue-600"
                      />
                      <div>
                        <div className="font-bold text-slate-900">Custom Senior QA Reviewer</div>
                        <div className="text-[11px] text-slate-500">Specify external or alternate QA stakeholder</div>
                      </div>
                    </div>
                  </label>
                </div>

                {/* Custom Reviewer Input Fields */}
                {selectedReviewerEmail === 'custom' && (
                  <div className="grid grid-cols-2 gap-2 mt-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">Reviewer Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Sonal Sharma"
                        value={customReviewerName}
                        onChange={(e) => setCustomReviewerName(e.target.value)}
                        className="w-full p-1.5 bg-white border border-slate-300 rounded text-xs focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">Reviewer Email *</label>
                      <input
                        type="email"
                        placeholder="e.g. sonal@quantumphinance.com"
                        value={customReviewerEmail}
                        onChange={(e) => setCustomReviewerEmail(e.target.value)}
                        className="w-full p-1.5 bg-white border border-slate-300 rounded text-xs focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Pre-submission Quality Checklist */}
              <div>
                <label className="font-bold text-slate-800 block mb-1.5 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>QA Coverage & Quality Checklist</span>
                </label>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={submissionChecklist.positiveScenarios}
                      onChange={(e) => setSubmissionChecklist(p => ({ ...p, positiveScenarios: e.target.checked }))}
                      className="mt-0.5 text-blue-600 rounded"
                    />
                    <span className="text-slate-700">Positive and core functional workflows covered</span>
                  </label>

                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={submissionChecklist.negativeValidation}
                      onChange={(e) => setSubmissionChecklist(p => ({ ...p, negativeValidation: e.target.checked }))}
                      className="mt-0.5 text-blue-600 rounded"
                    />
                    <span className="text-slate-700">Negative validations, error messages, and boundary limits tested</span>
                  </label>

                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={submissionChecklist.boundaryCoverage}
                      onChange={(e) => setSubmissionChecklist(p => ({ ...p, boundaryCoverage: e.target.checked }))}
                      className="mt-0.5 text-blue-600 rounded"
                    />
                    <span className="text-slate-700">Test steps, pre-requisites, and expected outcomes clearly detailed</span>
                  </label>

                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={submissionChecklist.clearInputsOutputs}
                      onChange={(e) => setSubmissionChecklist(p => ({ ...p, clearInputsOutputs: e.target.checked }))}
                      className="mt-0.5 text-blue-600 rounded"
                    />
                    <span className="text-slate-700">Suite verified and ready for formal Senior QA sign-off</span>
                  </label>
                </div>
              </div>

              {/* Submission Notes */}
              <div>
                <label className="font-bold text-slate-800 block mb-1">
                  Submission Notes / Special Attention Areas (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Please verify repayment schedule formula, leap-year calculations, and moratorium penalty interest..."
                  value={submissionNotes}
                  onChange={(e) => setSubmissionNotes(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsSubmitModalOpen(false);
                  setSubmittingTicket(null);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmitForApproval}
                className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-lg cursor-pointer flex items-center gap-2 shadow-sm transition-all transform active:scale-95"
              >
                <Send className="w-4 h-4" />
                <span>🚀 Confirm & Submit to Reviewer</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Azure DevOps Modal */}
      {isAdoModalOpen && (
        <AzureDevopsModal
          isOpen={isAdoModalOpen}
          onClose={() => setIsAdoModalOpen(false)}
          ticketNo={header.ticketNo}
          ticketName={header.taskName}
          itemCount={testCases.length}
          itemType="Test Cases"
          onGenerateExcelBlob={async () => {
            const { getTestCasesExcelBlob } = await import('../utils/excelExport');
            return getTestCasesExcelBlob(
              header,
              testCases
            );
          }}
          onSuccess={(notif) => {
            setNotification(notif);
            setTimeout(() => setNotification(null), 5000);
          }}
        />
      )}
    </div>
  );
};
