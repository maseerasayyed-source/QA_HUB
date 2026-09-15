import React, { useState, useMemo, useEffect } from 'react';
import {
  AlertOctagon,
  Download,
  Plus,
  Trash2,
  Copy,
  CheckCircle2,
  Clock,
  MinusCircle,
  Wand2,
  Search,
  RotateCcw,
  UploadCloud,
  Sparkles,
  ArrowLeft,
  ChevronRight,
  Filter,
  X,
  FileSpreadsheet,
} from 'lucide-react';
import {
  ObservationHeaderMeta,
  ObservationItem,
  TicketSummary,
  FileAttachment,
  UserProfile,
  AttachedDocOrImage,
} from '../types';
import { exportObservationsToExcel, getObservationsExcelBlob } from '../utils/excelExport';
import { polishObservationText, correctSpelling } from '../utils/textPolisher';
import {
  generateObservationsAndRfEsForTicket,
  generateTicketDetailsWithAi,
  generateScenariosFromInputsAndFiles,
  checkIsDuplicate,
} from '../utils/aiGenerator';
import { INITIAL_OBSERVATION_HEADER, INITIAL_OBSERVATIONS } from '../data/initialData';
import { ColumnHeader, SortDirection } from './common/ColumnHeader';
import { RowAttachmentsCell } from './common/RowAttachmentsCell';
import { AzureDevopsModal } from './common/AzureDevopsModal';
import { CommonHeader } from './common/CommonHeader';

interface ObservationsViewProps {
  tickets?: TicketSummary[];
  modules?: { id: string; name: string }[];
  currentUser?: UserProfile;
  observationsMap?: Record<string, ObservationItem[]>;
  initialHeader?: ObservationHeaderMeta;
  initialObservations?: ObservationItem[];
  activeTicketNumber?: string;
  onSelectTicket?: (ticketNo: string) => void;
  onUpdateHeader?: (header: ObservationHeaderMeta) => void;
  onUpdateObservations?: (items: ObservationItem[], ticketNum?: string) => void;
  onAddTicket?: (ticket: TicketSummary) => void;
}

export const ObservationsView: React.FC<ObservationsViewProps> = ({
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
  observationsMap = {},
  initialHeader = INITIAL_OBSERVATION_HEADER,
  initialObservations = INITIAL_OBSERVATIONS,
  activeTicketNumber,
  onSelectTicket,
  onUpdateHeader,
  onUpdateObservations,
  onAddTicket,
}) => {
  // Hub Navigation Mode: 'tickets-table' (Tickets List) vs 'observation-screen' (Detail Screen)
  const [hubMode, setHubMode] = useState<'tickets-table' | 'observation-screen'>('tickets-table');

  // Selected Active Ticket Number
  const defaultTicketNo = activeTicketNumber || tickets[0]?.ticketNumber || initialHeader.ticketNo;
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

  // Observation Sheet Header
  const [header, setHeader] = useState<ObservationHeaderMeta & { testingScenarios?: string }>(() => {
    return {
      ...initialHeader,
      ticketNo: currentTicket?.ticketNumber || defaultTicketNo,
      ticketName: currentTicket?.featureName || initialHeader.ticketName,
      qaOwner: currentTicket?.qaAssignee || initialHeader.qaOwner || currentUser?.name || 'Maseera Sayyed',
      date: new Date().toISOString().split('T')[0],
      testingScenarios: currentTicket?.testingScenarios || currentTicket?.scenarioDetails || '',
    };
  });

  // Observation records
  const [observations, setObservations] = useState<ObservationItem[]>(() => {
    if (observationsMap[selectedTicketNo] && observationsMap[selectedTicketNo].length > 0) {
      return observationsMap[selectedTicketNo];
    }
    return initialObservations;
  });

  // Add Ticket Modal State with Custom Module option
  const [isAddTicketModalOpen, setIsAddTicketModalOpen] = useState<boolean>(false);
  const [newTicketNumber, setNewTicketNumber] = useState<string>('');
  const [newFeatureName, setNewFeatureName] = useState<string>('');
  const [newModuleId, setNewModuleId] = useState<string>('term loan');
  const [customModuleName, setCustomModuleName] = useState<string>('');
  const [newPriority, setNewPriority] = useState<'Critical' | 'High' | 'Medium' | 'Low'>('High');
  const [newDeveloper, setNewDeveloper] = useState<string>('');
  const [newQaAssignee, setNewQaAssignee] = useState<string>(currentUser?.name || 'Maseera Sayyed');
  const [newScenarioDetails, setNewScenarioDetails] = useState<string>('');
  const [isAiGeneratingTicket, setIsAiGeneratingTicket] = useState<boolean>(false);

  // Sorting state in detail table
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  // Column Filters map
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({
    serialNo: '',
    type: '',
    observationRFE: '',
    priority: '',
    status: '',
    retesting: '',
    remark: '',
  });

  // Global search input
  const [globalSearch, setGlobalSearch] = useState<string>('');

  // Observation Type filter tab
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'ALL' | 'Observation' | 'RFE'>('ALL');

  // Excel download toast notification
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);

  // Azure DevOps Modal & notification
  const [isAdoModalOpen, setIsAdoModalOpen] = useState<boolean>(false);
  const [adoNotification, setAdoNotification] = useState<string | null>(null);

  // AI Generation Loading state
  const [isAiGenerating, setIsAiGenerating] = useState<boolean>(false);

  // Attached reference documents/screenshots and screen fields for AI Scenario & Defect generation
  const [attachedDocs, setAttachedDocs] = useState<AttachedDocOrImage[]>([]);
  const [screenFields, setScreenFields] = useState<string[]>([]);

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
    const nextH = {
      ...header,
      ticketNo: tNo,
      ticketName: found ? found.featureName : header.ticketName,
      qaOwner: found ? found.qaAssignee : header.qaOwner,
      testingScenarios: found?.testingScenarios || found?.scenarioDetails || '',
    };
    setHeader(nextH);
    onUpdateHeader?.(nextH);

    const existingObs = observationsMap[tNo];
    if (existingObs && existingObs.length > 0) {
      setObservations(existingObs);
    } else {
      setObservations([]);
    }
  };

  // Helper to commit changes to observations
  const updateObservationsState = (newObs: ObservationItem[], targetTicketNo?: string) => {
    setObservations(newObs);
    const tNo = targetTicketNo || header.ticketNo;
    onUpdateObservations?.(newObs, tNo);
  };

  // Switch to Detail Screen for ticket
  const handleOpenObservationScreen = (ticket: TicketSummary) => {
    handleTicketChange(ticket.ticketNumber);
    setHubMode('observation-screen');
  };

  // AI Generate Observations & RFEs for Current Active Ticket
  const handleAiGenerateObservations = () => {
    setIsAiGenerating(true);
    setTimeout(() => {
      const generated = generateObservationsAndRfEsForTicket(currentTicket);
      const merged = [...observations, ...generated];
      updateObservationsState(merged);
      setIsAiGenerating(false);
      setAdoNotification(`✨ AI generated ${generated.length} test observations and RFEs for Ticket #${header.ticketNo}!`);
      setTimeout(() => setAdoNotification(null), 4000);
    }, 450);
  };

  // Multi-scenario AI generation directly into Observation & RFE Table with duplicate prevention
  const handleAiGenerateMultiScenarios = (opts: {
    description: string;
    testingScenarios: string;
    attachedDocs: AttachedDocOrImage[];
    screenFields: string[];
  }) => {
    setIsAiGenerating(true);
    setTimeout(() => {
      const rawScenarios = generateScenariosFromInputsAndFiles({
        ticket: currentTicket,
        description: opts.description || header.ticketName,
        testingScenarios: opts.testingScenarios,
        attachedDocs: opts.attachedDocs,
        screenFields: opts.screenFields,
        targetMode: 'qa',
        existingItems: observations.map((o) => ({ testScenario: o.observationRFE })),
      });

      const newItems: ObservationItem[] = [];
      let skippedCount = 0;

      rawScenarios.newItems.forEach((sc, idx) => {
        const fullScenarioText = `${sc.testScenario} - ${sc.testCases}`;

        // Strict duplicate prevention against existing observations in the table
        const isDuplicate = observations.some((existing) => {
          const t1 = fullScenarioText.toLowerCase().replace(/[^a-z0-9]/g, ' ');
          const t2 = existing.observationRFE.toLowerCase().replace(/[^a-z0-9]/g, ' ');
          if (t1 === t2 || (t1.length > 20 && t2.length > 20 && (t1.includes(t2) || t2.includes(t1)))) return true;
          const words1 = new Set(t1.split(/\s+/).filter((w) => w.length > 3));
          const words2 = new Set(t2.split(/\s+/).filter((w) => w.length > 3));
          if (words1.size === 0 || words2.size === 0) return false;
          let intersection = 0;
          words1.forEach((w) => {
            if (words2.has(w)) intersection++;
          });
          return intersection / Math.max(words1.size, words2.size) >= 0.72;
        });

        if (isDuplicate) {
          skippedCount++;
          return;
        }

        const isRfe =
          sc.featureTab === 'reporting' ||
          sc.testScenario.toLowerCase().includes('export') ||
          sc.testScenario.toLowerCase().includes('enhance') ||
          sc.testScenario.toLowerCase().includes('rfe');

        newItems.push({
          id: `obs-ai-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
          serialNo: `OBS-0${observations.length + newItems.length + 1}`,
          ticketId: header.ticketNo,
          ticketName: header.ticketName,
          type: isRfe ? 'RFE' : 'Observation',
          observationRFE: fullScenarioText,
          priority: idx % 3 === 0 ? 'Critical' : idx % 2 === 0 ? 'High' : 'Medium',
          status: 'Open',
          retesting: 1,
          fixedEvidence: [],
          attachments: [],
          remark: `Synthesized via AI test generator (${sc.featureTab} coverage).`,
          reportedBy: header.qaOwner,
          createdDate: new Date().toISOString().split('T')[0],
        });
      });

      if (newItems.length === 0) {
        setIsAiGenerating(false);
        setAdoNotification('⚠️ All generated scenarios are already covered in this ticket! Duplicates were prevented.');
        setTimeout(() => setAdoNotification(null), 5000);
        return;
      }

      const merged = [...observations, ...newItems];
      updateObservationsState(merged);
      setIsAiGenerating(false);
      setAdoNotification(
        `✨ AI generated ${newItems.length} multiple Observation & RFE records directly into table!${
          skippedCount > 0 ? ` (${skippedCount} duplicate items prevented)` : ''
        }`
      );
      setTimeout(() => setAdoNotification(null), 5000);
    }, 450);
  };

  // Quick AI Generate for a specific ticket from tickets list
  const handleQuickAiGenerateForTicket = (ticket: TicketSummary) => {
    const generated = generateObservationsAndRfEsForTicket(ticket);
    const existing = observationsMap[ticket.ticketNumber] || [];
    const merged = [...existing, ...generated];
    updateObservationsState(merged, ticket.ticketNumber);
    if (selectedTicketNo.toLowerCase() === ticket.ticketNumber.toLowerCase()) {
      setObservations(merged);
    }
    setAdoNotification(`✨ Auto-generated ${generated.length} Observations & RFEs for Ticket #${ticket.ticketNumber}!`);
    setTimeout(() => setAdoNotification(null), 4000);
  };

  // Bulk AI Generate for tickets with 0 items
  const handleBulkAiGenerateObservations = () => {
    let count = 0;
    tickets.forEach((t) => {
      const existing = observationsMap[t.ticketNumber] || [];
      if (existing.length === 0) {
        const generated = generateObservationsAndRfEsForTicket(t);
        updateObservationsState(generated, t.ticketNumber);
        if (selectedTicketNo.toLowerCase() === t.ticketNumber.toLowerCase()) {
          setObservations(generated);
        }
        count += generated.length;
      }
    });
    setAdoNotification(`✨ Bulk auto-generated Observations & RFEs across empty tickets!`);
    setTimeout(() => setAdoNotification(null), 4000);
  };

  // Cell change handler
  const handleCellChange = (id: string, field: keyof ObservationItem, value: any) => {
    const updated = observations.map((obs) => {
      if (obs.id === id) {
        return { ...obs, [field]: value };
      }
      return obs;
    });
    updateObservationsState(updated);
  };

  // Add Row Attachment
  const handleAddAttachment = (id: string, file: { name: string; url: string; size?: string }) => {
    const updated = observations.map((obs) => {
      if (obs.id === id) {
        const currentAtts = obs.attachments || [];
        const newAtt: FileAttachment = {
          id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: file.name,
          url: file.url,
          size: file.size || '140 KB',
          uploadedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        const nextAtts = [...currentAtts, newAtt];
        return {
          ...obs,
          attachments: nextAtts,
          screenshotName: nextAtts[0].name,
          screenshotUrl: nextAtts[0].url,
        };
      }
      return obs;
    });
    updateObservationsState(updated);
  };

  // Remove Row Attachment
  const handleRemoveAttachment = (id: string, attachmentId: string) => {
    const updated = observations.map((obs) => {
      if (obs.id === id) {
        const remaining = (obs.attachments || []).filter((a) => a.id !== attachmentId);
        return {
          ...obs,
          attachments: remaining,
          screenshotName: remaining.length > 0 ? remaining[0].name : '',
          screenshotUrl: remaining.length > 0 ? remaining[0].url : '',
        };
      }
      return obs;
    });
    updateObservationsState(updated);
  };

  // Insert a new observation row at bottom
  const handleAddRow = () => {
    const nextNum = observations.length + 1;
    const newObs: ObservationItem = {
      id: `obs-${Date.now()}`,
      serialNo: `OBS-0${nextNum}`,
      ticketId: header.ticketNo,
      ticketName: header.ticketName,
      type: 'Observation',
      observationRFE: '',
      priority: 'High',
      status: 'Open',
      retesting: 1,
      fixedEvidence: [],
      attachments: [],
      remark: '',
      reportedBy: header.qaOwner,
      createdDate: new Date().toISOString().split('T')[0],
    };
    updateObservationsState([...observations, newObs]);
  };

  // Duplicate an observation row
  const handleDuplicateRow = (id: string) => {
    const index = observations.findIndex((o) => o.id === id);
    if (index === -1) return;
    const item = observations[index];
    const clone: ObservationItem = {
      ...item,
      id: `obs-${Date.now()}`,
      serialNo: `OBS-0${observations.length + 1}`,
      status: 'Open',
      retesting: 1,
      attachments: item.attachments ? [...item.attachments] : [],
      fixedEvidence: item.fixedEvidence ? [...item.fixedEvidence] : [],
    };
    const next = [...observations];
    next.splice(index + 1, 0, clone);
    updateObservationsState(next);
  };

  // Delete an observation row
  const handleDeleteRow = (id: string) => {
    if (confirm('Delete this observation record?')) {
      updateObservationsState(observations.filter((o) => o.id !== id));
    }
  };

  // Auto-Polish grammar for all observation descriptions
  const handlePolishAllObservations = () => {
    const updated = observations.map((obs) => ({
      ...obs,
      observationRFE: polishObservationText(obs.observationRFE),
    }));
    updateObservationsState(updated);
  };

  // Export to Excel
  const handleDownloadExcel = async () => {
    try {
      await exportObservationsToExcel(header, observations);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3500);
    } catch (err) {
      console.error(err);
      alert('Failed to export Observation Excel file.');
    }
  };

  // Sort Handler in Detail Table
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

  // Column Filter Change in Detail Table
  const handleFilterChange = (key: string, value: string) => {
    setColumnFilters((prev) => ({ ...prev, [key]: value }));
  };

  // Reset all filters & sorting
  const handleResetFilters = () => {
    setColumnFilters({
      serialNo: '',
      type: '',
      observationRFE: '',
      priority: '',
      status: '',
      retesting: '',
      remark: '',
    });
    setGlobalSearch('');
    setSortKey(null);
    setSortDirection(null);
  };

  // Filtered Observations in Detail Screen
  const filteredObservations = useMemo(() => {
    return observations
      .filter((obs) => {
        if (selectedTypeFilter !== 'ALL') {
          if ((obs.type || 'Observation') !== selectedTypeFilter) {
            return false;
          }
        }

        if (globalSearch.trim()) {
          const q = globalSearch.toLowerCase();
          const matchesGlobal =
            obs.serialNo.toLowerCase().includes(q) ||
            obs.type.toLowerCase().includes(q) ||
            obs.observationRFE.toLowerCase().includes(q) ||
            obs.priority.toLowerCase().includes(q) ||
            obs.status.toLowerCase().includes(q);
          if (!matchesGlobal) return false;
        }

        if (columnFilters.serialNo.trim() && !obs.serialNo.toLowerCase().includes(columnFilters.serialNo.toLowerCase().trim())) return false;
        if (columnFilters.type.trim() && !obs.type.toLowerCase().includes(columnFilters.type.toLowerCase().trim())) return false;
        if (columnFilters.observationRFE.trim() && !obs.observationRFE.toLowerCase().includes(columnFilters.observationRFE.toLowerCase().trim())) return false;
        if (columnFilters.priority.trim() && !obs.priority.toLowerCase().includes(columnFilters.priority.toLowerCase().trim())) return false;
        if (columnFilters.status.trim() && !obs.status.toLowerCase().includes(columnFilters.status.toLowerCase().trim())) return false;
        if (columnFilters.remark.trim() && !(obs.remark || '').toLowerCase().includes(columnFilters.remark.toLowerCase().trim())) return false;

        return true;
      })
      .sort((a, b) => {
        if (!sortKey || !sortDirection) return 0;
        const valA = (a as any)[sortKey] ?? '';
        const valB = (b as any)[sortKey] ?? '';
        const comp = String(valA).localeCompare(String(valB));
        return sortDirection === 'asc' ? comp : -comp;
      });
  }, [observations, globalSearch, selectedTypeFilter, columnFilters, sortKey, sortDirection]);

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

    const newTicket: TicketSummary = {
      id: `ticket-${Date.now()}`,
      ticketNumber: newTicketNumber.trim().replace('#', ''),
      featureName: newFeatureName.trim(),
      moduleId: newModuleId === 'other' ? 'custom' : newModuleId,
      moduleName: effectiveModuleName,
      developer: newDeveloper.trim() || '',
      qaAssignee: newQaAssignee.trim() || currentUser?.name || 'Maseera Sayyed',
      priority: newPriority,
      status: 'Ready for QA',
      testCasesCount: 0,
      passedCount: 0,
      failedCount: 0,
      blockedCount: 0,
      observationsCount: 0,
      receivedDate: new Date().toISOString().split('T')[0],
      scenarioDetails: newScenarioDetails.trim(),
      testingScenarios: newScenarioDetails.trim(),
    };

    onAddTicket?.(newTicket);
    handleOpenObservationScreen(newTicket);
    setIsAddTicketModalOpen(false);

    // Reset
    setNewTicketNumber('');
    setNewFeatureName('');
    setCustomModuleName('');
    setNewScenarioDetails('');
    setAdoNotification(`✅ Ticket #${newTicket.ticketNumber} created successfully!`);
    setTimeout(() => setAdoNotification(null), 4000);
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
            <span className="p-2 bg-red-50 text-red-600 rounded-lg border border-red-100">
              <AlertOctagon className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                  QA Observations &amp; RFE Hub
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-800 border border-red-200">
                  Defect Tracking &amp; RFE
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                  Excel Formatted
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Browse Azure DevOps tickets below. Click any row or &quot;Open Observations →&quot; to record defect observations, request RFEs, and generate AI insights.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleBulkAiGenerateObservations}
              className="px-3.5 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold rounded-md flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
              <span>✨ Bulk AI Generate Obs &amp; RFEs</span>
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
        {adoNotification && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-center gap-2 animate-fadeIn shadow-2xs">
            <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
            <span>{adoNotification}</span>
          </div>
        )}

        {/* Filter and Search Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs text-xs">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search by Ticket ID, feature name, module, assignee, developer..."
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

        {/* Tickets Table View */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[1000px]">
              <thead className="bg-[#1E293B] text-slate-200 uppercase font-semibold text-[11px] tracking-wider sticky top-0 z-20 shadow-2xs">
                <tr>
                  <th className="p-2.5 w-32 border-r border-slate-700">Ticket ID</th>
                  <th className="p-2.5 min-w-[240px] border-r border-slate-700">Feature / Task Name</th>
                  <th className="p-2.5 w-40 border-r border-slate-700">Module</th>
                  <th className="p-2.5 w-36 border-r border-slate-700">QA Assignee</th>
                  <th className="p-2.5 w-36 border-r border-slate-700">Developer</th>
                  <th className="p-2.5 w-24 text-center border-r border-slate-700">Priority</th>
                  <th className="p-2.5 w-28 text-center border-r border-slate-700">Status</th>
                  <th className="p-2.5 w-36 text-center border-r border-slate-700">Observations &amp; RFEs</th>
                  <th className="p-2.5 w-48 text-center">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 text-slate-800">
                {filteredTickets.map((t) => {
                  const obsList = observationsMap[t.ticketNumber] || [];
                  const obsCount = obsList.filter((o) => (o.type || 'Observation') === 'Observation').length;
                  const rfeCount = obsList.filter((o) => o.type === 'RFE').length;
                  const totalCount = obsList.length;

                  return (
                    <tr
                      key={t.id}
                      onClick={() => handleOpenObservationScreen(t)}
                      className="hover:bg-red-50/40 cursor-pointer transition-colors group"
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
                      <td className="p-2.5 border-r border-slate-100 font-semibold text-slate-800">
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

                      {/* Observations & RFEs Count */}
                      <td className="p-2.5 border-r border-slate-100 text-center">
                        {totalCount > 0 ? (
                          <div className="flex items-center justify-center gap-1.5 font-mono text-[11px]">
                            <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-bold">
                              {obsCount} Obs
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200 font-bold">
                              {rfeCount} RFE
                            </span>
                          </div>
                        ) : (
                          <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-slate-100 text-slate-500">
                            0 Items
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
                            onClick={() => handleOpenObservationScreen(t)}
                            className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                          >
                            <span>Open</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleQuickAiGenerateForTicket(t)}
                            title="Generate AI Observations and RFEs for this ticket"
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
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Ticket ID / Work Item Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 21655 or TL-B-20-00006"
                    value={newTicketNumber}
                    onChange={(e) => setNewTicketNumber(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
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

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAddTicketModalOpen(false)}
                    className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg cursor-pointer"
                  >
                    Create &amp; Open Ticket
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // VIEW 2: OBSERVATIONS & RFE DETAIL SCREEN
  // ==========================================
  return (
    <div className="p-6 max-w-[1500px] mx-auto space-y-5 animate-fadeIn">
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
          <span>Viewing Observations &amp; RFE for:</span>
          <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
            Ticket #{header.ticketNo}
          </span>
          <span className="font-semibold text-slate-800">{header.ticketName}</span>
        </div>
      </div>

      {/* Top Header Card */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <span className="p-2 bg-red-50 text-red-600 rounded-lg border border-red-100">
            <AlertOctagon className="w-5 h-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                Observations &amp; RFE Tracker
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-800">
                Excel Formatted
              </span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800">
                Multi-File &amp; Ctrl+V Attach
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Header with Ticket Name &amp; Number. Track Observations vs. RFEs, attach multiple screenshots/files row-wise, set priority &amp; status, and export exact Excel (.xlsx).
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleAiGenerateObservations}
            disabled={isAiGenerating}
            className="px-3.5 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold rounded-md flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
            <span>{isAiGenerating ? 'AI Generating...' : '✨ AI Generate Obs & RFEs'}</span>
          </button>

          <button
            onClick={handlePolishAllObservations}
            className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Wand2 className="w-3.5 h-3.5 text-purple-600" />
            <span>Auto-Polish Grammar</span>
          </button>

          <button
            onClick={handleAddRow}
            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Row</span>
          </button>

          <button
            onClick={handleDownloadExcel}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-md flex items-center gap-2 transition-all shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Excel</span>
          </button>

          {/* Attach Directly to Azure DevOps Ticket Button */}
          <button
            onClick={() => setIsAdoModalOpen(true)}
            title="Attach observations directly to Azure DevOps Work Item"
            className="px-3.5 py-1.5 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white text-xs font-bold rounded-md flex items-center gap-2 transition-all shadow-xs cursor-pointer"
          >
            <UploadCloud className="w-3.5 h-3.5 text-blue-200" />
            <span>🚀 Azure DevOps</span>
          </button>
        </div>
      </div>

      {/* Azure DevOps Notification Feedback */}
      {adoNotification && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-center gap-2 animate-fadeIn shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
          <span>{adoNotification}</span>
        </div>
      )}

      {/* Download Confirmation Feedback */}
      {downloadSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            Observation Excel file <strong>Observations_{header.ticketNo}.xlsx</strong> downloaded with <strong>Beacon Corporate Navy header (#1E3A8A)</strong>, cell grid borders, embedded screenshots, and attachment links!
          </span>
        </div>
      )}

      {/* COMMON MODULE HEADER */}
      <CommonHeader
        mode="qa"
        selectedTicketNumber={selectedTicketNo}
        tickets={tickets}
        developerName={currentTicket?.developer || ''}
        qaAssigneeName={currentTicket?.qaAssignee || header.qaOwner || 'Maseera Sayyed'}
        description={header.ticketName}
        testingScenarios={header.testingScenarios || ''}
        attachedDocs={attachedDocs}
        screenFields={screenFields}
        onUpdateAttachedDocs={setAttachedDocs}
        onUpdateScreenFields={setScreenFields}
        onSelectTicket={handleTicketChange}
        onChangeDescription={(val) => {
          const next = { ...header, ticketName: val };
          setHeader(next);
          onUpdateHeader?.(next);
        }}
        onChangeTestingScenarios={(val) => {
          const next = { ...header, testingScenarios: val };
          setHeader(next);
          onUpdateHeader?.(next);
        }}
        onAiGenerateSuccess={handleAiGenerateObservations}
        onAiGenerateMultiScenarios={handleAiGenerateMultiScenarios}
      />

      {/* Observation vs RFE Filter Pills */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-medium">Filter Type:</span>
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setSelectedTypeFilter('ALL')}
              className={`px-3 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                selectedTypeFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Records ({observations.length})
            </button>
            <button
              onClick={() => setSelectedTypeFilter('Observation')}
              className={`px-3 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                selectedTypeFilter === 'Observation'
                  ? 'bg-amber-100 text-amber-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Observations (
              {observations.filter((o) => (o.type || 'Observation') === 'Observation').length})
            </button>
            <button
              onClick={() => setSelectedTypeFilter('RFE')}
              className={`px-3 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                selectedTypeFilter === 'RFE'
                  ? 'bg-purple-100 text-purple-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              RFEs ({observations.filter((o) => o.type === 'RFE').length})
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            <input
              type="text"
              placeholder="Search observations..."
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              className="pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 w-52"
            />
          </div>
          {(globalSearch || Object.values(columnFilters).some(Boolean)) && (
            <button
              onClick={handleResetFilters}
              title="Reset Filters"
              className="p-1 text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Observation Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto max-h-[620px]">
          <table className="w-full text-left text-xs border-collapse min-w-[1250px]">
            <thead className="bg-[#1E293B] text-slate-200 uppercase font-semibold text-[11px] tracking-wider sticky top-0 z-20 shadow-2xs">
              <tr>
                <th className="p-2.5 w-12 text-center border-r border-slate-700">#</th>

                <ColumnHeader
                  title="Sr. No."
                  columnKey="serialNo"
                  sortKey={sortKey}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  filterValue={columnFilters.serialNo}
                  onFilterChange={handleFilterChange}
                  className="w-24 border-r border-slate-700"
                />

                <ColumnHeader
                  title="Type"
                  columnKey="type"
                  sortKey={sortKey}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  filterValue={columnFilters.type}
                  onFilterChange={handleFilterChange}
                  className="w-32 border-r border-slate-700"
                />

                <ColumnHeader
                  title="Observation / RFE Description"
                  columnKey="observationRFE"
                  sortKey={sortKey}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  filterValue={columnFilters.observationRFE}
                  onFilterChange={handleFilterChange}
                  className="min-w-[320px] border-r border-slate-700"
                />

                <ColumnHeader
                  title="Priority"
                  columnKey="priority"
                  sortKey={sortKey}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  filterValue={columnFilters.priority}
                  onFilterChange={handleFilterChange}
                  className="w-24 text-center border-r border-slate-700"
                />

                <ColumnHeader
                  title="Status"
                  columnKey="status"
                  sortKey={sortKey}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  filterValue={columnFilters.status}
                  onFilterChange={handleFilterChange}
                  className="w-36 text-center border-r border-slate-700"
                />

                <th className="p-2.5 w-20 text-center border-r border-slate-700 font-semibold">
                  Retesting
                </th>

                <ColumnHeader
                  title="Developer Remark"
                  columnKey="remark"
                  sortKey={sortKey}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  filterValue={columnFilters.remark}
                  onFilterChange={handleFilterChange}
                  className="w-56 border-r border-slate-700"
                />

                <th className="p-2.5 w-64 border-r border-slate-700 font-semibold">
                  Evidence (Screenshots / Files)
                </th>

                <th className="p-2.5 w-24 text-center font-semibold">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 text-slate-800">
              {filteredObservations.map((obs, index) => (
                <tr key={obs.id} className="hover:bg-slate-50 transition-colors">
                  {/* # */}
                  <td className="p-2 text-center text-slate-400 font-mono text-[11px] border-r border-slate-100 bg-slate-50/50">
                    {index + 1}
                  </td>

                  {/* Serial No */}
                  <td className="p-1 border-r border-slate-100">
                    <input
                      type="text"
                      value={obs.serialNo}
                      onChange={(e) => handleCellChange(obs.id, 'serialNo', e.target.value)}
                      className="w-full px-2 py-1 font-mono text-slate-700 bg-transparent hover:bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 rounded text-xs"
                    />
                  </td>

                  {/* Type */}
                  <td className="p-1 border-r border-slate-100">
                    <select
                      value={obs.type || 'Observation'}
                      onChange={(e) => handleCellChange(obs.id, 'type', e.target.value as any)}
                      className={`w-full px-2 py-1 rounded text-xs font-bold border-0 focus:ring-1 focus:ring-blue-500 cursor-pointer ${
                        obs.type === 'RFE'
                          ? 'bg-purple-100 text-purple-900 font-semibold'
                          : 'bg-amber-100 text-amber-900 font-semibold'
                      }`}
                    >
                      <option value="Observation">Observation</option>
                      <option value="RFE">RFE</option>
                    </select>
                  </td>

                  {/* Observation / RFE text */}
                  <td className="p-1 border-r border-slate-100">
                    <textarea
                      rows={2}
                      value={obs.observationRFE}
                      onChange={(e) => handleCellChange(obs.id, 'observationRFE', e.target.value)}
                      onBlur={(e) => handleCellChange(obs.id, 'observationRFE', correctSpelling(e.target.value))}
                      placeholder="Describe observation, issue, or RFE suggestion..."
                      className="w-full px-2 py-1 text-slate-800 bg-transparent hover:bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 rounded text-xs resize-y"
                    />
                  </td>

                  {/* Priority */}
                  <td className="p-1 border-r border-slate-100 text-center">
                    <select
                      value={obs.priority || 'High'}
                      onChange={(e) => handleCellChange(obs.id, 'priority', e.target.value)}
                      className={`px-2 py-1 rounded text-[11px] font-bold border-0 focus:ring-1 focus:ring-blue-500 cursor-pointer ${
                        obs.priority === 'Critical'
                          ? 'bg-red-100 text-red-900 font-bold'
                          : obs.priority === 'High'
                          ? 'bg-orange-100 text-orange-900'
                          : obs.priority === 'Medium'
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      <option value="Critical">Critical</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </td>

                  {/* Status */}
                  <td className="p-1 border-r border-slate-100 text-center">
                    <select
                      value={obs.status}
                      onChange={(e) => handleCellChange(obs.id, 'status', e.target.value)}
                      className={`px-2 py-1 rounded text-[11px] font-bold border-0 focus:ring-1 focus:ring-blue-500 cursor-pointer ${
                        obs.status === 'Fixed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : obs.status === 'Pending'
                          ? 'bg-amber-100 text-amber-800'
                          : obs.status === 'Not required for this ticket'
                          ? 'bg-slate-200 text-slate-700'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      <option value="Open">Open</option>
                      <option value="Fixed">Fixed</option>
                      <option value="Pending">Pending</option>
                      <option value="Not required for this ticket">Not required for this ticket</option>
                    </select>
                  </td>

                  {/* Retesting */}
                  <td className="p-1 border-r border-slate-100 text-center">
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={obs.retesting}
                      onChange={(e) => handleCellChange(obs.id, 'retesting', parseInt(e.target.value) || 1)}
                      className="w-12 px-1 py-1 text-center font-mono text-xs bg-transparent hover:bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 rounded"
                    />
                  </td>

                  {/* Remark */}
                  <td className="p-1 border-r border-slate-100">
                    <textarea
                      rows={2}
                      value={obs.remark || ''}
                      onChange={(e) => handleCellChange(obs.id, 'remark', e.target.value)}
                      placeholder="Developer or QA note..."
                      className="w-full px-2 py-1 text-slate-700 bg-transparent hover:bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 rounded text-xs resize-y"
                    />
                  </td>

                  {/* Evidence (Multi-screenshot attach + Ctrl+V) */}
                  <td className="p-1 border-r border-slate-100">
                    <RowAttachmentsCell
                      id={`obs-att-${obs.id}`}
                      attachments={obs.attachments || []}
                      fallbackScreenshotName={obs.screenshotName}
                      fallbackScreenshotUrl={obs.screenshotUrl}
                      onAddAttachment={(file) => handleAddAttachment(obs.id, file)}
                      onRemoveAttachment={(attId) => handleRemoveAttachment(obs.id, attId)}
                    />
                  </td>

                  {/* Actions */}
                  <td className="p-1 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleCellChange(obs.id, 'observationRFE', polishObservationText(obs.observationRFE))}
                        title="AI Polish row text"
                        className="px-1.5 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold rounded cursor-pointer hover:bg-purple-100"
                      >
                        Polish
                      </button>
                      <button
                        onClick={() => handleDuplicateRow(obs.id)}
                        title="Duplicate row"
                        className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteRow(obs.id)}
                        title="Delete row"
                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {/* NO ITEM EMPTY STATE IN TABLE */}
              {filteredObservations.length === 0 && (
                <tr>
                  <td colSpan={10} className="p-12 text-center bg-slate-50/50">
                    <div className="flex flex-col items-center justify-center space-y-2.5">
                      <span className="px-4 py-1 bg-slate-100 text-slate-700 rounded-full font-bold text-xs tracking-wider uppercase border border-slate-200 shadow-2xs">
                        NO item
                      </span>
                      <p className="text-xs text-slate-500 max-w-sm">
                        No {selectedTypeFilter === 'ALL' ? 'observations or RFEs' : selectedTypeFilter + 's'} found for Ticket #{header.ticketNo}. Click below to auto-generate with AI or add manually.
                      </p>
                      <button
                        onClick={handleAiGenerateObservations}
                        className="mt-1 px-4 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                        <span>✨ AI Auto-Generate Observations for #{header.ticketNo}</span>
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Toolbar & Summary Statistics */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <button
            onClick={handleAddRow}
            className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold rounded shadow-2xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-blue-600" />
            <span>+ Insert Observation Row</span>
          </button>

          <div className="flex flex-wrap items-center gap-4 text-slate-500">
            <div>
              Total Items: <strong className="text-slate-800">{observations.length}</strong>
            </div>
            <div>
              Observations:{' '}
              <strong className="text-amber-700">
                {observations.filter((o) => (o.type || 'Observation') === 'Observation').length}
              </strong>
            </div>
            <div>
              RFEs:{' '}
              <strong className="text-purple-700">
                {observations.filter((o) => o.type === 'RFE').length}
              </strong>
            </div>
            <div>
              Fixed:{' '}
              <strong className="text-emerald-700">
                {observations.filter((o) => o.status === 'Fixed').length}
              </strong>
            </div>
            <div>
              Pending:{' '}
              <strong className="text-amber-700">
                {observations.filter((o) => o.status === 'Pending').length}
              </strong>
            </div>
            <div>
              Not Required:{' '}
              <strong className="text-slate-600">
                {observations.filter((o) => o.status === 'Not required for this ticket').length}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* Azure DevOps Direct Attachment Modal */}
      <AzureDevopsModal
        isOpen={isAdoModalOpen}
        onClose={() => setIsAdoModalOpen(false)}
        ticketNumber={header.ticketNo}
        taskName={header.ticketName}
        getFileBlob={() => getObservationsExcelBlob(header, observations)}
        defaultComment={`Observation & RFE Log for "${header.ticketName}" (Ticket #${header.ticketNo}) reported by ${header.qaOwner}. Total Records: ${observations.length} (Observations: ${observations.filter((o) => (o.type || 'Observation') === 'Observation').length}, RFEs: ${observations.filter((o) => o.type === 'RFE').length}).`}
        onSuccessNotice={(msg) => {
          setAdoNotification(msg);
          setTimeout(() => setAdoNotification(null), 5000);
        }}
      />
    </div>
  );
};
