import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  NavTab,
  UserProfile,
  BeaconModule,
  TicketSummary,
  TestCaseHeaderMeta,
  TestCaseItem,
  ObservationHeaderMeta,
  ObservationItem,
  DeveloperTestItem,
  DeveloperTestHeaderMeta,
  AppSettings,
  ColourTheme,
  FontStyle,
  UserManualDoc,
  DailyTaskItem,
  UserNotepad,
} from './types';
import {
  loadInitialData,
  saveUserSession,
  logoutUserSession,
  saveTicketsToStorage,
  saveTestCasesMapToStorage,
  saveTestCaseHeadersMapToStorage,
  saveObservationsMapToStorage,
  saveDevTestingMapToStorage,
  saveDevTestingHeadersMapToStorage,
  saveAppSettingsToStorage,
  saveUserManualsToStorage,
  saveDailyTasksToStorage,
  saveUserNotepadsToStorage,
  REGISTERED_USERS,
  syncTicketCounts,
  clearSampleData,
  removeTicketFromStorage,
} from './data/dbStore';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { DashboardView } from './components/DashboardView';
import { Phase1Welcome } from './components/Phase1Welcome';
import { ModulesView } from './components/ModulesView';
import { TicketsView } from './components/TicketsView';
import { ObservationsView } from './components/ObservationsView';
import { DeveloperTestingView } from './components/DeveloperTestingView';
import { UnifiedAITestHub } from './components/UnifiedAITestHub';
import { SeniorQAReviewQueue } from './components/SeniorQAReviewQueue';
import { UserManualView } from './components/UserManualView';
import { DailyTaskUpdatesView } from './components/DailyTaskUpdatesView';
import { LoginPage } from './components/LoginPage';
import { X, UserCheck, ShieldCheck, Mail, LogOut } from 'lucide-react';

export default function App() {
  // Load Initial Data from persistent localStorage store
  const [dbState, setDbState] = useState(() => loadInitialData());

  // App Settings (Theme & Font)
  const [settings, setSettings] = useState<AppSettings>(dbState.settings || { theme: 'Default', font: 'Inter' });

  // Current logged in user (null by default so the LoginPage opens first whenever opened from a link)
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<NavTab>('ai-test-hub');

  // Track target requested tab for post-login redirect
  const [targetTabAfterLogin, setTargetTabAfterLogin] = useState<NavTab>('ai-test-hub');

  const [modules, setModules] = useState<BeaconModule[]>(dbState.modules);
  const [tickets, setTickets] = useState<TicketSummary[]>(() =>
    syncTicketCounts(dbState.tickets, dbState.testCasesMap, dbState.observationsMap)
  );

  const [testCasesMap, setTestCasesMap] = useState<Record<string, TestCaseItem[]>>(
    dbState.testCasesMap
  );
  const [testCaseHeadersMap, setTestCaseHeadersMap] = useState<Record<string, TestCaseHeaderMeta>>(
    dbState.testCaseHeadersMap || {}
  );
  const [observationsMap, setObservationsMap] = useState<Record<string, ObservationItem[]>>(
    dbState.observationsMap
  );
  const [devTestingMap, setDevTestingMap] = useState<Record<string, DeveloperTestItem[]>>(
    dbState.devTestingMap || {}
  );
  const [devTestingHeadersMap, setDevTestingHeadersMap] = useState<
    Record<string, DeveloperTestHeaderMeta>
  >(dbState.devTestingHeadersMap || {});

  // User Manuals, Daily Tasks, and User Notepads state
  const [userManuals, setUserManuals] = useState<UserManualDoc[]>(
    dbState.userManuals || []
  );
  const [dailyTasks, setDailyTasks] = useState<DailyTaskItem[]>(
    dbState.dailyTasks || []
  );
  const [userNotepads, setUserNotepads] = useState<UserNotepad[]>(
    dbState.userNotepads || []
  );

  const [activeModuleFilter, setActiveModuleFilter] = useState<string>('all');
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);

  // Authority Check:
  // Maseera Sayyed -> Super Admin (sees all tickets across organization)
  // Others -> View only tickets they created or are assigned to
  const isSuperAdmin = currentUser?.role === 'Super Admin' || currentUser?.email?.toLowerCase().includes('maseera');

  const visibleTickets = React.useMemo(() => {
    if (!currentUser) return [];
    if (isSuperAdmin) {
      return tickets;
    }
    const normName = (currentUser.name || '').toLowerCase().trim();
    const normEmail = (currentUser.email || '').toLowerCase().trim();

    return tickets.filter((t) => {
      const creator = (t.createdBy || '').toLowerCase();
      const creatorEmail = (t.creatorEmail || '').toLowerCase();
      const qa = (t.qaAssignee || '').toLowerCase();
      const dev = (t.developer || '').toLowerCase();

      const isCreator =
        (normName && (creator.includes(normName) || normName.includes(creator))) ||
        (normEmail && creatorEmail === normEmail);

      const isAssigned =
        (normName && (qa.includes(normName) || normName.includes(qa))) ||
        (normName && (dev.includes(normName) || normName.includes(dev)));

      return isCreator || isAssigned;
    });
  }, [tickets, currentUser, isSuperAdmin]);

  // Selected Active Ticket ID
  const [activeTicketNumber, setActiveTicketNumber] = useState<string>('');

  // Keep active ticket valid for currently visible tickets
  useEffect(() => {
    if (visibleTickets.length > 0) {
      if (!visibleTickets.some((t) => t.ticketNumber.toLowerCase() === activeTicketNumber.toLowerCase())) {
        setActiveTicketNumber(visibleTickets[0].ticketNumber);
      }
    } else {
      setActiveTicketNumber('');
    }
  }, [visibleTickets, activeTicketNumber]);

  // Currently active ticket
  const currentTicket =
    visibleTickets.find((t) => t.ticketNumber.toLowerCase() === activeTicketNumber.toLowerCase()) ||
    visibleTickets[0] ||
    tickets[0] ||
    undefined;

  const testCaseHeader: TestCaseHeaderMeta = (activeTicketNumber && testCaseHeadersMap[activeTicketNumber]) || {
    ticketNo: currentTicket?.ticketNumber || activeTicketNumber || '',
    clientName: currentTicket?.clientName || 'Treasury Master',
    sha: currentTicket?.shaCommit || '',
    taskName: currentTicket?.featureName || '',
    taskDoneBy: currentTicket?.qaAssignee || currentUser?.name || 'Maseera Sayyed',
    signOffBy: currentTicket?.signOffBy || '',
    reviewStatus: 'Draft',
    version: '1.0',
  };

  const testCasesList = (activeTicketNumber && testCasesMap[activeTicketNumber]) || [];

  const observationsList = (activeTicketNumber && observationsMap[activeTicketNumber]) || [];

  const observationHeader: ObservationHeaderMeta = {
    ticketName: currentTicket?.featureName || '',
    ticketNo: currentTicket?.ticketNumber || activeTicketNumber || '',
    qaOwner: currentTicket?.qaAssignee || currentUser?.name || 'Maseera Sayyed',
    clientName: currentTicket?.clientName || 'Treasury Master',
    date: new Date().toISOString().split('T')[0],
  };

  // Sync back tickets, cases, observations, dev testing whenever state changes
  useEffect(() => {
    const updatedTickets = syncTicketCounts(tickets, testCasesMap, observationsMap);
    saveTicketsToStorage(updatedTickets);
    saveTestCasesMapToStorage(testCasesMap);
    saveTestCaseHeadersMapToStorage(testCaseHeadersMap);
    saveObservationsMapToStorage(observationsMap);
    saveDevTestingMapToStorage(devTestingMap);
    saveDevTestingHeadersMapToStorage(devTestingHeadersMap);
  }, [testCasesMap, testCaseHeadersMap, observationsMap, devTestingMap, devTestingHeadersMap]);

  // Handle Tab Navigation (Enforces Login Check)
  const handleNavigateTab = (tab: NavTab) => {
    setIsGuideOpen(false);
    if (!currentUser) {
      setTargetTabAfterLogin(tab);
      return;
    }
    setActiveTab(tab);
  };

  // Handle Successful Login
  const handleLoginSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    saveUserSession(user);
    setActiveTab(targetTabAfterLogin);
    setIsLoginModalOpen(false);
  };

  // Handle Logout
  const handleLogout = () => {
    logoutUserSession();
    setCurrentUser(null);
  };

  // Ensure ticket exists in tickets state so that if it was deleted from tickets tab only,
  // saving/submitting from any module automatically restores it in Tickets (Azure) & Dashboard!
  const ensureTicketInTicketsList = (
    ticketNum: string,
    metaOverrides?: Partial<TicketSummary>
  ) => {
    if (!ticketNum) return;
    const cleanNum = ticketNum.trim().toLowerCase();
    setTickets((prev) => {
      const existingIndex = prev.findIndex(
        (t) => t.ticketNumber.trim().toLowerCase() === cleanNum
      );
      if (existingIndex >= 0) {
        if (metaOverrides && Object.keys(metaOverrides).length > 0) {
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            ...metaOverrides,
          };
          const synced = syncTicketCounts(updated, testCasesMap, observationsMap);
          saveTicketsToStorage(synced);
          return synced;
        }
        return prev;
      }

      // Re-create / restore ticket entry from module headers or metadata
      const headerMeta = testCaseHeadersMap[ticketNum];
      const devHeader = devTestingHeadersMap[ticketNum];
      const restored: TicketSummary = {
        id: `tkt-${ticketNum}`,
        ticketNumber: ticketNum,
        featureName:
          metaOverrides?.featureName ||
          headerMeta?.taskName ||
          devHeader?.featureName ||
          `Feature #${ticketNum}`,
        moduleId: metaOverrides?.moduleId || 'mod-1',
        moduleName: metaOverrides?.moduleName || 'Term Loan',
        priority: metaOverrides?.priority || 'High',
        status: metaOverrides?.status || 'Ready for QA',
        developer:
          metaOverrides?.developer ||
          headerMeta?.developer ||
          devHeader?.developer ||
          'Unassigned',
        qaAssignee:
          metaOverrides?.qaAssignee ||
          headerMeta?.taskDoneBy ||
          currentUser?.name ||
          'Maseera Sayyed',
        testCasesCount: (testCasesMap[ticketNum] || []).length,
        passedCount: (testCasesMap[ticketNum] || []).filter((c) => c.status === 'Pass').length,
        failedCount: (testCasesMap[ticketNum] || []).filter((c) => c.status === 'Fail').length,
        observationsCount: (observationsMap[ticketNum] || []).length,
        clientName:
          metaOverrides?.clientName ||
          headerMeta?.clientName ||
          'Treasury Master',
        shaCommit: metaOverrides?.shaCommit || headerMeta?.sha || '',
        signOffBy: metaOverrides?.signOffBy || headerMeta?.signOffBy || '',
        description:
          metaOverrides?.description ||
          headerMeta?.description ||
          headerMeta?.taskName ||
          '',
        testingScenarios:
          metaOverrides?.testingScenarios ||
          headerMeta?.testingScenarios ||
          '',
        blockedCount: 0,
        receivedDate: new Date().toISOString().split('T')[0],
        createdBy: currentUser?.name || 'Maseera Sayyed',
        creatorEmail: currentUser?.email || 'maseerasayyed@quantumphinance.com',
      };

      const nextList = [restored, ...prev];
      const synced = syncTicketCounts(nextList, testCasesMap, observationsMap);
      saveTicketsToStorage(synced);
      return synced;
    });
  };

  // Delete Ticket handler with granular options:
  // - 'tickets-only': removes ticket from tickets view & dashboard (preserves module data)
  // - 'all-modules': permanently removes ticket from EVERY module across the system
  const handleDeleteTicket = (ticketNumber: string, mode: 'tickets-only' | 'all-modules') => {
    const cleanNum = ticketNumber.trim().toLowerCase();

    // 1. Remove from tickets state
    const nextTickets = tickets.filter(
      (t) => t.ticketNumber.trim().toLowerCase() !== cleanNum
    );
    setTickets(nextTickets);
    saveTicketsToStorage(nextTickets);

    if (mode === 'all-modules') {
      // 2. Remove from all module maps
      const nextTestCases = { ...testCasesMap };
      delete nextTestCases[ticketNumber];
      Object.keys(nextTestCases).forEach((k) => {
        if (k.trim().toLowerCase() === cleanNum) delete nextTestCases[k];
      });
      setTestCasesMap(nextTestCases);
      saveTestCasesMapToStorage(nextTestCases);

      const nextHeaders = { ...testCaseHeadersMap };
      delete nextHeaders[ticketNumber];
      Object.keys(nextHeaders).forEach((k) => {
        if (k.trim().toLowerCase() === cleanNum) delete nextHeaders[k];
      });
      setTestCaseHeadersMap(nextHeaders);
      saveTestCaseHeadersMapToStorage(nextHeaders);

      const nextObs = { ...observationsMap };
      delete nextObs[ticketNumber];
      Object.keys(nextObs).forEach((k) => {
        if (k.trim().toLowerCase() === cleanNum) delete nextObs[k];
      });
      setObservationsMap(nextObs);
      saveObservationsMapToStorage(nextObs);

      const nextDev = { ...devTestingMap };
      delete nextDev[ticketNumber];
      Object.keys(nextDev).forEach((k) => {
        if (k.trim().toLowerCase() === cleanNum) delete nextDev[k];
      });
      setDevTestingMap(nextDev);
      saveDevTestingMapToStorage(nextDev);

      const nextDevHeaders = { ...devTestingHeadersMap };
      delete nextDevHeaders[ticketNumber];
      Object.keys(nextDevHeaders).forEach((k) => {
        if (k.trim().toLowerCase() === cleanNum) delete nextDevHeaders[k];
      });
      setDevTestingHeadersMap(nextDevHeaders);
      saveDevTestingHeadersMapToStorage(nextDevHeaders);

      removeTicketFromStorage(ticketNumber, 'all-modules');
    } else {
      removeTicketFromStorage(ticketNumber, 'tickets-only');
    }

    if (activeTicketNumber.trim().toLowerCase() === cleanNum) {
      const remaining = nextTickets[0]?.ticketNumber || '101';
      setActiveTicketNumber(remaining);
    }
  };

  // Update Ticket handler (for header fields edits and ticket metadata edits)
  const handleUpdateTicket = (updatedTicket: TicketSummary, oldTicketNumber?: string) => {
    const oldNum = (oldTicketNumber || updatedTicket.ticketNumber).trim().toLowerCase();
    const newNum = updatedTicket.ticketNumber.trim();

    // If ticket ID was changed/renamed, migrate maps to new ID
    if (oldNum !== newNum.toLowerCase()) {
      if (testCasesMap[oldTicketNumber || ''] || testCasesMap[oldNum]) {
        const cases = testCasesMap[oldTicketNumber || ''] || testCasesMap[oldNum] || [];
        const nextMap = { ...testCasesMap, [newNum]: cases };
        delete nextMap[oldTicketNumber || ''];
        setTestCasesMap(nextMap);
        saveTestCasesMapToStorage(nextMap);
      }
      if (testCaseHeadersMap[oldTicketNumber || '']) {
        const h = testCaseHeadersMap[oldTicketNumber || ''];
        const nextHeaders = { ...testCaseHeadersMap, [newNum]: { ...h, ticketNo: newNum } };
        delete nextHeaders[oldTicketNumber || ''];
        setTestCaseHeadersMap(nextHeaders);
        saveTestCaseHeadersMapToStorage(nextHeaders);
      }
      if (observationsMap[oldTicketNumber || '']) {
        const obs = observationsMap[oldTicketNumber || ''];
        const nextObs = { ...observationsMap, [newNum]: obs };
        delete nextObs[oldTicketNumber || ''];
        setObservationsMap(nextObs);
        saveObservationsMapToStorage(nextObs);
      }
      if (devTestingMap[oldTicketNumber || '']) {
        const dt = devTestingMap[oldTicketNumber || ''];
        const nextDt = { ...devTestingMap, [newNum]: dt };
        delete nextDt[oldTicketNumber || ''];
        setDevTestingMap(nextDt);
        saveDevTestingMapToStorage(nextDt);
      }
      if (activeTicketNumber.toLowerCase() === oldNum) {
        setActiveTicketNumber(newNum);
      }
    }

    let replaced = false;
    const nextTickets = tickets.map((t) => {
      if (t.ticketNumber.trim().toLowerCase() === oldNum || t.id === updatedTicket.id) {
        replaced = true;
        return {
          ...t,
          ...updatedTicket,
        };
      }
      return t;
    });

    if (!replaced) {
      nextTickets.unshift(updatedTicket);
    }

    const synced = syncTicketCounts(nextTickets, testCasesMap, observationsMap);
    setTickets(synced);
    saveTicketsToStorage(synced);
  };

  // Update Test Cases for active ticket
  const handleUpdateTestCases = (newCases: TestCaseItem[], ticketNum?: string) => {
    const targetTicket = (ticketNum || activeTicketNumber).trim();
    const nextMap = { ...testCasesMap, [targetTicket]: newCases };
    setTestCasesMap(nextMap);
    saveTestCasesMapToStorage(nextMap);

    // Ensure ticket exists in tickets list (restores it if deleted from tickets tab only)
    ensureTicketInTicketsList(targetTicket);
    setTickets((prev) => {
      const synced = syncTicketCounts(prev, nextMap, observationsMap);
      saveTicketsToStorage(synced);
      return synced;
    });
  };

  const handleUpdateTestCaseHeader = (newHeader: TestCaseHeaderMeta) => {
    setTestCaseHeadersMap((prev) => ({
      ...prev,
      [newHeader.ticketNo]: newHeader,
    }));
    setActiveTicketNumber(newHeader.ticketNo);
    saveTestCaseHeadersMapToStorage({
      ...testCaseHeadersMap,
      [newHeader.ticketNo]: newHeader,
    });

    // Also update matching ticket in tickets list if present
    ensureTicketInTicketsList(newHeader.ticketNo, {
      featureName: newHeader.taskName,
      developer: newHeader.developer,
      qaAssignee: newHeader.taskDoneBy,
      clientName: newHeader.clientName,
      shaCommit: newHeader.sha,
      signOffBy: newHeader.signOffBy,
      description: newHeader.description,
      testingScenarios: newHeader.testingScenarios,
    });
  };

  // Update Developer Testing Map
  const handleUpdateDevTestingMap = (
    ticketNo: string,
    items: DeveloperTestItem[],
    header?: DeveloperTestHeaderMeta
  ) => {
    const cleanNo = ticketNo.trim();
    const nextMap = { ...devTestingMap, [cleanNo]: items };
    setDevTestingMap(nextMap);
    saveDevTestingMapToStorage(nextMap);
    if (header) {
      const nextHeaders = { ...devTestingHeadersMap, [cleanNo]: header };
      setDevTestingHeadersMap(nextHeaders);
      saveDevTestingHeadersMapToStorage(nextHeaders);
    }

    // Ensure ticket exists in tickets list
    ensureTicketInTicketsList(cleanNo, {
      featureName: header?.featureName,
      developer: header?.developer,
    });
  };

  // Update Observations for active ticket
  const handleUpdateObservations = (newObs: ObservationItem[], ticketNum?: string) => {
    const target = (ticketNum || activeTicketNumber).trim();
    const nextMap = { ...observationsMap, [target]: newObs };
    setObservationsMap(nextMap);
    saveObservationsMapToStorage(nextMap);

    // Ensure ticket exists in tickets list (restores it if deleted from tickets tab only)
    ensureTicketInTicketsList(target);
    setTickets((prev) => {
      const synced = syncTicketCounts(prev, testCasesMap, nextMap);
      saveTicketsToStorage(synced);
      return synced;
    });
  };

  // Handle Add New Ticket
  const handleAddTicket = (newTicket: TicketSummary) => {
    const ticketWithCreator: TicketSummary = {
      ...newTicket,
      createdBy: newTicket.createdBy || currentUser?.name || 'Maseera Sayyed',
      creatorEmail: newTicket.creatorEmail || currentUser?.email || 'maseerasayyed@quantumphinance.com',
    };
    const nextTickets = [ticketWithCreator, ...tickets];
    setTickets(nextTickets);
    setActiveTicketNumber(ticketWithCreator.ticketNumber);
    saveTicketsToStorage(nextTickets);
  };


  // Apply theme & font to body
  useEffect(() => {
    document.body.setAttribute('data-theme', settings.theme);
    document.body.setAttribute('data-font', settings.font);
    saveAppSettingsToStorage(settings);
  }, [settings]);

  // Map Tab ID to Human Label
  const getTabLabel = (tab: NavTab): string => {
    const labels: Record<NavTab, string> = {
      dashboard: 'Dashboard',
      tickets: 'Tickets (Azure)',
      'developer-testing': 'Developer Testing',
      'ai-test-hub': 'QA AI Test Case',
      'test-cases': 'Test Cases Workbench',
      'review-queue': 'QA Test Case Review',
      'user-manual': 'User Manual (Word)',
      'daily-updates': 'Daily Task Log',
      observations: 'Observations',
      rfe: 'RFE Module',
      modules: 'Modules',
      'qa-team': 'QA Team & Roles',
      reports: 'Reports',
      'ai-assistant': 'AI Assistant',
      settings: 'Settings & Theme',
    };
    return labels[tab] || 'QA Hub Module';
  };

  // If user is NOT logged in, show standalone Login Page!
  if (!currentUser) {
    return (
      <LoginPage
        requestedTargetTabLabel={getTabLabel(targetTabAfterLogin)}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  const renderActiveTabContent = () => {
    if (isGuideOpen) {
      return (
        <Phase1Welcome
          onFormatSubmitted={() => {}}
          savedFormat={null}
          onOpenWorkbench={() => {
            setIsGuideOpen(false);
            setActiveTab('ai-test-hub');
          }}
        />
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardView
            tickets={visibleTickets}
            modules={modules}
            onSelectTicket={(ticket) => {
              setActiveTicketNumber(ticket.ticketNumber);
              handleNavigateTab('tickets');
            }}
            onNavigateTab={(tab) => {
              setIsGuideOpen(false);
              handleNavigateTab(tab);
            }}
            currentUser={currentUser}
          />
        );

      case 'tickets':
        return (
          <TicketsView
            tickets={visibleTickets}
            modules={modules}
            onSelectTicket={(t) => {
              setActiveTicketNumber(t.ticketNumber);
              handleNavigateTab('ai-test-hub');
            }}
            onNavigateTab={(tab) => {
              setIsGuideOpen(false);
              handleNavigateTab(tab);
            }}
            onAddTicket={handleAddTicket}
            onDeleteTicket={handleDeleteTicket}
            onUpdateTicket={handleUpdateTicket}
            currentUser={currentUser}
          />
        );

      case 'developer-testing':
        return (
          <DeveloperTestingView
            tickets={visibleTickets}
            modules={modules}
            currentUser={currentUser}
            devTestingMap={devTestingMap}
            devTestingHeadersMap={devTestingHeadersMap}
            activeTicketNumber={activeTicketNumber}
            onSelectTicket={(tNo) => setActiveTicketNumber(tNo)}
            onUpdateDevTestingMap={handleUpdateDevTestingMap}
            onAddTicket={handleAddTicket}
            onUpdateTicket={handleUpdateTicket}
          />
        );

      case 'ai-test-hub':
      case 'test-cases':
        return (
          <UnifiedAITestHub
            initialHeader={testCaseHeader}
            initialTestCases={testCasesList}
            tickets={visibleTickets}
            modules={modules}
            currentUser={currentUser}
            activeTicketNumber={activeTicketNumber}
            testCasesMap={testCasesMap}
            testCaseHeadersMap={testCaseHeadersMap}
            onSelectTicket={(tNo) => {
              setActiveTicketNumber(tNo);
            }}
            onNavigateTab={handleNavigateTab}
            onUpdateHeader={handleUpdateTestCaseHeader}
            onUpdateTestCases={(newCases, tNo) => {
              handleUpdateTestCases(newCases, tNo);
            }}
            onAddTicket={handleAddTicket}
            onUpdateTicket={handleUpdateTicket}
          />
        );

      case 'review-queue':
        return (
          <SeniorQAReviewQueue
            tickets={isSuperAdmin ? tickets : visibleTickets}
            testCasesMap={testCasesMap}
            testCaseHeadersMap={testCaseHeadersMap}
            currentUser={currentUser}
            onUpdateHeader={(tNo, h) => {
              setTestCaseHeadersMap((prev) => ({ ...prev, [tNo]: h }));
            }}
            onUpdateTestCases={(tNo, c) => {
              setTestCasesMap((prev) => ({ ...prev, [tNo]: c }));
            }}
            onOpenTestCasesForTicket={(tNo) => {
              setActiveTicketNumber(tNo);
              handleNavigateTab('ai-test-hub');
            }}
          />
        );

      case 'user-manual':
        return (
          <UserManualView
            tickets={visibleTickets}
            testCasesMap={testCasesMap}
            modules={modules}
            currentUser={currentUser}
            userManuals={userManuals}
            onSaveManuals={(newManuals) => {
              setUserManuals(newManuals);
              saveUserManualsToStorage(newManuals);
            }}
          />
        );

      case 'daily-updates':
        return (
          <DailyTaskUpdatesView
            currentUser={currentUser}
            tickets={visibleTickets}
            modules={modules}
            dailyTasks={dailyTasks}
            userNotepads={userNotepads}
            onSaveDailyTasks={(newTasks) => {
              setDailyTasks(newTasks);
              saveDailyTasksToStorage(newTasks);
            }}
            onSaveNotepads={(newNotepads) => {
              setUserNotepads(newNotepads);
              saveUserNotepadsToStorage(newNotepads);
            }}
          />
        );

      case 'observations':
      case 'rfe':
        return (
          <ObservationsView
            tickets={visibleTickets}
            modules={modules}
            currentUser={currentUser}
            activeTicketNumber={activeTicketNumber}
            observationsMap={observationsMap}
            initialHeader={observationHeader}
            initialObservations={observationsList}
            onSelectTicket={(tNo) => setActiveTicketNumber(tNo)}
            onUpdateHeader={(newH) => setActiveTicketNumber(newH.ticketNo)}
            onUpdateObservations={(items, tNo) => handleUpdateObservations(items, tNo)}
            onAddTicket={handleAddTicket}
            onUpdateTicket={handleUpdateTicket}
          />
        );

      case 'settings':
        return (
          <div className="p-8 max-w-4xl mx-auto space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-6">
              <div>
                <h2 className="text-base font-bold text-slate-900">Application Appearance &amp; Settings</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Customize application theme colors and font style consistently across QA Hub.
                </p>
              </div>

              {/* Theme Selector */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  Colour Theme:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs font-bold">
                  {(['Default', 'Blue', 'Green', 'Purple', 'Dark'] as ColourTheme[]).map((themeName) => (
                    <button
                      key={themeName}
                      onClick={() => setSettings({ ...settings, theme: themeName })}
                      className={`p-3 rounded-lg border text-center transition-all cursor-pointer ${
                        settings.theme === themeName
                          ? 'border-blue-600 bg-blue-50 text-blue-900 ring-2 ring-blue-500/30'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      {themeName}
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Selector */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  Font Style:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-bold">
                  {(['Inter', 'Roboto', 'Arial', 'Poppins'] as FontStyle[]).map((fontName) => (
                    <button
                      key={fontName}
                      onClick={() => setSettings({ ...settings, font: fontName })}
                      className={`p-3 rounded-lg border text-center transition-all cursor-pointer ${
                        settings.font === fontName
                          ? 'border-blue-600 bg-blue-50 text-blue-900 ring-2 ring-blue-500/30'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      {fontName}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 'modules':
        return (
          <ModulesView
            modules={modules}
            onAddModule={(m) => setModules([m, ...modules])}
          />
        );


      default:
        return (
          <UnifiedAITestHub
            initialHeader={testCaseHeader}
            initialTestCases={testCasesList}
            tickets={tickets}
            modules={modules}
            currentUser={currentUser}
            onUpdateHeader={handleUpdateTestCaseHeader}
            onUpdateTestCases={handleUpdateTestCases}
          />
        );
    }
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans text-slate-800 overflow-hidden">
      {/* 1. Left Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={(tab) => handleNavigateTab(tab)}
        currentUser={currentUser}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
        onLogout={handleLogout}
        theme={settings.theme}
      />

      {/* 2. Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar
          currentUser={currentUser}
          activeModuleFilter={activeModuleFilter}
          onModuleFilterChange={setActiveModuleFilter}
          modules={modules}
          onOpenGuide={() => setIsGuideOpen(true)}
          onOpenLoginModal={() => setIsLoginModalOpen(true)}
          onLogout={handleLogout}
          currentTheme={settings.theme}
          onSelectTheme={(theme) => {
            const updated = { ...settings, theme };
            setSettings(updated);
            saveAppSettingsToStorage(updated);
          }}
        />

        <main className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={isGuideOpen ? 'guide' : activeTab}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
            >
              {renderActiveTabContent()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Switch User / Official Email ID Modal */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-blue-400" />
                <h2 className="text-base font-bold">Switch Account / Test Authority</h2>
              </div>
              <button
                onClick={() => setIsLoginModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="font-bold text-slate-800">Currently Logged-In:</div>
                <div className="text-slate-700 mt-1 flex items-center justify-between">
                  <div>
                    <strong>{currentUser.name}</strong>
                    <div className="text-[11px] text-slate-500">{currentUser.email}</div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      currentUser.role === 'Super Admin'
                        ? 'bg-purple-100 text-purple-800 border border-purple-200'
                        : 'bg-blue-100 text-blue-800 border border-blue-200'
                    }`}
                  >
                    {currentUser.role}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-2">
                  Switch Active User &amp; Authority Scope:
                </label>
                <div className="space-y-2">
                  {REGISTERED_USERS.map((user) => {
                    const isCurrent = user.email.toLowerCase() === currentUser.email.toLowerCase();
                    const isUserSuperAdmin = user.role === 'Super Admin';
                    return (
                      <button
                        key={user.email}
                        onClick={() => {
                          handleLoginSuccess(user);
                        }}
                        className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                          isCurrent
                            ? 'bg-blue-50/80 border-blue-400 ring-2 ring-blue-500/20'
                            : 'bg-white hover:bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-1.5 font-bold text-slate-900">
                            <span>{user.name}</span>
                            {isUserSuperAdmin && (
                              <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.2 rounded font-extrabold">
                                👑 Super Admin
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500">{user.email}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5 font-medium">
                            {isUserSuperAdmin
                              ? '• Full visibility: sees all tickets across all users'
                              : `• Scoped visibility: sees only ${user.name.split(' ')[0]}'s tickets`}
                          </div>
                        </div>
                        {isCurrent && (
                          <span className="text-[10px] font-bold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded">
                            Active
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">Quantum Phinance QA Hub</span>
                <button
                  onClick={() => {
                    handleLogout();
                    setIsLoginModalOpen(false);
                  }}
                  className="px-3.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs rounded-lg border border-red-200 cursor-pointer flex items-center gap-1.5 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout Session</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
