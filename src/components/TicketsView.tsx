import React, { useState, useMemo } from 'react';
import { Ticket, Plus, Search, Filter, CheckCircle2, AlertTriangle, PlayCircle, UploadCloud, X, ArrowUpDown, DownloadCloud, Loader2, Trash2, Key, Building, FolderGit2, Info, Sparkles, Wand2, Copy, Layers } from 'lucide-react';
import { TicketSummary, BeaconModule, UserProfile } from '../types';
import { AzureDevopsModal } from './common/AzureDevopsModal';
import { fetchWorkItemFromAzure, loadSavedAdoConfig, saveAdoConfig } from '../utils/azureDevopsService';
import { getTestCasesExcelBlob } from '../utils/excelExport';
import { generateTicketDetailsWithAi } from '../utils/aiGenerator';
import { getAllCreatedTicketsOnSystem } from '../data/dbStore';

interface TicketsViewProps {
  tickets: TicketSummary[];
  modules: BeaconModule[];
  currentUser: UserProfile;
  onSelectTicket: (ticket: TicketSummary) => void;
  onNavigateTab: (tab: any) => void;
  onAddTicket?: (newTicket: TicketSummary) => void;
  onDeleteTicket?: (ticketNumber: string, mode: 'all_modules' | 'tickets_tab_only') => void;
}

export const TicketsView: React.FC<TicketsViewProps> = ({
  tickets,
  modules,
  currentUser,
  onSelectTicket,
  onNavigateTab,
  onAddTicket,
  onDeleteTicket,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [moduleFilter, setModuleFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [qaFilter, setQaFilter] = useState<string>('all');

  // Delete ticket confirmation modal state
  const [deleteTicketTarget, setDeleteTicketTarget] = useState<TicketSummary | null>(null);
  const [deleteMode, setDeleteMode] = useState<'all_modules' | 'tickets_tab_only'>('all_modules');

  // Azure DevOps Modal state
  const [isAdoModalOpen, setIsAdoModalOpen] = useState(false);
  const [selectedAdoTicket, setSelectedAdoTicket] = useState<TicketSummary | null>(null);

  // New Ticket Creation Modal state
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
  const [newTicketId, setNewTicketId] = useState('');
  const [newFeatureName, setNewFeatureName] = useState('');
  const [newModuleId, setNewModuleId] = useState(modules[0]?.id || 'mod-1');
  const [customModuleName, setCustomModuleName] = useState('');
  const [newDeveloper, setNewDeveloper] = useState('');
  const [newQaAssignee, setNewQaAssignee] = useState(currentUser?.name || 'Maseera Sayyed');
  const [newBaName, setNewBaName] = useState('');
  const [newClientName, setNewClientName] = useState('CAGL');
  const [newDescription, setNewDescription] = useState('');
  const [newTestingScenarios, setNewTestingScenarios] = useState('');
  const [newPriority, setNewPriority] = useState<'Critical' | 'High' | 'Medium' | 'Low'>('High');
  const [isAiGeneratingTicket, setIsAiGeneratingTicket] = useState(false);

  // Azure DevOps Config & Fetch state
  const [adoOrg, setAdoOrg] = useState('quantumphinance');
  const [adoProject, setAdoProject] = useState('Beacon Web');
  const [adoPat, setAdoPat] = useState('');
  const [showAdoConfig, setShowAdoConfig] = useState(false);
  const [isFetchingAdo, setIsFetchingAdo] = useState(false);
  const [adoFetchMessage, setAdoFetchMessage] = useState<{ type: 'success' | 'error'; text: string; detail?: string } | null>(null);

  // System-wide tickets created on this client system across all modules
  const systemTicketsList = useMemo(() => {
    const map = new Map<string, TicketSummary>();
    tickets.forEach((t) => {
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

  const [fetchedHeaderNotice, setFetchedHeaderNotice] = useState<string | null>(null);

  // Auto-fetch headers when selecting an existing ticket from dropdown
  const handleSelectExistingTicket = (selectedId: string) => {
    if (!selectedId) return;
    const cleanId = selectedId.trim().toLowerCase().replace('#', '');
    const matched = systemTicketsList.find(
      (t) => t.ticketNumber.trim().toLowerCase().replace('#', '') === cleanId
    );
    if (!matched) return;

    setNewTicketId(matched.ticketNumber);
    setNewFeatureName(matched.featureName || '');
    if (matched.priority) setNewPriority(matched.priority);
    if (matched.developer) setNewDeveloper(matched.developer);
    if (matched.qaAssignee) setNewQaAssignee(matched.qaAssignee);

    setFetchedHeaderNotice(
      `✅ Headers auto-fetched from Ticket #${matched.ticketNumber} (Originally in: ${matched.moduleName || 'General'}). Select your target module below to link it.`
    );
  };

  // Handle typing ticket ID: auto-fetch headers if matches an existing ticket
  const handleTicketIdChange = (val: string) => {
    setNewTicketId(val);
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
        if (matched.moduleId) setNewModuleId(matched.moduleId);
        if (matched.clientName) setNewClientName(matched.clientName);
        setFetchedHeaderNotice(
          `✅ Headers auto-fetched from existing Ticket #${matched.ticketNumber} (${matched.moduleName || 'General'}). Click "Fetch from Azure" to refresh live from Azure DevOps.`
        );
        return;
      }
    }
    if (fetchedHeaderNotice) setFetchedHeaderNotice(null);
  };

  // Load ADO settings when opening modal
  const handleOpenNewTicketModal = () => {
    const saved = loadSavedAdoConfig();
    if (saved.organization) setAdoOrg(saved.organization);
    // Auto-correct invalid project name (QA HUB is the GitHub app repo name, not an ADO project)
    if (saved.project && saved.project !== 'QA HUB') {
      setAdoProject(saved.project);
    } else {
      setAdoProject('Beacon Web');
    }
    if (saved.personalAccessToken) setAdoPat(saved.personalAccessToken);
    setNewDeveloper('');
    setNewQaAssignee(currentUser?.name || 'Maseera Sayyed');
    setNewBaName('');
    setNewClientName('CAGL');
    setNewDescription('');
    setNewTestingScenarios('');
    setAdoFetchMessage(null);
    setFetchedHeaderNotice(null);
    setIsNewTicketOpen(true);
  };

  const handleFetchFromAzure = async () => {
    if (!newTicketId.trim()) {
      setAdoFetchMessage({ type: 'error', text: 'Please enter a Ticket / Work Item ID first.' });
      return;
    }

    // Save config if PAT/Org/Project modified
    if (adoPat.trim() || adoOrg.trim() || adoProject.trim()) {
      saveAdoConfig({
        organization: adoOrg.trim() || 'quantumphinance',
        project: adoProject.trim() || 'InsightCorp',
        personalAccessToken: adoPat.trim(),
      });
    }

    setIsFetchingAdo(true);
    setAdoFetchMessage(null);

    const res = await fetchWorkItemFromAzure({
      organization: adoOrg,
      project: adoProject,
      workItemId: newTicketId.trim(),
      pat: adoPat,
    });
    setIsFetchingAdo(false);

    if (res.success) {
      if (res.title) setNewFeatureName(res.title);
      if (res.priority) setNewPriority(res.priority);
      if (res.qaAssignee || res.assignee) setNewQaAssignee(res.qaAssignee || res.assignee);
      if (res.developer) setNewDeveloper(res.developer);
      if (res.assignedBa || res.ba) setNewBaName(res.assignedBa || res.ba);
      if (res.clientName) setNewClientName(res.clientName);
      if (res.description) setNewDescription(res.description);
      if (res.testingScenarios) setNewTestingScenarios(res.testingScenarios);

      // Match module from response or searchText
      if (res.suggestedModuleId) {
        setNewModuleId(res.suggestedModuleId);
      } else {
        const fullSearch = `${res.title || ''} ${res.areaPath || ''} ${res.description || ''}`.toLowerCase();
        if (
          fullSearch.includes('mutual fund') ||
          fullSearch.includes('mutual funds') ||
          fullSearch.includes('nav') ||
          fullSearch.includes('unit split') ||
          fullSearch.includes('uti liquid') ||
          /\bmf\b/.test(fullSearch)
        ) {
          const mf = modules.find((m) => m.code === 'MF' || m.name.toLowerCase().includes('mutual'));
          if (mf) setNewModuleId(mf.id);
        } else {
          for (const m of modules) {
            const cleanName = m.name.replace(/\([^)]*\)/g, '').trim().toLowerCase();
            if (cleanName.length > 3 && fullSearch.includes(cleanName)) {
              setNewModuleId(m.id);
              break;
            }
          }
        }
      }

      setFetchedHeaderNotice(null);
      setAdoFetchMessage({
        type: 'success',
        text: `Fetched directly from Azure DevOps: Dev: "${res.developer}", QA: "${res.qaAssignee || res.assignee}", Priority: "${res.priority}"${res.clientName ? `, Client: "${res.clientName}"` : ''}`,
      });
    } else {
      setAdoFetchMessage({
        type: 'error',
        text: res.message || 'Could not fetch from Azure DevOps API.',
        detail: res.errorDetail,
      });
      // Automatically expand PAT config view if missing PAT
      if (!adoPat.trim()) {
        setShowAdoConfig(true);
      }
    }
  };

  // Quick smart fill for ticket when Azure PAT is not yet available
  const handleQuickAiFillForTicketId = () => {
    const cleanId = newTicketId.trim().replace('#', '');
    const currentMod = modules.find((m) => m.id === newModuleId);
    const modName = currentMod ? currentMod.name : 'Term Loan';

    const defaultFeatureName = newFeatureName.trim()
      ? newFeatureName.trim()
      : cleanId === '24777'
      ? 'Penalty interest computation & grace period logic for Cash Credit'
      : `${modName} Transaction Processing & Regulatory Compliance Workflow`;

    setNewFeatureName(defaultFeatureName);
    const details = generateTicketDetailsWithAi(defaultFeatureName, modName);
    setNewPriority(details.priority || 'High');
    if (!newDeveloper.trim()) setNewDeveloper('Beacon Engineering Team');
    if (!newQaAssignee.trim()) setNewQaAssignee(currentUser?.name || 'Maseera Sayyed');

    setAdoFetchMessage({
      type: 'success',
      text: `✨ Smart headers populated for Ticket #${cleanId || 'WorkItem'} (${modName})! You can edit any values below.`,
    });
  };

  // User Role-based ticket filtering: Super Admin sees all, other users see only their created or assigned tickets
  const isSuperAdmin = currentUser?.role === 'Super Admin' || currentUser?.email?.toLowerCase().includes('maseera');

  const roleFilteredTickets = useMemo(() => {
    if (!currentUser || isSuperAdmin) return tickets;
    const normUser = (currentUser.name || '').toLowerCase().trim();
    const normEmail = (currentUser.email || '').toLowerCase().trim();
    return tickets.filter((t) => {
      const creator = (t.createdBy || '').toLowerCase();
      const creatorEmail = (t.creatorEmail || '').toLowerCase();
      const qa = (t.qaAssignee || '').toLowerCase();
      const dev = (t.developer || '').toLowerCase();
      return (
        (normUser && (creator.includes(normUser) || normUser.includes(creator))) ||
        (normEmail && creatorEmail === normEmail) ||
        (normUser && (qa.includes(normUser) || normUser.includes(qa))) ||
        (normUser && (dev.includes(normUser) || normUser.includes(dev)))
      );
    });
  }, [tickets, currentUser, isSuperAdmin]);

  // Unique QA assignees
  const qaAssignees = useMemo(() => {
    const set = new Set<string>();
    roleFilteredTickets.forEach((t) => {
      if (t.qaAssignee) set.add(t.qaAssignee);
    });
    return Array.from(set);
  }, [roleFilteredTickets]);

  // Comprehensive Search & Filter pipeline
  const filteredTickets = useMemo(() => {
    return roleFilteredTickets.filter((t) => {
      const matchesSearch =
        t.ticketNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.featureName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.moduleName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.developer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.qaAssignee.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.priority.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
      const matchesModule = moduleFilter === 'all' || t.moduleId === moduleFilter || t.moduleName.toLowerCase() === moduleFilter.toLowerCase();
      const matchesPriority = priorityFilter === 'all' || t.priority === priorityFilter;
      const matchesQa = qaFilter === 'all' || t.qaAssignee.toLowerCase() === qaFilter.toLowerCase();

      return matchesSearch && matchesStatus && matchesModule && matchesPriority && matchesQa;
    });
  }, [roleFilteredTickets, searchTerm, statusFilter, moduleFilter, priorityFilter, qaFilter]);

  const handleAiGenerateTicketDetails = async () => {
    if (!newFeatureName.trim()) {
      alert('Please enter at least a partial Feature / Task Name first to generate AI details.');
      return;
    }
    setIsAiGeneratingTicket(true);
    const modName = newModuleId === 'other' ? (customModuleName || 'Other') : (modules.find(m => m.id === newModuleId)?.name || 'General');
    const aiDetails = await generateTicketDetailsWithAi(newFeatureName, modName);
    setIsAiGeneratingTicket(false);

    if (aiDetails.suggestedTitle) setNewFeatureName(aiDetails.suggestedTitle);
    if (aiDetails.priority) setNewPriority(aiDetails.priority);
  };

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicketId.trim() || !newFeatureName.trim()) {
      alert('Please provide Azure DevOps Ticket ID and Feature Name.');
      return;
    }

    let finalModuleId = newModuleId;
    let finalModuleName = '';
    if (newModuleId === 'other') {
      finalModuleName = customModuleName.trim() || 'Other';
      finalModuleId = `mod-custom-${Date.now()}`;
    } else {
      const mod = modules.find((m) => m.id === newModuleId) || modules[0];
      finalModuleId = mod?.id || 'mod-1';
      finalModuleName = mod?.name || 'General';
    }

    const matchedExisting = systemTicketsList.find(
      (t) => t.ticketNumber.trim().toLowerCase().replace('#', '') === newTicketId.trim().toLowerCase().replace('#', '')
    );

    const ticketToAdd: TicketSummary = {
      id: `t-${Date.now()}`,
      ticketNumber: newTicketId.trim(),
      featureName: newFeatureName.trim(),
      moduleId: finalModuleId,
      moduleName: finalModuleName,
      developer: newDeveloper.trim() || (matchedExisting?.developer || ''),
      qaAssignee: newQaAssignee.trim() || (matchedExisting?.qaAssignee || currentUser?.name || ''),
      createdBy: currentUser?.name || '',
      creatorEmail: currentUser?.email || '',
      signOffBy: '',
      clientName: newClientName.trim() || matchedExisting?.clientName || 'CAGL',
      shaCommit: matchedExisting?.shaCommit || `SHA-1: ${Math.random().toString(36).substring(2, 10)}`,
      priority: newPriority,
      status: 'Ready for QA',
      testCasesCount: 0,
      passedCount: 0,
      failedCount: 0,
      blockedCount: 0,
      observationsCount: 0,
      receivedDate: new Date().toISOString().split('T')[0],
      description: newDescription.trim() || matchedExisting?.description || `Feature ticket #${newTicketId.trim()} created for ${newFeatureName.trim()} in ${finalModuleName} module.`,
      scenarioDetails: newTestingScenarios.trim() || matchedExisting?.scenarioDetails || `Scenario 1: Verify core functionality of ${newFeatureName.trim()}.\nScenario 2: Boundary validation and invalid state checks.`,
      impactPoints: matchedExisting?.impactPoints || [`${finalModuleName} Core Engine`, 'Financial Ledger & Reports'],
      testingScenarios: newTestingScenarios.trim() || matchedExisting?.testingScenarios || `Verify end-to-end user workflows for ${newFeatureName.trim()}.\nVerify input edge-cases and error validations.`,
    };

    onAddTicket?.(ticketToAdd);
    setIsNewTicketOpen(false);
    setFetchedHeaderNotice(null);
    setNewTicketId('');
    setNewFeatureName('');
    setCustomModuleName('');
    setNewBaName('');
    setNewClientName('CAGL');
    setNewDescription('');
    setNewTestingScenarios('');
  };

  return (
    <div className="p-6 max-w-[1500px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-blue-50 text-blue-600 rounded-md border border-blue-100">
              <Ticket className="w-4 h-4" />
            </span>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Beacon Azure DevOps Ticket Queue
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Linked by Ticket ID across all tabs. Track features, QA assignees, test case counts, and pending observations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenNewTicketModal}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-md flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Azure DevOps Ticket</span>
          </button>
        </div>
      </div>

      {/* Authority Level Info Banner */}
      <div
        className={`px-4 py-2.5 rounded-lg border text-xs flex items-center justify-between gap-3 ${
          isSuperAdmin
            ? 'bg-purple-50/80 border-purple-200 text-purple-900'
            : 'bg-blue-50/80 border-blue-200 text-blue-900'
        }`}
      >
        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
              isSuperAdmin ? 'bg-purple-600 text-white' : 'bg-blue-600 text-white'
            }`}
          >
            {isSuperAdmin ? 'SUPER ADMIN' : `${currentUser?.role?.toUpperCase() || 'USER'} SCOPE`}
          </span>
          <span className="font-medium">
            {isSuperAdmin
              ? `Super Admin Authority Active: Viewing all tickets (${roleFilteredTickets.length}) across all Quantum Phinance team members.`
              : `Scoped Workspace: Showing only tickets created by or assigned to you (${currentUser?.name}) (${roleFilteredTickets.length} tickets). Other team members' tickets are hidden.`}
          </span>
        </div>
        <div className="text-[11px] text-slate-500 font-semibold hidden md:block">
          Logged in as: <span className="font-bold text-slate-700">{currentUser?.name}</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-3 text-xs">
          {/* Search Box */}
          <div className="relative w-full lg:w-80">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search ticket #, feature, module, QA or developer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 pl-8 pr-4 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none focus:bg-white text-slate-800"
            />
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            {/* Module Filter */}
            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="all">All Modules ({modules.length})</option>
              {modules.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>

            {/* QA Filter */}
            <select
              value={qaFilter}
              onChange={(e) => setQaFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="all">All QA Assignees</option>
              {qaAssignees.map((qa) => (
                <option key={qa} value={qa}>
                  {qa}
                </option>
              ))}
            </select>

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="all">All Priorities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </div>

        {/* Status Quick Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-slate-100">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Status:</span>
          {['all', 'Ready for QA', 'In Testing', 'Observation Raised', 'Passed'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1 rounded-md text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                statusFilter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {status === 'all' ? 'All Statuses' : status}
            </button>
          ))}
        </div>
      </div>

      {/* Tickets Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[1000px]">
            <thead className="bg-[#1E293B] text-slate-200 uppercase font-semibold text-[10px] tracking-wider">
              <tr>
                <th className="p-3 font-semibold">Ticket ID #</th>
                <th className="p-3 font-semibold">Feature &amp; Module</th>
                <th className="p-3 font-semibold">Priority</th>
                <th className="p-3 font-semibold">Developer / QA</th>
                <th className="p-3 font-semibold text-center">Test Cases Written</th>
                <th className="p-3 font-semibold text-center">Pending Obs</th>
                <th className="p-3 font-semibold">Status</th>
                <th className="p-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredTickets.map((t) => (
                <tr key={t.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="p-3 font-mono font-bold text-blue-600">{t.ticketNumber}</td>
                  <td className="p-3">
                    <div className="font-bold text-slate-900 max-w-xs truncate">{t.featureName}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{t.moduleName}</div>
                  </td>
                  <td className="p-3">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        t.priority === 'Critical'
                          ? 'bg-red-100 text-red-600'
                          : t.priority === 'High'
                          ? 'bg-orange-100 text-orange-600'
                          : 'bg-blue-100 text-blue-600'
                      }`}
                    >
                      {t.priority}
                    </span>
                  </td>
                  <td className="p-3 text-[11px]">
                    <div>Dev: <strong className="text-slate-700">{t.developer}</strong></div>
                    <div className="text-slate-500">QA: <strong className="text-slate-700">{t.qaAssignee}</strong></div>
                  </td>
                  <td className="p-3 text-center">
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded font-mono font-bold text-xs">
                      {t.testCasesCount} Cases ({t.passedCount} Passed)
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded font-mono font-bold text-xs ${
                        t.observationsCount > 0
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {t.observationsCount} Pending
                    </span>
                  </td>
                  <td className="p-3">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-bold border ${
                        t.status === 'In Testing'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : t.status === 'Observation Raised'
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td className="p-3 text-right space-x-1.5">
                    <button
                      onClick={() => {
                        onSelectTicket(t);
                        onNavigateTab('ai-test-hub');
                      }}
                      className="px-2.5 py-1 text-[11px] font-semibold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors cursor-pointer"
                    >
                      AI Test Hub
                    </button>
                    <button
                      onClick={() => {
                        onSelectTicket(t);
                        onNavigateTab('observations');
                      }}
                      className="px-2.5 py-1 text-[11px] font-semibold text-red-700 hover:text-red-900 bg-red-50 hover:bg-red-100 rounded border border-red-200 transition-colors cursor-pointer"
                    >
                      Obs ({t.observationsCount})
                    </button>
                    <button
                      onClick={() => {
                        setSelectedAdoTicket(t);
                        setIsAdoModalOpen(true);
                      }}
                      title="Attach directly to Azure DevOps Work Item"
                      className="px-2 py-1 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 rounded text-[11px] font-semibold transition-colors inline-flex items-center gap-1 cursor-pointer"
                    >
                      <UploadCloud className="w-3 h-3" />
                      <span>Attach</span>
                    </button>
                    <button
                      onClick={() => {
                        setDeleteTicketTarget(t);
                        setDeleteMode('all_modules');
                      }}
                      title="Delete ticket with options"
                      className="px-2 py-1 bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-700 rounded text-[11px] font-semibold transition-colors inline-flex items-center gap-1 cursor-pointer border border-rose-200 hover:border-rose-600"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Delete</span>
                    </button>
                  </td>
                </tr>
              ))}

              {filteredTickets.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-12 text-center bg-slate-50/40">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <span className="px-3.5 py-1 bg-slate-100 text-slate-700 rounded-full font-bold text-xs tracking-wider uppercase border border-slate-200">
                        NO item
                      </span>
                      <p className="text-xs text-slate-500 max-w-sm">
                        No tickets found matching your search or filters. Click &quot;+ Add Azure Ticket&quot; to create one.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Ticket Creation Modal */}
      {isNewTicketOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <h2 className="text-sm font-bold flex items-center gap-2">
                <Ticket className="w-4 h-4 text-blue-400" />
                <span>Add Azure DevOps Ticket</span>
              </h2>
              <button
                onClick={() => setIsNewTicketOpen(false)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="p-5 space-y-3.5 text-xs">
              {/* Dropdown to select Ticket ID created on this system to reuse in another module */}
              {systemTicketsList.length > 0 && (
                <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                      <Copy className="w-3.5 h-3.5 text-blue-600" />
                      <span>Select Existing Ticket ID (Copy Headers to Another Module)</span>
                    </label>
                    <span className="text-[10px] font-semibold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full border border-blue-200">
                      {systemTicketsList.length} tickets on this system
                    </span>
                  </div>
                  <select
                    value=""
                    onChange={(e) => handleSelectExistingTicket(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-blue-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="">-- Choose Ticket ID to copy headers across modules --</option>
                    {systemTicketsList.map((st) => (
                      <option key={`${st.id}-${st.ticketNumber}`} value={st.ticketNumber}>
                        #{st.ticketNumber} — {st.featureName} (Module: {st.moduleName || 'General'})
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-blue-700 leading-relaxed">
                    Selecting a ticket automatically fetches its title, priority, developer, and QA assignee headers. You can then choose a different module below to link it.
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
                  Azure DevOps Ticket ID / Work Item #
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    list="existing-tickets-datalist"
                    placeholder="e.g. 21654 or BCN-4920"
                    value={newTicketId}
                    onChange={(e) => handleTicketIdChange(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-900"
                  />
                  <datalist id="existing-tickets-datalist">
                    {systemTicketsList.map((st) => (
                      <option key={`dl-${st.ticketNumber}`} value={st.ticketNumber}>
                        {st.featureName} ({st.moduleName})
                      </option>
                    ))}
                  </datalist>
                  <button
                    type="button"
                    onClick={handleFetchFromAzure}
                    disabled={isFetchingAdo || !newTicketId.trim()}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    {isFetchingAdo ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <DownloadCloud className="w-3.5 h-3.5" />
                    )}
                    <span>Fetch from Azure</span>
                  </button>
                </div>

                {adoFetchMessage && (
                  <div
                    className={`p-2.5 rounded-lg border text-[11px] mt-2 ${
                      adoFetchMessage.type === 'success'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                        : 'bg-amber-50 border-amber-300 text-amber-900'
                    }`}
                  >
                    <div className="flex items-start gap-1.5 font-semibold">
                      {adoFetchMessage.type === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      )}
                      <span>{adoFetchMessage.text}</span>
                    </div>
                    {adoFetchMessage.detail && (
                      <div className="mt-1 font-mono text-[10px] bg-white/80 p-1.5 rounded border border-slate-200 text-slate-700 max-h-20 overflow-y-auto">
                        {adoFetchMessage.detail}
                      </div>
                    )}
                    {adoFetchMessage.type === 'error' && (
                      <div className="mt-2 pt-2 border-t border-amber-200/80 flex items-center justify-between gap-2">
                        <span className="text-[10px] text-amber-800">
                          Need instant ticket headers without Azure PAT?
                        </span>
                        <button
                          type="button"
                          onClick={handleQuickAiFillForTicketId}
                          className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white font-bold text-[10px] rounded flex items-center gap-1 cursor-pointer transition-colors shrink-0 shadow-2xs"
                        >
                          <Sparkles className="w-3 h-3 text-purple-200" />
                          <span>Auto-fill #{newTicketId || 'Ticket'} with AI</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Azure DevOps Connection / PAT Settings Toggle */}
                <div className="mt-2.5 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setShowAdoConfig(!showAdoConfig)}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                    >
                      <Key className="w-3 h-3" />
                      <span>{showAdoConfig ? 'Hide' : 'Configure'} Azure DevOps Live Sync (Optional)</span>
                    </button>
                    <span className="text-[10px] text-slate-500 italic">
                      {adoPat ? '✓ PAT configured' : 'PAT is optional'}
                    </span>
                  </div>

                  {showAdoConfig && (
                    <div className="mt-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-slate-700">
                      <div className="p-2 bg-blue-50/70 border border-blue-200 rounded text-[10px] text-blue-900 leading-relaxed">
                        <strong>💡 Do all users need a PAT?</strong> No! PAT is only needed if you want live sync directly from Azure DevOps. Any user can create tickets directly or click <em>&ldquo;Auto-fill with AI&rdquo;</em> without any PAT. If saved once, it stays saved so you don&apos;t have to enter it every time!
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-slate-600 flex items-center gap-1">
                            <Building className="w-3 h-3 text-slate-500" />
                            <span>Org Name</span>
                          </label>
                          <input
                            type="text"
                            value={adoOrg}
                            onChange={(e) => setAdoOrg(e.target.value)}
                            placeholder="quantumphinance"
                            className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-[11px] focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-600 flex items-center gap-1">
                            <FolderGit2 className="w-3 h-3 text-slate-500" />
                            <span>Project Name</span>
                          </label>
                          <input
                            type="text"
                            value={adoProject}
                            onChange={(e) => setAdoProject(e.target.value)}
                            placeholder="Beacon"
                            className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-[11px] focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-600 flex items-center gap-1">
                          <Key className="w-3 h-3 text-amber-600" />
                          <span>Personal Access Token (PAT)</span>
                        </label>
                        <input
                          type="password"
                          value={adoPat}
                          onChange={(e) => setAdoPat(e.target.value)}
                          placeholder="Paste PAT once to save for your workspace"
                          className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-[11px] font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                          <Info className="w-3 h-3 text-blue-500 shrink-0" />
                          <span>Requires &apos;Work Items (Read)&apos; permission. Once pasted, click &apos;Fetch from Azure&apos; to verify and save.</span>
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-700 font-bold">
                    Feature / Task Name
                  </label>
                  <button
                    type="button"
                    onClick={handleAiGenerateTicketDetails}
                    disabled={isAiGeneratingTicket}
                    className="text-[11px] text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2 py-0.5 rounded font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Sparkles className="w-3 h-3 text-purple-600 animate-spin-slow" />
                    <span>{isAiGeneratingTicket ? 'AI Generating...' : '✨ AI Polish & Details'}</span>
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
                  <label className="block text-slate-700 font-bold mb-1">Module</label>
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
                  <label className="block text-slate-700 font-bold mb-1">Assigned QA</label>
                  <input
                    type="text"
                    value={newQaAssignee}
                    onChange={(e) => setNewQaAssignee(e.target.value)}
                    placeholder="e.g. Maseera Sayyed"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Assigned BA</label>
                  <input
                    type="text"
                    value={newBaName}
                    onChange={(e) => setNewBaName(e.target.value)}
                    placeholder="e.g. Bhavik Bhanushali"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Client Name</label>
                  <input
                    type="text"
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    placeholder="e.g. CAGL"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewTicketOpen(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg cursor-pointer"
                >
                  Create Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Azure DevOps Direct Attachment Modal */}
      {selectedAdoTicket && (
        <AzureDevopsModal
          isOpen={isAdoModalOpen}
          onClose={() => setIsAdoModalOpen(false)}
          ticketNumber={selectedAdoTicket.ticketNumber}
          taskName={selectedAdoTicket.featureName}
          getFileBlob={() =>
            getTestCasesExcelBlob(
              {
                ticketNo: selectedAdoTicket.ticketNumber,
                clientName: selectedAdoTicket.clientName || 'Treasury Master',
                sha: selectedAdoTicket.shaCommit || 'SHA-1: 4710b619ea012cba75ee657d64ebd49e656948df*',
                taskName: selectedAdoTicket.featureName,
                taskDoneBy: selectedAdoTicket.qaAssignee || 'Maseera Sayyed',
                signOffBy: selectedAdoTicket.signOffBy || '',
              },
              []
            )
          }
          defaultComment={`QA Test Cases & Execution Matrix for "${selectedAdoTicket.featureName}" (Ticket #${selectedAdoTicket.ticketNumber}) verified by ${selectedAdoTicket.qaAssignee}.`}
        />
      )}
      {/* Delete Ticket Confirmation Modal */}
      {deleteTicketTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden">
            <div className="bg-rose-600 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-rose-200" />
                <h3 className="text-sm font-bold">
                  Delete Ticket #{deleteTicketTarget.ticketNumber}
                </h3>
              </div>
              <button
                onClick={() => setDeleteTicketTarget(null)}
                className="text-rose-200 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <p className="font-bold text-slate-800">{deleteTicketTarget.featureName}</p>
                <div className="flex items-center gap-3 text-slate-500 text-[11px] mt-1">
                  <span>Module: <strong>{deleteTicketTarget.moduleName}</strong></span>
                  <span>QA: <strong>{deleteTicketTarget.qaAssignee}</strong></span>
                </div>
              </div>

              <p className="font-bold text-slate-700">
                Choose deletion scope (Delete ka tarika chunein):
              </p>

              <div className="space-y-2.5">
                {/* Option 1: Delete from Every Module */}
                <label
                  onClick={() => setDeleteMode('all_modules')}
                  className={`block p-3 rounded-xl border-2 cursor-pointer transition-all ${
                    deleteMode === 'all_modules'
                      ? 'border-rose-500 bg-rose-50/60'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <input
                      type="radio"
                      name="deleteMode"
                      checked={deleteMode === 'all_modules'}
                      onChange={() => setDeleteMode('all_modules')}
                      className="mt-0.5 text-rose-600 focus:ring-rose-500"
                    />
                    <div>
                      <div className="font-bold text-rose-950 text-xs">
                        Delete from Every Module (Sare modules se delete ho jayegi)
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                        Permanently deletes this ticket and all its test cases, observations, and developer testing across all modules and database.
                      </p>
                    </div>
                  </div>
                </label>

                {/* Option 2: Delete from Tickets Tab Only */}
                <label
                  onClick={() => setDeleteMode('tickets_tab_only')}
                  className={`block p-3 rounded-xl border-2 cursor-pointer transition-all ${
                    deleteMode === 'tickets_tab_only'
                      ? 'border-blue-500 bg-blue-50/60'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <input
                      type="radio"
                      name="deleteMode"
                      checked={deleteMode === 'tickets_tab_only'}
                      onChange={() => setDeleteMode('tickets_tab_only')}
                      className="mt-0.5 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <div className="font-bold text-blue-950 text-xs">
                        Delete from Tickets Tab Only (Sirf Tickets tab se delete karein)
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                        Sirf Tickets tab ki list se delete hogi. Jab user kisi doosre module se is ticket ko open karke <strong>Save &amp; Submit</strong> karega, to ye wapas Tickets aur Dashboard me show ho jayegi.
                      </p>
                    </div>
                  </div>
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteTicketTarget(null)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (deleteTicketTarget && onDeleteTicket) {
                      onDeleteTicket(deleteTicketTarget.ticketNumber, deleteMode);
                    }
                    setDeleteTicketTarget(null);
                  }}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Confirm Delete</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
