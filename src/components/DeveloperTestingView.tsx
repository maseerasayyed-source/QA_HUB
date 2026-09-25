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
  ArrowLeft,
  ChevronRight,
  Filter,
  Edit3,
  CloudDownload,
  Languages,
} from 'lucide-react';
import {
  DeveloperTestHeaderMeta,
  DeveloperTestItem,
  TicketSummary,
  FileAttachment,
  UserProfile,
  AttachedDocOrImage,
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
import { TicketLockedModal } from './common/TicketLockedModal';
import { getAllCreatedTicketsOnSystem } from '../data/dbStore';
import {
  generateDevTestingFromPoint,
  generateDevTestingFromTicket,
  generateTicketDetailsWithAi,
  generateScenariosFromInputsAndFiles,
  checkIsDuplicate,
} from '../utils/aiGenerator';
import { fetchWorkItemFromAzure } from '../utils/azureDevopsService';
import { translateToSimpleEnglish } from '../utils/languageAi';
import { canUserOpenTicket, isUserTicketCreator, isTicketInDraft } from '../utils/ticketPermissions';

interface DeveloperTestingViewProps {
  tickets?: TicketSummary[];
  modules?: { id: string; name: string }[];
  currentUser?: UserProfile;
  devTestingMap?: Record<string, DeveloperTestItem[]>;
  devTestingHeadersMap?: Record<string, DeveloperTestHeaderMeta>;
  activeTicketNumber?: string;
  onSelectTicket?: (ticketNo: string) => void;
  onUpdateDevTestingMap?: (
    ticketNo: string,
    items: DeveloperTestItem[],
    header?: DeveloperTestHeaderMeta
  ) => void;
  onAddTicket?: (ticket: TicketSummary) => void;
  onSaveAndSubmitTicket?: (ticketNo: string) => void;
  onReopenEditTicket?: (ticketNo: string) => void;
  onDeleteTicket?: (ticketNumber: string, mode: 'all_modules' | 'tickets_tab_only') => void;
}

export const DeveloperTestingView: React.FC<DeveloperTestingViewProps> = ({
  tickets = [],
  modules = [
    { id: 'term loan', name: 'Term Loan' },
    { id: 'working capital', name: 'Working Capital' },
    { id: 'cash credit', name: 'Cash Credit' },
    { id: 'bank guarantee', name: 'Bank Guarantee' },
    { id: 'trade finance', name: 'Trade Finance' },
    { id: 'treasury', name: 'Treasury & FX' },
  ],
  currentUser,
  devTestingMap = {},
  devTestingHeadersMap = {},
  activeTicketNumber,
  onSelectTicket,
  onUpdateDevTestingMap,
  onAddTicket,
  onSaveAndSubmitTicket,
  onReopenEditTicket,
  onDeleteTicket,
}) => {
  // Hub Navigation Mode: 'tickets-table' (Tickets List) vs 'dev-testing-screen' (Detail Screen)
  const [hubMode, setHubMode] = useState<'tickets-table' | 'dev-testing-screen'>('tickets-table');

  // Selected Active Ticket
  const defaultTicketNo = activeTicketNumber || (tickets[0]?.ticketNumber) || INITIAL_DEV_TEST_HEADER.ticketNo;
  const [selectedTicketNo, setSelectedTicketNo] = useState<string>(defaultTicketNo);

  // Tickets List Filters
  const [ticketSearch, setTicketSearch] = useState<string>('');
  const [ticketModuleFilter, setTicketModuleFilter] = useState<string>('all');
  const [ticketStatusFilter, setTicketStatusFilter] = useState<string>('all');

  // Match current ticket
  const currentTicket = useMemo(() => {
    return (
      tickets.find((t) => t.ticketNumber.toLowerCase() === selectedTicketNo.toLowerCase()) ||
      tickets[0]
    );
  }, [tickets, selectedTicketNo]);

  // Locked Draft Ticket Modal State
  const [lockedModalTicket, setLockedModalTicket] = useState<{
    ticketNumber: string;
    createdBy: string;
    reason: string;
  } | null>(null);

  // Access control check for currently selected ticket
  const currentTicketPerms = useMemo(() => {
    return canUserOpenTicket(currentTicket, currentUser, 'dev');
  }, [currentTicket, currentUser]);

  const isTicketCreator = useMemo(() => {
    return isUserTicketCreator(currentTicket, currentUser);
  }, [currentTicket, currentUser]);

  const effectiveReadOnly = currentTicketPerms.isReadOnly;

  // Header Meta State
  const [header, setHeader] = useState<DeveloperTestHeaderMeta>(() => {
    if (devTestingHeadersMap[selectedTicketNo]) {
      return devTestingHeadersMap[selectedTicketNo];
    }
    return {
      ticketNo: currentTicket?.ticketNumber || defaultTicketNo,
      featureName: currentTicket?.featureName || (INITIAL_DEV_TEST_HEADER as any).ticketName || 'Feature Verification',
      developer: currentTicket?.developer || currentUser?.name || '',
      devTestDate: new Date().toISOString().split('T')[0],
      dealId: currentTicket?.dealId || `DEAL-${selectedTicketNo}`,
      description: currentTicket?.description || currentTicket?.featureName || '',
      testingScenarios: currentTicket?.testingScenarios || currentTicket?.scenarioDetails || '',
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
      developerName: currentTicket?.developer || currentUser?.name || '',
      testingPoint: item.scenario || 'Verify that changing the Index Rate updates the Effective Rate.',
      expectedResult: item.expectedResult,
      submissionState: 'Draft',
    }));
  });

  // Add Ticket Modal State with Custom Module option
  const [isAddTicketModalOpen, setIsAddTicketModalOpen] = useState<boolean>(false);
  const [newTicketNumber, setNewTicketNumber] = useState<string>('');
  const [newFeatureName, setNewFeatureName] = useState<string>('');
  const [newModuleId, setNewModuleId] = useState<string>('term loan');
  const [customModuleName, setCustomModuleName] = useState<string>('');
  const [newPriority, setNewPriority] = useState<'Critical' | 'High' | 'Medium' | 'Low'>('High');
  const [newDeveloper, setNewDeveloper] = useState<string>(currentUser?.name || '');
  const [newQaAssignee, setNewQaAssignee] = useState<string>('Maseera Sayyed');
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

  // One-line input for instant AI generation
  const [singlePointInput, setSinglePointInput] = useState<string>('');
  const [isGeneratingAiPoint, setIsGeneratingAiPoint] = useState<boolean>(false);
  const [isGeneratingAiScenarios, setIsGeneratingAiScenarios] = useState<boolean>(false);

  // UI state
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);
  const [globalSearch, setGlobalSearch] = useState<string>('');
  const [isAdoModalOpen, setIsAdoModalOpen] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [isFetchingFromAdo, setIsFetchingFromAdo] = useState<boolean>(false);

  // Delete Ticket Modal State
  const [ticketToDelete, setTicketToDelete] = useState<{ ticketNumber: string; taskName?: string } | null>(null);
  const [deleteMode, setDeleteMode] = useState<'all_modules' | 'tickets_tab_only'>('all_modules');

  // Single Item Delete Modal State
  const [itemToDelete, setItemToDelete] = useState<DeveloperTestItem | null>(null);

  // Azure Direct Fetching in Modal State
  const [isFetchingAzureModal, setIsFetchingAzureModal] = useState<boolean>(false);

  const handleDirectAzureFetchInModal = async () => {
    const rawInput = newTicketNumber.trim();
    if (!rawInput) {
      alert('Please enter an Azure DevOps Work Item / Ticket ID first.');
      return;
    }
    const cleanId = rawInput.replace('#', '').trim();
    setIsFetchingAzureModal(true);
    try {
      const { fetchWorkItemFromAzure } = await import('../utils/azureDevopsService');
      const azureData = await fetchWorkItemFromAzure(cleanId);
      if (azureData) {
        if (azureData.title) setNewFeatureName(azureData.title);
        if (azureData.assignedTo) {
          setNewDeveloper(azureData.assignedTo);
          setNewQaAssignee(azureData.assignedTo);
        }
        if (azureData.priority) setNewPriority(azureData.priority as any);
        if (azureData.description || azureData.acceptanceCriteria) {
          const combined = [azureData.description, azureData.acceptanceCriteria].filter(Boolean).join('\n\n');
          setNewScenarioDetails(combined);
        }
        setFetchedHeaderNotice(
          `☁️ Successfully fetched Work Item #${cleanId} directly from Azure DevOps!`
        );
      } else {
        alert(`No work item details returned for Azure ID #${cleanId}. Check connection settings.`);
      }
    } catch (err: any) {
      alert(`Could not fetch from Azure DevOps: ${err?.message || 'Server error'}`);
    } finally {
      setIsFetchingAzureModal(false);
    }
  };

  const [translatingPointId, setTranslatingPointId] = useState<string | null>(null);

  const handleTranslateTestingPoint = async (id: string, text: string) => {
    if (!text || !text.trim()) return;
    setTranslatingPointId(id);
    try {
      setNotification('Translating testing point to understandable English...');
      const converted = await translateToSimpleEnglish(text, 'test-point');
      if (converted) {
        handleCellChange(id, 'testingPoint', converted);
        handleCellChange(id, 'scenario', converted);
        setNotification('✨ Testing point converted to simple, understandable English!');
        setTimeout(() => setNotification(null), 3000);
      }
    } catch (e) {
      console.error(e);
      setNotification('Could not translate text.');
      setTimeout(() => setNotification(null), 3000);
    } finally {
      setTranslatingPointId(null);
    }
  };

  const confirmDeleteItem = () => {
    if (!itemToDelete) return;
    const remaining = items.filter((i) => i.id !== itemToDelete.id);
    setItems(remaining);
    saveStateToStore(remaining, header);
    setItemToDelete(null);
    setNotification('🗑️ Developer testing point deleted successfully.');
    setTimeout(() => setNotification(null), 3000);
  };

  const confirmDeleteTicket = () => {
    if (!ticketToDelete) return;
    const deletedNo = ticketToDelete.ticketNumber;
    if (onDeleteTicket) {
      onDeleteTicket(deletedNo, deleteMode);
    }
    const cleanDeleted = deletedNo.trim().replace(/^#+/, '').toLowerCase();
    const cleanSel = selectedTicketNo.trim().replace(/^#+/, '').toLowerCase();
    if (cleanSel === cleanDeleted) {
      const remaining = tickets.filter(
        (t) => (t.ticketNumber || '').trim().replace(/^#+/, '').toLowerCase() !== cleanDeleted
      );
      if (remaining.length > 0) {
        const nextNo = remaining[0].ticketNumber.replace(/^#+/, '');
        setSelectedTicketNo(nextNo);
        const nextItems = devTestingMap[nextNo] || [];
        setItems(nextItems);
      } else {
        setSelectedTicketNo('');
        setItems([]);
      }
    }
    setNotification(`🗑️ Ticket #${deletedNo} deleted (${deleteMode === 'all_modules' ? 'Every Module' : 'Tickets Tab Only'}).`);
    setTimeout(() => setNotification(null), 4000);
    setTicketToDelete(null);
  };

  // Sorting & Filtering in table
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({
    dealId: '',
    developerName: '',
    testingPoint: '',
    expectedResult: '',
    submissionState: '',
  });

  // Sync when activeTicketNumber changes from outside
  useEffect(() => {
    if (activeTicketNumber && activeTicketNumber !== selectedTicketNo) {
      handleTicketChange(activeTicketNumber);
    }
  }, [activeTicketNumber]);

  // Sync ticket change to state
  const handleTicketChange = (tNo: string) => {
    setSelectedTicketNo(tNo);
    onSelectTicket?.(tNo);
    const found = tickets.find((t) => t.ticketNumber.toLowerCase() === tNo.toLowerCase());
    const existingHeader = devTestingHeadersMap[tNo];
    const existingItems = devTestingMap[tNo];
    const ticketDev = found?.developer?.trim() || existingHeader?.developer || currentUser?.name || '';

    let newH: DeveloperTestHeaderMeta;
    if (existingHeader) {
      newH = {
        ...existingHeader,
        developer: found?.developer?.trim() || existingHeader.developer || ticketDev,
        dealId: existingHeader.dealId || found?.dealId || `DEAL-${tNo}`,
        attachedDocs: existingHeader.attachedDocs?.length ? existingHeader.attachedDocs : (found?.attachedDocs || []),
        screenFields: existingHeader.screenFields?.length ? existingHeader.screenFields : (found?.screenFields || found?.detectedFormFields || []),
      };
    } else {
      newH = {
        ticketNo: tNo,
        featureName: found?.featureName || 'Feature Verification',
        developer: ticketDev,
        devTestDate: new Date().toISOString().split('T')[0],
        dealId: found?.dealId || `DEAL-${tNo}`,
        description: found?.description || found?.featureName || '',
        testingScenarios: found?.testingScenarios || found?.scenarioDetails || '',
        status: 'Draft',
        attachedDocs: found?.attachedDocs || [],
        screenFields: found?.screenFields || found?.detectedFormFields || [],
      };
    }
    setHeader(newH);

    if (existingItems && existingItems.length > 0) {
      // Synchronize developer name across all existing items for this ticket
      const syncedItems = existingItems.map((item) => ({
        ...item,
        developerName: item.developerName || ticketDev,
        dealId: item.dealId || newH.dealId || `DEAL-${tNo}`,
      }));
      setItems(syncedItems);
    } else {
      setItems([]);
    }
  };

  // Sync updates back to store/parent
  const saveStateToStore = (newItems: DeveloperTestItem[], newHeader: DeveloperTestHeaderMeta) => {
    setItems(newItems);
    setHeader(newHeader);
    onUpdateDevTestingMap?.(newHeader.ticketNo, newItems, newHeader);
  };

  // Switch to Detail Screen for ticket
  const handleOpenDevTestingScreen = (ticket: TicketSummary) => {
    const perm = canUserOpenTicket(ticket, currentUser, 'dev');
    if (!perm.allowed) {
      setLockedModalTicket({
        ticketNumber: ticket.ticketNumber,
        createdBy: ticket.createdBy || 'Creator',
        reason:
          perm.reason ||
          `Ticket #${ticket.ticketNumber} is currently in Draft / Edit mode by "${ticket.createdBy || 'Creator'}". Other users cannot open its developer testing points until the creator clicks 'Save & Submit'.`,
      });
      return;
    }
    handleTicketChange(ticket.ticketNumber);
    setHubMode('dev-testing-screen');
  };

  // 1. One-Line Input AI Generation Action with duplicate check
  const handleAiGenerateSinglePoint = async () => {
    if (!singlePointInput.trim()) {
      setNotification('Please enter a testing point first.');
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    const inputClean = singlePointInput.trim();

    // Duplicate Check
    const dupCheck = checkIsDuplicate(inputClean, items);
    if (dupCheck.isDup) {
      setNotification(`⚠️ Duplicate detected: This scenario is already covered in ${dupCheck.matchedWith}! Duplicate row was prevented.`);
      setTimeout(() => setNotification(null), 5000);
      return;
    }

    setIsGeneratingAiPoint(true);
    let resolvedPoint: any = null;

    try {
      const resp = await fetch('/api/ai/generate-dev-scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketNo: header.ticketNo || selectedTicketNo,
          clientName: header.clientName || 'Treasury Master',
          moduleName: currentTicket?.moduleName || 'Term Loan',
          developerName: header.developer || currentUser?.name || 'Developer',
          dealId: header.dealId || `DEAL-${header.ticketNo}`,
          description: inputClean,
          testingScenarios: inputClean,
          screenFields: header.screenFields || [],
          attachedDocs: (header.attachedDocs || []).map((doc) => ({
            id: doc.id,
            name: doc.name,
            type: doc.type,
            url: doc.url || doc.dataUrl,
            dataUrl: doc.dataUrl || doc.url,
            detectedFields: doc.detectedFields || [],
            extractedContent: doc.extractedContent || '',
          })),
          count: 1,
        }),
      });

      if (resp.ok) {
        const data = await resp.json();
        if (data.success && Array.isArray(data.points) && data.points.length > 0) {
          resolvedPoint = data.points[0];
        }
      }
    } catch (err) {
      console.warn('API single point generator failed, using local domain generator:', err);
    }

    // Fallback to enhanced local banking domain generator
    if (!resolvedPoint) {
      resolvedPoint = generateDevTestingFromPoint(
        inputClean,
        header.ticketNo,
        header.dealId || `DEAL-${header.ticketNo}`,
        header.developer || currentUser?.name || 'Developer'
      );
    }

    const nextNum = items.length + 1;
    const newItem: DeveloperTestItem = {
      id: `dt-${Date.now()}`,
      scenarioId: `DEV-0${nextNum}`,
      dealId: resolvedPoint.dealId || header.dealId || `DEAL-${header.ticketNo}`,
      developerName: resolvedPoint.developerName || header.developer || currentUser?.name || 'Developer',
      testingPoint: resolvedPoint.testingPoint || inputClean,
      scenario: resolvedPoint.scenario || `Scenario: ${resolvedPoint.testingPoint || inputClean}`,
      testDescription: resolvedPoint.testCase || resolvedPoint.testDescription || `Developer verification: ${resolvedPoint.testingPoint || inputClean}`,
      testData: resolvedPoint.testData || `Deal ID: ${header.dealId || `DEAL-${header.ticketNo}`}, Mode: Active verification`,
      expectedResult: resolvedPoint.expectedResult || `System executes ${inputClean} smoothly, maintaining audit logs and formula precision.`,
      actualResult: resolvedPoint.actualResult || 'Verified successfully in local build: functioning as per specification (Pass).',
      status: 'Passed',
      submissionState: 'Draft',
      remarks: 'AI-generated test scenario & expected result',
      isAiGenerated: true,
      attachments: [],
      createdBy: currentUser?.name || 'Developer',
      authorRole: currentUser?.role || 'Developer',
      createdAt: new Date().toLocaleDateString(),
    };

    const updated = [...items, newItem];
    saveStateToStore(updated, header);
    setSinglePointInput('');
    setIsGeneratingAiPoint(false);
    setNotification('✨ AI Generated complete Test Scenario, Test Case, Expected Result & (Pass) Actual Result!');
    setTimeout(() => setNotification(null), 5000);
  };

  // 1b. Multi-Scenario AI Generation using Description, Testing Scenarios & Attached Files / Screen Fields
  const handleAiGenerateMultiScenarios = async () => {
    setIsGeneratingAiScenarios(true);
    try {
      const resp = await fetch('/api/ai/generate-dev-scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketNo: header.ticketNo || selectedTicketNo,
          clientName: header.clientName || 'Treasury Master',
          moduleName: currentTicket?.moduleName || 'Term Loan',
          developerName: header.developer || currentTicket?.developer || currentUser?.name || 'Developer',
          dealId: header.dealId || `DEAL-${header.ticketNo}`,
          description: header.description || currentTicket?.description || '',
          testingScenarios: header.testingScenarios || currentTicket?.testingScenarios || '',
          screenFields: header.screenFields || [],
          attachedDocs: (header.attachedDocs || []).map((doc) => ({
            id: doc.id,
            name: doc.name,
            type: doc.type,
            url: doc.url || doc.dataUrl,
            dataUrl: doc.dataUrl || doc.url,
            detectedFields: doc.detectedFields || [],
            extractedContent: doc.extractedContent || '',
          })),
          count: 8,
        }),
      });

      if (resp.ok) {
        const data = await resp.json();
        if (data.success && Array.isArray(data.points) && data.points.length > 0) {
          const startingIndex = items.length + 1;
          const mappedItems: DeveloperTestItem[] = data.points.map((pt: any, idx: number) => ({
            id: `dt-${Date.now()}-${idx}`,
            scenarioId: `DEV-0${startingIndex + idx}`,
            dealId: pt.dealId || header.dealId || `DEAL-${header.ticketNo}`,
            developerName: pt.developerName || header.developer || 'Developer',
            testingPoint: pt.testingPoint || '',
            scenario: pt.testingPoint || '',
            testDescription: pt.testingPoint || '',
            expectedResult: pt.expectedResult || '',
            testData: pt.testData || '',
            actualResult: pt.actualResult || 'Verified successfully in local build.',
            status: pt.status || 'Passed',
            submissionState: 'Draft',
            bugFound: 'No',
            severity: 'Low',
            date: new Date().toISOString().split('T')[0],
            isAiGenerated: true,
            attachments: [],
          }));

          const updated = [...items, ...mappedItems];
          saveStateToStore(updated, header);
          setIsGeneratingAiScenarios(false);
          const ssCount = (header.attachedDocs || []).filter((d) => d.type === 'image').length;
          setNotification(
            `🚀 AI intelligently generated ${mappedItems.length} Developer Testing Points from Description${
              ssCount > 0 ? ` & ${ssCount} Attached Screenshot(s)` : ''
            } into table!`
          );
          setTimeout(() => setNotification(null), 5000);
          return;
        }
      }
    } catch (err) {
      console.warn('Backend AI scenario generator failed, falling back to local generator:', err);
    }

    // Local fallback
    const result = generateScenariosFromInputsAndFiles({
      ticket: currentTicket,
      description: header.description || currentTicket?.description || '',
      testingScenarios: header.testingScenarios || currentTicket?.testingScenarios || '',
      attachedDocs: header.attachedDocs || [],
      screenFields: header.screenFields || [],
      targetMode: 'developer',
      existingItems: items,
      creatorName: currentUser?.name || header.developer || 'Developer',
      creatorRole: currentUser?.role || 'Developer',
    });

    if (result.newItems.length === 0 && result.skippedDuplicates.length > 0) {
      setNotification(
        `⚠️ All ${result.skippedDuplicates.length} candidate scenarios are already covered in the table! Duplicate rows were prevented.`
      );
      setTimeout(() => setNotification(null), 5000);
      setIsGeneratingAiScenarios(false);
      return;
    }

    if (result.newItems.length === 0) {
      setNotification('Please enter a description, testing scenarios, or attach a screenshot/fields to generate points.');
      setTimeout(() => setNotification(null), 4000);
      setIsGeneratingAiScenarios(false);
      return;
    }

    const updated = [...items, ...result.newItems];
    saveStateToStore(updated, header);
    setIsGeneratingAiScenarios(false);

    const dupText =
      result.skippedDuplicates.length > 0
        ? ` (${result.skippedDuplicates.length} duplicate scenarios already covered were skipped)`
        : '';
    setNotification(`🚀 Generated & added ${result.newItems.length} Developer Testing Points into table!${dupText}`);
    setTimeout(() => setNotification(null), 5000);
  };

  // 2. Generate Developer Testing from Azure DevOps / Ticket Info
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

    setNotification(`🚀 Generated ${generatedItems.length} Developer Testing Points for Ticket #${header.ticketNo}!`);
    setTimeout(() => setNotification(null), 4000);
  };

  // 3. Quick AI generate points for specific ticket from tickets list
  const handleQuickAiGenerateForTicket = (ticket: TicketSummary) => {
    const generated = generateDevTestingFromTicket(ticket);
    const existing = devTestingMap[ticket.ticketNumber] || [];
    const merged = [...existing, ...generated];
    const ticketHeader: DeveloperTestHeaderMeta = devTestingHeadersMap[ticket.ticketNumber] || {
      ticketNo: ticket.ticketNumber,
      featureName: ticket.featureName,
      developer: ticket.developer || '',
      devTestDate: new Date().toISOString().split('T')[0],
      dealId: ticket.dealId || `DEAL-${ticket.ticketNumber}`,
      description: ticket.description || ticket.featureName,
      testingScenarios: ticket.testingScenarios || '',
      status: 'Draft',
    };
    onUpdateDevTestingMap?.(ticket.ticketNumber, merged, ticketHeader);
    if (selectedTicketNo.toLowerCase() === ticket.ticketNumber.toLowerCase()) {
      setItems(merged);
      setHeader(ticketHeader);
    }
    setNotification(`✨ Auto-generated ${generated.length} Dev Testing Points for Ticket #${ticket.ticketNumber}!`);
    setTimeout(() => setNotification(null), 4000);
  };

  // 4. Bulk AI generate dev testing points for tickets with 0 points
  const handleBulkAiGenerateDevPoints = () => {
    let generatedCount = 0;
    tickets.forEach((t) => {
      const existing = devTestingMap[t.ticketNumber] || [];
      if (existing.length === 0) {
        const generated = generateDevTestingFromTicket(t);
        const ticketHeader: DeveloperTestHeaderMeta = devTestingHeadersMap[t.ticketNumber] || {
          ticketNo: t.ticketNumber,
          featureName: t.featureName,
          developer: t.developer || '',
          devTestDate: new Date().toISOString().split('T')[0],
          dealId: t.dealId || `DEAL-${t.ticketNumber}`,
          description: t.description || t.featureName,
          testingScenarios: t.testingScenarios || '',
          status: 'Draft',
        };
        onUpdateDevTestingMap?.(t.ticketNumber, generated, ticketHeader);
        if (selectedTicketNo.toLowerCase() === t.ticketNumber.toLowerCase()) {
          setItems(generated);
          setHeader(ticketHeader);
        }
        generatedCount += generated.length;
      }
    });

    setNotification(`✨ Bulk auto-generated developer testing points across all empty tickets!`);
    setTimeout(() => setNotification(null), 4000);
  };

  // Cell Edit
  const handleCellChange = (id: string, field: keyof DeveloperTestItem, value: any) => {
    let newHeader = header;
    let updated = items.map((item) => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    });

    // If developerName is edited, sync across all rows and ticket header!
    if (field === 'developerName') {
      newHeader = { ...header, developer: value };
      updated = updated.map((item) => ({
        ...item,
        developerName: value,
      }));
    }

    saveStateToStore(updated, newHeader);
  };

  // Add Row
  const handleAddRow = () => {
    const nextNum = items.length + 1;
    const newItem: DeveloperTestItem = {
      id: `dt-${Date.now()}`,
      scenarioId: `DEV-0${nextNum}`,
      dealId: header.dealId || `DEAL-${header.ticketNo}`,
      developerName: header.developer || currentTicket?.developer || currentUser?.name || 'Developer',
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
      createdBy: currentUser?.name || 'Developer',
      authorRole: currentUser?.role || 'Developer',
      createdAt: new Date().toLocaleDateString(),
    };
    saveStateToStore([...items, newItem], header);
  };

  // Duplicate Row
  const handleDuplicateRow = (id: string) => {
    const target = items.find((i) => i.id === id);
    if (!target) return;
    const nextNum = items.length + 1;
    const duplicated: DeveloperTestItem = {
      ...target,
      id: `dt-${Date.now()}`,
      scenarioId: `DEV-0${nextNum}`,
      testingPoint: `${target.testingPoint} (Copy)`,
      createdBy: currentUser?.name || 'Developer',
      authorRole: currentUser?.role || 'Developer',
      createdAt: new Date().toLocaleDateString(),
    };
    saveStateToStore([...items, duplicated], header);
  };

  // Delete Row with custom confirmation modal
  const handleDeleteRow = (id: string) => {
    const target = items.find((i) => i.id === id);
    if (!target) return;
    setItemToDelete(target);
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

  // Save Draft vs Submit Developer Testing
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
    const devName = currentUser?.name || header.developer || 'Developer';
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
    onSaveAndSubmitTicket?.(header.ticketNo);
    setNotification(`🚀 Developer Testing submitted by ${devName}! Team members can now view in Read-Only mode.`);
    setTimeout(() => setNotification(null), 5000);
  };

  const handleReopenDeveloperTesting = () => {
    onReopenEditTicket?.(header.ticketNo);
    const newHeader: DeveloperTestHeaderMeta = {
      ...header,
      status: 'Draft',
    };
    const updatedItems = items.map((item) => ({
      ...item,
      submissionState: 'Draft' as const,
    }));
    saveStateToStore(updatedItems, newHeader);
    setNotification(`✏️ Ticket #${header.ticketNo} reopened for editing! Only you can edit until submitted.`);
    setTimeout(() => setNotification(null), 5000);
  };

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

  // Sort & Filter logic in Detail Screen
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

  // Filtered Tickets for Tickets List Table
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      if (ticketSearch.trim()) {
        const q = ticketSearch.toLowerCase();
        const matches =
          t.ticketNumber.toLowerCase().includes(q) ||
          t.featureName.toLowerCase().includes(q) ||
          t.moduleName.toLowerCase().includes(q) ||
          t.qaAssignee.toLowerCase().includes(q) ||
          t.developer.toLowerCase().includes(q) ||
          (t.scenarioDetails || '').toLowerCase().includes(q) ||
          (t.testingScenarios || '').toLowerCase().includes(q);
        if (!matches) return false;
      }

      if (ticketModuleFilter !== 'all') {
        const tMod = t.moduleName.toLowerCase();
        const fMod = ticketModuleFilter.toLowerCase();
        if (!tMod.includes(fMod) && !fMod.includes(tMod)) return false;
      }

      if (ticketStatusFilter !== 'all') {
        if (t.status !== ticketStatusFilter) return false;
      }

      return true;
    });
  }, [tickets, ticketSearch, ticketModuleFilter, ticketStatusFilter]);

  // Add Ticket Submit Handler (with Custom Module support)
  const handleCreateTicketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicketNumber.trim() || !newFeatureName.trim()) {
      alert('Please enter Ticket ID and Feature Name.');
      return;
    }

    const effectiveModuleName =
      newModuleId === 'other'
        ? customModuleName.trim() || 'Custom Module'
        : modules.find((m) => m.id === newModuleId)?.name || 'Term Loan';

    const matchedExisting = systemTicketsList.find(
      (t) => t.ticketNumber.trim().toLowerCase().replace('#', '') === newTicketNumber.trim().toLowerCase().replace('#', '')
    );

    const newTicket: TicketSummary = {
      id: `ticket-${Date.now()}`,
      ticketNumber: newTicketNumber.trim().replace('#', ''),
      featureName: newFeatureName.trim(),
      moduleId: newModuleId === 'other' ? 'custom' : newModuleId,
      moduleName: effectiveModuleName,
      developer: newDeveloper.trim() || (matchedExisting?.developer || currentUser?.name || ''),
      qaAssignee: newQaAssignee.trim() || (matchedExisting?.qaAssignee || 'Maseera Sayyed'),
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
      description: matchedExisting?.description || `Developer testing ticket #${newTicketNumber.trim()} in ${effectiveModuleName}`,
    };

    onAddTicket?.(newTicket);
    handleOpenDevTestingScreen(newTicket);
    setIsAddTicketModalOpen(false);
    setFetchedHeaderNotice(null);

    // Reset fields
    setNewTicketNumber('');
    setNewFeatureName('');
    setCustomModuleName('');
    setNewScenarioDetails('');
    setNotification(`✅ Ticket #${newTicket.ticketNumber} added successfully!`);
    setTimeout(() => setNotification(null), 4000);
  };

  // AI Polish & Details for Add Ticket Modal
  const handleAiGenerateTicketModal = () => {
    if (!newFeatureName.trim()) {
      alert('Please enter a brief Feature / Task Name first.');
      return;
    }
    setIsAiGeneratingTicket(true);
    setTimeout(() => {
      const selectedModName =
        newModuleId === 'other'
          ? customModuleName.trim() || 'Financial Module'
          : modules.find((m) => m.id === newModuleId)?.name || 'Term Loan';

      const generated = generateTicketDetailsWithAi(newFeatureName, selectedModName);
      if (generated.suggestedTitle) {
        setNewFeatureName(generated.suggestedTitle);
      }
      setNewScenarioDetails(generated.testingScenarios);
      setNewPriority(generated.priority);
      setIsAiGeneratingTicket(false);
    }, 450);
  };

  // ==========================================
  // VIEW 1: TICKETS LIST TABLE (Default Hub View)
  // ==========================================
  if (hubMode === 'tickets-table') {
    return (
      <div className="p-6 max-w-[1600px] mx-auto space-y-5 animate-fadeIn">
        {/* Header Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">
              <Code2 className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                  Developer Testing Hub
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                  Azure DevOps Integrated
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Browse Azure DevOps tickets below. Click any row or &quot;Open Test Points →&quot; to view, edit, and AI-generate developer unit and integration testing points.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleBulkAiGenerateDevPoints}
              className="px-3.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-bold rounded-md flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              <span>✨ Bulk AI Generate Dev Points</span>
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

        {/* Feedback Notification */}
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
                placeholder="Search by Ticket ID, feature name, module, developer, QA..."
                value={ticketSearch}
                onChange={(e) => setTicketSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
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

        {/* Tickets Table View */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[1000px]">
              <thead className="bg-[#1E293B] text-slate-200 uppercase font-semibold text-[11px] tracking-wider sticky top-0 z-20 shadow-2xs">
                <tr>
                  <th className="p-2.5 w-32 border-r border-slate-700">Ticket ID</th>
                  <th className="p-2.5 min-w-[240px] border-r border-slate-700">Feature / Task Name</th>
                  <th className="p-2.5 w-40 border-r border-slate-700">Module</th>
                  <th className="p-2.5 w-36 border-r border-slate-700">Developer</th>
                  <th className="p-2.5 w-36 border-r border-slate-700">QA Assignee</th>
                  <th className="p-2.5 w-24 text-center border-r border-slate-700">Priority</th>
                  <th className="p-2.5 w-28 text-center border-r border-slate-700">Status</th>
                  <th className="p-2.5 w-32 text-center border-r border-slate-700">Dev Test Points</th>
                  <th className="p-2.5 w-48 text-center">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 text-slate-800">
                {filteredTickets.map((t) => {
                  const pointsCount = (devTestingMap[t.ticketNumber] || []).length;
                  const tHeader = devTestingHeadersMap[t.ticketNumber];
                  const submissionStatus = tHeader?.status || 'Draft';
                  const rowPerm = canUserOpenTicket(t, currentUser);
                  const isLockedDraft = !rowPerm.allowed;

                  return (
                    <tr
                      key={t.id}
                      onClick={() => handleOpenDevTestingScreen(t)}
                      className="hover:bg-blue-50/40 cursor-pointer transition-colors group"
                    >
                      {/* Ticket ID */}
                      <td className="p-2.5 border-r border-slate-100">
                        <span
                          className={`font-mono font-bold px-2 py-0.5 rounded border inline-flex items-center gap-1 ${
                            isLockedDraft
                              ? 'text-amber-800 bg-amber-50 group-hover:bg-amber-100 border-amber-300'
                              : 'text-blue-700 bg-blue-50 group-hover:bg-blue-100 border-blue-200'
                          }`}
                        >
                          #{t.ticketNumber}
                          {isLockedDraft && <Lock className="w-2.5 h-2.5 text-amber-600" />}
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

                      {/* Developer */}
                      <td className="p-2.5 border-r border-slate-100 font-semibold text-slate-800">
                        {t.developer}
                      </td>

                      {/* QA Assignee */}
                      <td className="p-2.5 border-r border-slate-100 text-slate-600">
                        {t.qaAssignee}
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

                      {/* Dev Test Points Count */}
                      <td className="p-2.5 border-r border-slate-100 text-center">
                        <span
                          className={`px-2 py-0.5 rounded font-mono font-bold text-xs ${
                            pointsCount > 0
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {pointsCount} Points
                        </span>
                      </td>

                      {/* Action */}
                      <td
                        className="p-2 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          {isLockedDraft ? (
                            <button
                              onClick={() => handleOpenDevTestingScreen(t)}
                              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                              title="Locked: Draft ticket is private to creator"
                            >
                              <Lock className="w-3 h-3" />
                              <span>Locked</span>
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => handleOpenDevTestingScreen(t)}
                                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                              >
                                <span>Open</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleQuickAiGenerateForTicket(t)}
                                title="Generate AI Developer Testing Points for this ticket"
                                className="p-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded cursor-pointer transition-colors"
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}

                          {onDeleteTicket && (
                            <button
                              type="button"
                              onClick={() => setTicketToDelete({ ticketNumber: t.ticketNumber, taskName: t.featureName })}
                              title={`Delete Ticket #${t.ticketNumber}`}
                              className="p-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded cursor-pointer transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {/* NO ITEM EMPTY STATE */}
                {filteredTickets.length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-14 text-center bg-slate-50/50">
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
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full max-h-[88vh] flex flex-col overflow-hidden animate-fadeIn">
              <div className="flex items-center justify-between p-4 px-5 border-b border-slate-100 bg-slate-50/80 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
                    <Plus className="w-4 h-4" />
                  </span>
                  <h2 className="text-base font-bold text-slate-900">Add New Azure DevOps Ticket</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddTicketModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer p-1 rounded-md"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form id="dev-add-ticket-form" onSubmit={handleCreateTicketSubmit} className="flex-1 overflow-y-auto p-5 space-y-3.5 text-xs">
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
                        <option key={`dev-st-${st.id}-${st.ticketNumber}`} value={st.ticketNumber}>
                          #{st.ticketNumber} — {st.featureName} (Module: {st.moduleName || 'General'})
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-blue-700 leading-relaxed">
                      Selecting a ticket automatically fills Title, Priority, Developer, QA, and Testing Scenario headers. Select your target module below to link it.
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
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-slate-700 font-bold">
                      Ticket ID / Work Item Number *
                    </label>
                    <button
                      type="button"
                      onClick={handleDirectAzureFetchInModal}
                      disabled={isFetchingAzureModal}
                      className="text-[11px] text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-md font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs"
                      title="Directly fetch Work Item details from Azure DevOps by ID"
                    >
                      <CloudDownload className="w-3.5 h-3.5 text-blue-600" />
                      <span>{isFetchingAzureModal ? 'Fetching Azure...' : '☁️ Direct Fetch Azure ID'}</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    list="dev-existing-tickets-datalist"
                    placeholder="e.g. 21655 or TL-B-20-00006"
                    value={newTicketNumber}
                    onChange={(e) => handleTicketNumberChange(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-900"
                  />
                  <datalist id="dev-existing-tickets-datalist">
                    {systemTicketsList.map((st) => (
                      <option key={`dev-dl-${st.ticketNumber}`} value={st.ticketNumber}>
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
                    rows={2}
                    placeholder="Enter testing scenarios, acceptance rules, or use AI Polish above..."
                    value={newScenarioDetails}
                    onChange={(e) => setNewScenarioDetails(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </form>

              <div className="p-3.5 px-5 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAddTicketModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg cursor-pointer transition-colors text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="dev-add-ticket-form"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg cursor-pointer shadow-xs transition-colors text-xs"
                >
                  Create &amp; Open Ticket
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // VIEW 2: DEVELOPER TESTING DETAIL SCREEN
  // ==========================================
  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-5 animate-fadeIn">
      {/* Hub Back Breadcrumb */}
      <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-2xs">
        <button
          onClick={() => setHubMode('tickets-table')}
          className="flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-200 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>← Back to Tickets List</span>
        </button>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>Viewing Developer Testing for:</span>
          <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
            Ticket #{header.ticketNo}
          </span>
          <span className="font-semibold text-slate-800">{header.featureName}</span>
        </div>
      </div>

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
          {/* Creator Controls */}
          {isTicketCreator && (
            isTicketInDraft(currentTicket) ? (
              <>
                <button
                  onClick={handleSaveDraft}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-bold rounded-md flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5 text-slate-600" />
                  <span>Save Draft</span>
                </button>

                <button
                  onClick={handleSubmitDevTesting}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-md flex items-center gap-2 shadow-xs transition-all cursor-pointer active:scale-95"
                  title="Submit your developer testing points so team members can view"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Save &amp; Submit Ticket</span>
                </button>
              </>
            ) : (
              <button
                onClick={handleReopenDeveloperTesting}
                className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-md flex items-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95"
                title="Reopen ticket to edit again"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Reopen for Editing</span>
              </button>
            )
          )}

          {/* Read-Only Notice for Non-Creators */}
          {!isTicketCreator && currentTicketPerms.isReadOnly && (
            <span className="px-3 py-1.5 bg-slate-100 text-slate-700 border border-slate-300 rounded-md text-xs font-bold flex items-center gap-1.5 shadow-2xs">
              <Eye className="w-3.5 h-3.5 text-blue-600" />
              <span>Read-Only View (Submitted by {currentTicket?.createdBy || header.developer || 'Creator'})</span>
            </span>
          )}

          <button
            onClick={handleGenerateFromAzureDevOpsTicket}
            disabled={isFetchingFromAdo || effectiveReadOnly}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-bold rounded-md flex items-center gap-2 shadow-xs transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isFetchingFromAdo ? 'Fetching Ticket...' : '✨ AI Generate from Ticket'}</span>
          </button>

          <button
            onClick={handleDownloadExcel}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-md flex items-center gap-2 shadow-xs transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Excel</span>
          </button>

          <button
            onClick={() => setIsAdoModalOpen(true)}
            title="Attach Developer Testing directly to Azure DevOps Work Item"
            className="px-3.5 py-1.5 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white text-xs font-bold rounded-md flex items-center gap-2 transition-all shadow-xs cursor-pointer"
          >
            <UploadCloud className="w-3.5 h-3.5 text-blue-200" />
            <span>🚀 Azure DevOps</span>
          </button>

          {onDeleteTicket && (
            <button
              type="button"
              onClick={() => setTicketToDelete({ ticketNumber: header.ticketNo, taskName: header.featureName })}
              title={`Delete Ticket #${header.ticketNo}`}
              className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-md flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Ticket</span>
            </button>
          )}
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
        mode="developer"
        selectedTicketNumber={selectedTicketNo}
        tickets={tickets}
        clientName={header.clientName || 'Treasury Master'}
        onChangeClientName={(val) => {
          const next = { ...header, clientName: val };
          setHeader(next);
          saveStateToStore(items, next);
        }}
        moduleName={currentTicket?.moduleName || 'Term Loan'}
        taskName={header.taskName !== undefined ? header.taskName : (header.featureName || currentTicket?.featureName || 'penalty overdue report')}
        onChangeTaskName={(val) => {
          const next = { ...header, taskName: val, featureName: val };
          setHeader(next);
          saveStateToStore(items, next);
        }}
        qaAssigneeName={header.qaAssignee !== undefined ? header.qaAssignee : (currentTicket?.qaAssignee || '')}
        onChangeQaAssigneeName={(val) => {
          const next = { ...header, qaAssignee: val };
          setHeader(next);
          saveStateToStore(items, next);
        }}
        developerName={header.developer !== undefined ? header.developer : (currentTicket?.developer || '')}
        onChangeDeveloperName={(val) => {
          const next = { ...header, developer: val };
          setHeader(next);
          const updatedItems = items.map((it) => ({
            ...it,
            developerName: val,
          }));
          saveStateToStore(updatedItems, next);
        }}
        sha={header.sha !== undefined ? header.sha : (header.shaCommit || currentTicket?.shaCommit || '')}
        onChangeSha={(val) => {
          const next = { ...header, sha: val, shaCommit: val };
          setHeader(next);
          saveStateToStore(items, next);
        }}
        signOffBy={header.signOffBy !== undefined ? header.signOffBy : (currentTicket?.signOffBy || '')}
        onChangeSignOffBy={(val) => {
          const next = { ...header, signOffBy: val };
          setHeader(next);
          saveStateToStore(items, next);
        }}
        description={header.description !== undefined ? header.description : (currentTicket?.description || '')}
        testingScenarios={header.testingScenarios !== undefined ? header.testingScenarios : (currentTicket?.testingScenarios || '')}
        attachedDocs={header.attachedDocs || []}
        onUpdateAttachedDocs={(docs) => {
          const next = { ...header, attachedDocs: docs };
          setHeader(next);
          saveStateToStore(items, next);
        }}
        screenFields={header.screenFields || []}
        onUpdateScreenFields={(fields) => {
          const next = { ...header, screenFields: fields };
          setHeader(next);
          saveStateToStore(items, next);
        }}
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
        onGenerateAi={handleAiGenerateMultiScenarios}
        isGenerating={isGeneratingAiScenarios}
        generateButtonText="✨ AI Auto-Generate Scenarios into Table"
        showGenerateButton={!effectiveReadOnly}
        readOnly={effectiveReadOnly}
      />

      {/* Quick Single Point Generator Bar */}
      <div className="bg-indigo-50/60 border border-indigo-200 p-3.5 rounded-xl flex flex-col md:flex-row items-center gap-3">
        <div className="flex-1 w-full">
          <label className="block text-[11px] font-bold text-indigo-900 uppercase tracking-wide mb-1">
            Quick generate expected result: Enter a testing point
          </label>
          <input
            type="text"
            disabled={effectiveReadOnly}
            placeholder={effectiveReadOnly ? 'Read-only mode (Ticket submitted by creator)' : 'e.g. Verify that changing the Index Rate updates the Effective Rate...'}
            value={singlePointInput}
            onChange={(e) => setSinglePointInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAiGenerateSinglePoint();
            }}
            className="w-full px-3 py-1.5 bg-white border border-indigo-200 disabled:bg-slate-100 disabled:opacity-60 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <button
          onClick={handleAiGenerateSinglePoint}
          disabled={isGeneratingAiPoint || effectiveReadOnly || !singlePointInput.trim()}
          className="w-full md:w-auto mt-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{isGeneratingAiPoint ? 'Generating...' : '✨ Generate Expected Result'}</span>
        </button>
      </div>

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

                <th className="p-2.5 w-24 text-center font-semibold">Action</th>
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
                      disabled={effectiveReadOnly}
                      value={item.dealId || header.dealId || `DEAL-${header.ticketNo}`}
                      onChange={(e) => handleCellChange(item.id, 'dealId', e.target.value)}
                      className="w-full px-2 py-1 font-mono font-bold text-blue-700 disabled:text-blue-900/70 bg-transparent hover:bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 rounded text-xs"
                    />
                  </td>

                  {/* Developer Name */}
                  <td className="p-1 border-r border-slate-100">
                    <input
                      type="text"
                      disabled={effectiveReadOnly}
                      value={item.developerName || header.developer || ''}
                      onChange={(e) => handleCellChange(item.id, 'developerName', e.target.value)}
                      className="w-full px-2 py-1 font-semibold text-slate-800 disabled:text-slate-600 bg-transparent hover:bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 rounded text-xs"
                    />
                  </td>

                  {/* Testing Point - Fully Editable & Convert to English */}
                  <td className="p-1 border-r border-slate-100">
                    <textarea
                      rows={2}
                      value={item.testingPoint || item.scenario || ''}
                      onChange={(e) => {
                        handleCellChange(item.id, 'testingPoint', e.target.value);
                        handleCellChange(item.id, 'scenario', e.target.value);
                      }}
                      placeholder="Enter simple testing point (any language)..."
                      className="w-full px-2 py-1 text-slate-900 font-medium bg-transparent hover:bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 rounded text-xs resize-y"
                    />
                    <div className="flex items-center justify-between mt-0.5 px-0.5">
                      <button
                        type="button"
                        onClick={() => handleTranslateTestingPoint(item.id, item.testingPoint || item.scenario || '')}
                        disabled={translatingPointId === item.id || !(item.testingPoint || item.scenario)}
                        title="Convert any language / Hindi / Hinglish / notes into direct, simple, understandable English"
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-purple-50 to-blue-50 hover:from-purple-100 hover:to-blue-100 text-purple-700 border border-purple-200 text-[10px] font-bold rounded cursor-pointer transition-colors shadow-2xs"
                      >
                        <Languages className="w-3 h-3 text-purple-600" />
                        <span>{translatingPointId === item.id ? 'Translating...' : '🌐 Convert to English'}</span>
                      </button>
                    </div>
                  </td>

                  {/* Expected Result */}
                  <td className="p-1 border-r border-slate-100">
                    <textarea
                      rows={2}
                      disabled={effectiveReadOnly}
                      value={item.expectedResult}
                      onChange={(e) => handleCellChange(item.id, 'expectedResult', e.target.value)}
                      placeholder="AI generated or manual expected result..."
                      className="w-full px-2 py-1 text-slate-800 disabled:text-slate-700 bg-transparent hover:bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 rounded text-xs resize-y"
                    />
                  </td>

                  {/* Evidence (Multi-screenshot attach + Ctrl+V) */}
                  <td className="p-1 border-r border-slate-100">
                    <RowAttachmentsCell
                      id={`dev-att-${item.id}`}
                      attachments={item.attachments || []}
                      fallbackScreenshotName={item.screenshotName}
                      fallbackScreenshotUrl={item.screenshotUrl}
                      readOnly={effectiveReadOnly}
                      onAddAttachment={(file) => handleAddAttachment(item.id, file)}
                      onRemoveAttachment={(attId) => handleRemoveAttachment(item.id, attId)}
                    />
                  </td>

                  {/* Actions */}
                  <td className="p-1 text-center">
                    {!effectiveReadOnly ? (
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleDuplicateRow(item.id)}
                          title="Duplicate row"
                          className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        {(() => {
                          const isSuperAdmin = currentUser?.role === 'Super Admin' || currentUser?.email?.toLowerCase().includes('maseera');
                          const authorName = (item.createdBy || '').toLowerCase().trim();
                          const currentUserName = (currentUser?.name || '').toLowerCase().trim();
                          const canDelete = isSuperAdmin || !authorName || authorName === currentUserName || (authorName && currentUserName && (currentUserName.includes(authorName) || authorName.includes(currentUserName)));

                          return canDelete ? (
                            <button
                              onClick={() => handleDeleteRow(item.id)}
                              title={`Delete testing row (Created by ${item.createdBy || 'Developer'})`}
                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <span
                              title={`Protected: Created by "${item.createdBy || 'another user'}". Only the author or Super Admin can delete.`}
                              className="p-1 text-slate-300 cursor-not-allowed inline-flex items-center"
                            >
                              <Lock className="w-3.5 h-3.5 text-slate-400" />
                            </span>
                          );
                        })()}
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400 font-semibold italic">Locked</span>
                    )}
                  </td>
                </tr>
              ))}

              {/* NO ITEM EMPTY STATE IN TABLE */}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-12 text-center bg-slate-50/50">
                    <div className="flex flex-col items-center justify-center space-y-2.5">
                      <span className="px-4 py-1 bg-slate-100 text-slate-700 rounded-full font-bold text-xs tracking-wider uppercase border border-slate-200 shadow-2xs">
                        NO item
                      </span>
                      <p className="text-xs text-slate-500 max-w-sm">
                        No developer testing points found for Ticket #{header.ticketNo}. Generate test points instantly using AI or add testing rows manually.
                      </p>
                      <button
                        onClick={handleGenerateFromAzureDevOpsTicket}
                        className="mt-1 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>✨ AI Auto-Generate Dev Points for #{header.ticketNo}</span>
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Toolbar */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          {!effectiveReadOnly ? (
            <button
              onClick={handleAddRow}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold rounded shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-blue-600" />
              <span>+ Add Testing Row</span>
            </button>
          ) : (
            <div className="text-xs text-slate-500 italic">
              Editing disabled (Ticket submitted in read-only mode)
            </div>
          )}

          <div className="flex items-center gap-4 text-slate-500 font-medium">
            <span>Total Points: <strong className="text-slate-800">{items.length}</strong></span>
            <span>State: <strong className={header.status === 'Submitted' ? 'text-emerald-700' : 'text-amber-700'}>{header.status || 'Draft'}</strong></span>
          </div>
        </div>
      </div>

      {/* Azure DevOps Modal */}
      <AzureDevopsModal
        isOpen={isAdoModalOpen}
        onClose={() => setIsAdoModalOpen(false)}
        ticketNumber={header.ticketNo}
        taskName={header.featureName}
        getFileBlob={() => getDeveloperTestingExcelBlob(header, items)}
        defaultComment={`Developer Testing points for "${header.featureName}" (Ticket #${header.ticketNo}) executed by ${header.developer}. Total points: ${items.length}.`}
        onSuccessNotice={(msg) => {
          setNotification(msg);
          setTimeout(() => setNotification(null), 5000);
        }}
      />

      {/* Locked Draft Ticket Modal */}
      {lockedModalTicket && (
        <TicketLockedModal
          isOpen={true}
          onClose={() => setLockedModalTicket(null)}
          ticketNumber={lockedModalTicket.ticketNumber}
          createdBy={lockedModalTicket.createdBy}
          customMessage={lockedModalTicket.reason}
        />
      )}

      {/* Delete Ticket Confirmation Modal (All modules vs Tickets tab only) */}
      {ticketToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-rose-100 text-rose-700 rounded-lg">
                  <Trash2 className="w-4 h-4" />
                </span>
                <h3 className="text-sm font-bold text-slate-900">Delete Ticket #{ticketToDelete.ticketNumber}</h3>
              </div>
              <button
                type="button"
                onClick={() => setTicketToDelete(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl space-y-2 text-xs">
              <p className="font-bold text-rose-950">
                Are you sure you want to delete Ticket <span className="font-mono">#{ticketToDelete.ticketNumber}</span> {ticketToDelete.taskName ? `("${ticketToDelete.taskName}")` : ''}?
              </p>
              <p className="text-slate-600">Please choose how you want to delete this ticket:</p>
            </div>

            <div className="space-y-2 text-xs">
              <label className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${deleteMode === 'all_modules' ? 'border-rose-500 bg-rose-50/40' : 'border-slate-200 hover:bg-slate-50'}`}>
                <input
                  type="radio"
                  name="devDeleteMode"
                  value="all_modules"
                  checked={deleteMode === 'all_modules'}
                  onChange={() => setDeleteMode('all_modules')}
                  className="mt-0.5 text-rose-600 focus:ring-rose-500 cursor-pointer"
                />
                <div>
                  <div className="font-bold text-slate-900">Delete from EVERY module</div>
                  <div className="text-[11px] text-slate-500">
                    Permanently purges this ticket, its developer testing points, QA test cases, and observations across all modules and the dashboard.
                  </div>
                </div>
              </label>

              <label className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${deleteMode === 'tickets_tab_only' ? 'border-blue-500 bg-blue-50/40' : 'border-slate-200 hover:bg-slate-50'}`}>
                <input
                  type="radio"
                  name="devDeleteMode"
                  value="tickets_tab_only"
                  checked={deleteMode === 'tickets_tab_only'}
                  onChange={() => setDeleteMode('tickets_tab_only')}
                  className="mt-0.5 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <div>
                  <div className="font-bold text-slate-900">Delete from Tickets tab only</div>
                  <div className="text-[11px] text-slate-500">
                    Removes from the tickets list, but keeps working drafts in other modules until saved and submitted again.
                  </div>
                </div>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setTicketToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteTicket}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs cursor-pointer shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirm Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Single Developer Testing Point Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-rose-100 text-rose-700 rounded-lg">
                  <Trash2 className="w-4 h-4" />
                </span>
                <h3 className="text-sm font-bold text-slate-900">Delete Developer Testing Point</h3>
              </div>
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl space-y-1.5 text-xs">
              <p className="font-semibold text-rose-950">
                Are you sure you want to delete this developer testing point?
              </p>
              <p className="text-slate-600 italic">
                &quot;{itemToDelete.testingPoint || itemToDelete.expectedResult || 'Empty point'}&quot;
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteItem}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs cursor-pointer shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Yes, Delete Point</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
