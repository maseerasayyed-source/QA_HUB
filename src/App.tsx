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
import { GeminiQaChatbot } from './components/GeminiQaChatbot';
import { X, UserCheck, ShieldCheck, Mail, LogOut, Sparkles } from 'lucide-react';

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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [isChatbotLauncherVisible, setIsChatbotLauncherVisible] = useState<boolean>(() => {
    try {
      return localStorage.getItem('qa_chatbot_visible') !== 'false';
    } catch {
      return true;
    }
  });

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

  // Helper to push state updates to server for persistent storage and cross-user visibility
  const pushSyncToServer = async (payload: {
    tickets?: TicketSummary[];
    testCasesMap?: Record<string, TestCaseItem[]>;
    testCaseHeadersMap?: Record<string, TestCaseHeaderMeta>;
    observationsMap?: Record<string, ObservationItem[]>;
    devTestingMap?: Record<string, DeveloperTestItem[]>;
    devTestingHeadersMap?: Record<string, DeveloperTestHeaderMeta>;
  }) => {
    try {
      await fetch('/api/sync-state', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-name': currentUser?.name || 'User',
          'x-user-role': currentUser?.role || 'QA',
        },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      // Quiet fallback in offline / preview environments
    }
  };

  // Real-time synchronization with server persistent disk store
  // Automatically pulls tickets created or submitted by other users
  useEffect(() => {
    let isMounted = true;

    const pullFromServer = async () => {
      try {
        const res = await fetch('/api/sync-state');
        if (!res.ok) return;
        const data = await res.json();
        if (!isMounted) return;

        if (Array.isArray(data.tickets) && data.tickets.length > 0) {
          setTickets((prevLocal) => {
            const map = new Map<string, TicketSummary>();
            prevLocal.forEach((t) => {
              if (t.ticketNumber) map.set(t.ticketNumber.toLowerCase().trim(), t);
            });
            data.tickets.forEach((st: TicketSummary) => {
              if (st.ticketNumber) {
                const key = st.ticketNumber.toLowerCase().trim();
                const existing = map.get(key);
                map.set(key, { ...(existing || {}), ...st });
              }
            });
            const merged = Array.from(map.values());
            saveTicketsToStorage(merged);
            return merged;
          });
        }

        if (data.testCasesMap && Object.keys(data.testCasesMap).length > 0) {
          setTestCasesMap((prev) => {
            const next = { ...prev, ...data.testCasesMap };
            saveTestCasesMapToStorage(next);
            return next;
          });
        }

        if (data.testCaseHeadersMap && Object.keys(data.testCaseHeadersMap).length > 0) {
          setTestCaseHeadersMap((prev) => {
            const next = { ...prev, ...data.testCaseHeadersMap };
            saveTestCaseHeadersMapToStorage(next);
            return next;
          });
        }

        if (data.observationsMap && Object.keys(data.observationsMap).length > 0) {
          setObservationsMap((prev) => {
            const next = { ...prev, ...data.observationsMap };
            saveObservationsMapToStorage(next);
            return next;
          });
        }

        if (data.devTestingMap && Object.keys(data.devTestingMap).length > 0) {
          setDevTestingMap((prev) => {
            const next = { ...prev, ...data.devTestingMap };
            saveDevTestingMapToStorage(next);
            return next;
          });
        }

        if (data.devTestingHeadersMap && Object.keys(data.devTestingHeadersMap).length > 0) {
          setDevTestingHeadersMap((prev) => {
            const next = { ...prev, ...data.devTestingHeadersMap };
            saveDevTestingHeadersMapToStorage(next);
            return next;
          });
        }
      } catch (e) {
        // quiet fallback
      }
    };

    pullFromServer();
    const interval = setInterval(pullFromServer, 4000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

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

  // Update Test Cases for active ticket
  const handleUpdateTestCases = (newCases: TestCaseItem[], ticketNum?: string) => {
    const targetTicket = ticketNum || activeTicketNumber;
    const cleanNo = targetTicket.trim().replace(/^#+/, '');
    const nextMap = { ...testCasesMap, [targetTicket]: newCases, [cleanNo]: newCases };
    setTestCasesMap(nextMap);
    saveTestCasesMapToStorage(nextMap);
    setTickets((prev) => {
      const synced = syncTicketCounts(prev, nextMap, observationsMap);
      saveTicketsToStorage(synced);
      pushSyncToServer({ tickets: synced, testCasesMap: nextMap });
      return synced;
    });
  };

  const handleUpdateTestCaseHeader = (newHeader: TestCaseHeaderMeta) => {
    const cleanNo = (newHeader.ticketNo || '').trim().replace(/^#+/, '');
    setTestCaseHeadersMap((prev) => {
      const next = { ...prev, [newHeader.ticketNo]: newHeader, [cleanNo]: newHeader };
      saveTestCaseHeadersMapToStorage(next);
      pushSyncToServer({ testCaseHeadersMap: next });
      return next;
    });

    setTickets((prev) => {
      const cleanLower = cleanNo.toLowerCase();
      const next = prev.map((t) => {
        if ((t.ticketNumber || '').trim().replace(/^#+/, '').toLowerCase() === cleanLower) {
          return {
            ...t,
            developer: newHeader.developer || t.developer,
            reviewStatus: newHeader.reviewStatus || t.reviewStatus,
            submissionState: newHeader.reviewStatus && newHeader.reviewStatus !== 'Draft' ? 'Submitted' : t.submissionState,
            signOffBy: newHeader.signOffBy || t.signOffBy,
          };
        }
        return t;
      });
      saveTicketsToStorage(next);
      pushSyncToServer({ tickets: next });
      return next;
    });

    setActiveTicketNumber(newHeader.ticketNo);
  };

  // Update Developer Testing Map
  const handleUpdateDevTestingMap = (
    ticketNo: string,
    items: DeveloperTestItem[],
    header?: DeveloperTestHeaderMeta
  ) => {
    const nextMap = { ...devTestingMap, [ticketNo]: items };
    setDevTestingMap(nextMap);
    let nextHeaders = devTestingHeadersMap;
    if (header) {
      nextHeaders = { ...devTestingHeadersMap, [ticketNo]: header };
      setDevTestingHeadersMap(nextHeaders);
    }
    if (header?.developer) {
      setTickets((prev) => {
        const next = prev.map((t) =>
          t.ticketNumber === ticketNo ? { ...t, developer: header.developer } : t
        );
        pushSyncToServer({ tickets: next, devTestingMap: nextMap, devTestingHeadersMap: nextHeaders });
        return next;
      });
    } else {
      pushSyncToServer({ devTestingMap: nextMap, devTestingHeadersMap: nextHeaders });
    }
  };

  // Update Observations for active ticket
  const handleUpdateObservations = (newObs: ObservationItem[], ticketNum?: string) => {
    const target = ticketNum || activeTicketNumber;
    const nextMap = { ...observationsMap, [target]: newObs };
    setObservationsMap(nextMap);
    setTickets((prev) => {
      const synced = syncTicketCounts(prev, testCasesMap, nextMap);
      pushSyncToServer({ tickets: synced, observationsMap: nextMap });
      return synced;
    });
  };

  // Save and Submit Ticket: Switches ticket from Draft/Edit mode to Submitted
  // Makes the test cases, observations, and developer testing accessible to all other users in Read-Only mode
  // If the ticket was deleted from Tickets tab only, saving and submitting from another module restores it into Tickets & Dashboard!
  const handleSaveAndSubmitTicket = (ticketNo: string) => {
    const cleanNo = ticketNo.trim().replace(/^#+/, '');
    const nowStr = new Date().toLocaleString();
    const existingIndex = tickets.findIndex(
      (t) => t.ticketNumber.toLowerCase().trim() === cleanNo.toLowerCase()
    );

    let updatedTickets: TicketSummary[];
    if (existingIndex !== -1) {
      updatedTickets = tickets.map((t) => {
        if (t.ticketNumber.toLowerCase().trim() === cleanNo.toLowerCase()) {
          return {
            ...t,
            submissionState: 'Submitted' as const,
            isEditing: false,
            submittedAt: nowStr,
            submittedBy: currentUser?.name || t.createdBy || 'QA User',
          };
        }
        return t;
      });
    } else {
      // Re-add to tickets and dashboard because user submitted from another module
      const headerMeta = testCaseHeadersMap[cleanNo] || devTestingHeadersMap[cleanNo];
      const tcList = testCasesMap[cleanNo] || [];
      const obsList = observationsMap[cleanNo] || [];
      const mod = modules.find((m) => m.name.toLowerCase() === (headerMeta?.moduleName || '').toLowerCase()) || modules[0];
      const restoredTicket: TicketSummary = {
        id: `ticket-restored-${Date.now()}`,
        ticketNumber: cleanNo,
        featureName: headerMeta?.taskName || `Feature #${cleanNo}`,
        moduleId: mod?.id || 'mod-term-loan',
        moduleName: mod?.name || 'Term Loan',
        receivedDate: new Date().toISOString().split('T')[0],
        priority: 'High',
        status: 'In Testing',
        developer: headerMeta?.developer || 'Developer',
        qaAssignee: currentUser?.name || headerMeta?.taskDoneBy || 'Maseera Sayyed',
        testCasesCount: tcList.length,
        passedCount: tcList.filter((c) => c.status === 'pass').length,
        failedCount: tcList.filter((c) => c.status === 'fail').length,
        blockedCount: tcList.filter((c) => c.status === 'blocked').length,
        observationsCount: obsList.length,
        submissionState: 'Submitted',
        isEditing: false,
        submittedAt: nowStr,
        submittedBy: currentUser?.name || 'Maseera Sayyed',
        createdBy: currentUser?.name || 'Maseera Sayyed',
        creatorEmail: currentUser?.email || 'maseerasayyed@quantumphinance.com',
      };
      updatedTickets = [restoredTicket, ...tickets];
    }

    setTickets(updatedTickets);
    saveTicketsToStorage(updatedTickets);
    pushSyncToServer({ tickets: updatedTickets });
  };

  // Delete Ticket handler supporting:
  // 1. 'all_modules': Deletes ticket, test cases, observations, dev testing across the whole system
  // 2. 'tickets_tab_only': Deletes from tickets tab only; can reappear if user saves & submits from another module
  const handleDeleteTicket = (
    ticketNo: string,
    mode: 'all_modules' | 'tickets_tab_only'
  ) => {
    const cleanNo = ticketNo.trim().replace(/^#+/, '');
    const cleanNoLower = cleanNo.toLowerCase();

    // 1. Remove from tickets list (matching with or without #)
    const updatedTickets = tickets.filter(
      (t) => (t.ticketNumber || '').trim().replace(/^#+/, '').toLowerCase() !== cleanNoLower
    );
    setTickets(updatedTickets);
    saveTicketsToStorage(updatedTickets);

    // If active ticket is the one being deleted, switch active ticket to the first available or empty
    if ((activeTicketNumber || '').trim().replace(/^#+/, '').toLowerCase() === cleanNoLower) {
      const nextTicket = updatedTickets.length > 0 ? updatedTickets[0].ticketNumber : '';
      setActiveTicketNumber(nextTicket);
    }

    if (mode === 'all_modules') {
      function purgeMap<T>(map: Record<string, T>): Record<string, T> {
        const next: Record<string, T> = {};
        for (const [k, v] of Object.entries(map || {})) {
          if (k.trim().replace(/^#+/, '').toLowerCase() !== cleanNoLower) {
            next[k] = v;
          }
        }
        return next;
      }

      const updatedTcMap = purgeMap<TestCaseItem[]>(testCasesMap);
      setTestCasesMap(updatedTcMap);
      saveTestCasesMapToStorage(updatedTcMap);

      const updatedTcHeaders = purgeMap<TestCaseHeaderMeta>(testCaseHeadersMap);
      setTestCaseHeadersMap(updatedTcHeaders);
      saveTestCaseHeadersMapToStorage(updatedTcHeaders);

      const updatedObsMap = purgeMap<ObservationItem[]>(observationsMap);
      setObservationsMap(updatedObsMap);
      saveObservationsMapToStorage(updatedObsMap);

      const updatedDevMap = purgeMap<DeveloperTestItem[]>(devTestingMap);
      setDevTestingMap(updatedDevMap);
      saveDevTestingMapToStorage(updatedDevMap);

      const updatedDevHeaders = purgeMap<DeveloperTestHeaderMeta>(devTestingHeadersMap);
      setDevTestingHeadersMap(updatedDevHeaders);
      saveDevTestingHeadersMapToStorage(updatedDevHeaders);

      pushSyncToServer({
        tickets: updatedTickets,
        testCasesMap: updatedTcMap,
        testCaseHeadersMap: updatedTcHeaders,
        observationsMap: updatedObsMap,
        devTestingMap: updatedDevMap,
        devTestingHeadersMap: updatedDevHeaders,
      });
    } else {
      // Tickets tab only
      pushSyncToServer({ tickets: updatedTickets });
    }
  };

  // Reopen Edit Mode for Creator
  const handleReopenEditTicket = (ticketNo: string) => {
    const updatedTickets = tickets.map((t) => {
      if (t.ticketNumber.toLowerCase().trim() === ticketNo.toLowerCase().trim()) {
        return {
          ...t,
          submissionState: 'Draft' as const,
          isEditing: true,
        };
      }
      return t;
    });

    setTickets(updatedTickets);
    saveTicketsToStorage(updatedTickets);
    pushSyncToServer({ tickets: updatedTickets });
  };

  // Handle Add New Ticket
  const handleAddTicket = (newTicket: TicketSummary) => {
    const ticketWithCreator: TicketSummary = {
      ...newTicket,
      createdBy: newTicket.createdBy || currentUser?.name || 'Maseera Sayyed',
      creatorEmail: newTicket.creatorEmail || currentUser?.email || 'maseerasayyed@quantumphinance.com',
      submissionState: newTicket.submissionState || 'Draft',
      isEditing: true,
    };
    const nextTickets = [ticketWithCreator, ...tickets];
    setTickets(nextTickets);
    setActiveTicketNumber(ticketWithCreator.ticketNumber);
    saveTicketsToStorage(nextTickets);
    pushSyncToServer({ tickets: nextTickets });
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
            tickets={tickets}
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
            tickets={tickets}
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
            currentUser={currentUser}
          />
        );

      case 'developer-testing':
        return (
          <DeveloperTestingView
            tickets={tickets}
            modules={modules}
            currentUser={currentUser}
            devTestingMap={devTestingMap}
            devTestingHeadersMap={devTestingHeadersMap}
            activeTicketNumber={activeTicketNumber}
            onSelectTicket={(tNo) => setActiveTicketNumber(tNo)}
            onUpdateDevTestingMap={handleUpdateDevTestingMap}
            onAddTicket={handleAddTicket}
            onSaveAndSubmitTicket={handleSaveAndSubmitTicket}
            onReopenEditTicket={handleReopenEditTicket}
            onDeleteTicket={handleDeleteTicket}
          />
        );

      case 'ai-test-hub':
      case 'test-cases':
        return (
          <UnifiedAITestHub
            initialHeader={testCaseHeader}
            initialTestCases={testCasesList}
            tickets={tickets}
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
            onSaveAndSubmitTicket={handleSaveAndSubmitTicket}
            onReopenEditTicket={handleReopenEditTicket}
            onDeleteTicket={handleDeleteTicket}
          />
        );

      case 'review-queue':
        return (
          <SeniorQAReviewQueue
            tickets={tickets}
            testCasesMap={testCasesMap}
            testCaseHeadersMap={testCaseHeadersMap}
            currentUser={currentUser}
            onUpdateHeader={(tNo, h) => {
              const cleanNo = tNo.trim().replace(/^#+/, '');
              setTestCaseHeadersMap((prev) => {
                const next = { ...prev, [tNo]: h, [cleanNo]: h };
                saveTestCaseHeadersMapToStorage(next);
                pushSyncToServer({ testCaseHeadersMap: next });
                return next;
              });
              if (h.reviewStatus) {
                setTickets((prev) => {
                  const cleanLower = cleanNo.toLowerCase();
                  const updated = prev.map((t) => {
                    if ((t.ticketNumber || '').trim().replace(/^#+/, '').toLowerCase() === cleanLower) {
                      return {
                        ...t,
                        reviewStatus: h.reviewStatus,
                        submissionState: h.reviewStatus === 'Draft' ? 'Draft' : 'Submitted',
                        signOffBy: h.signOffBy || t.signOffBy,
                      };
                    }
                    return t;
                  });
                  saveTicketsToStorage(updated);
                  pushSyncToServer({ tickets: updated });
                  return updated;
                });
              }
            }}
            onUpdateTestCases={(tNo, c) => {
              const cleanNo = tNo.trim().replace(/^#+/, '');
              setTestCasesMap((prev) => {
                const next = { ...prev, [tNo]: c, [cleanNo]: c };
                saveTestCasesMapToStorage(next);
                pushSyncToServer({ testCasesMap: next });
                return next;
              });
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
            tickets={tickets}
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
            tickets={tickets}
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
            tickets={tickets}
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
            onSaveAndSubmitTicket={handleSaveAndSubmitTicket}
            onReopenEditTicket={handleReopenEditTicket}
            onDeleteTicket={handleDeleteTicket}
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
      {!isSidebarCollapsed && (
        <Sidebar
          activeTab={activeTab}
          onSelectTab={(tab) => handleNavigateTab(tab)}
          currentUser={currentUser}
          onOpenLoginModal={() => setIsLoginModalOpen(true)}
          onLogout={handleLogout}
          theme={settings.theme}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(true)}
        />
      )}

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
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          onOpenChat={() => setIsChatOpen(true)}
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

      {/* Floating AI QA Chatbot Launcher with Hide / Visible Toggle Option */}
      {!isChatOpen && isChatbotLauncherVisible && (
        <div className="fixed bottom-5 right-5 z-40 flex items-center bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-full shadow-2xl p-1 border border-white/20 animate-fadeIn">
          <button
            onClick={() => setIsChatOpen(true)}
            className="px-4 py-2 text-white font-bold flex items-center gap-2.5 cursor-pointer hover:opacity-95 transition-opacity"
            title="Open Beacon AI QA Chatbot (ChatGPT Style)"
          >
            <Sparkles className="w-4 h-4 text-yellow-300 animate-pulse" />
            <span className="text-xs tracking-wide">AI QA Chatbot</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsChatbotLauncherVisible(false);
              localStorage.setItem('qa_chatbot_visible', 'false');
            }}
            title="Hide QA Chatbot launcher button"
            className="p-1.5 text-white/70 hover:text-white hover:bg-white/20 rounded-full transition-colors cursor-pointer mr-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Discreet button when user chose to hide the floating launcher */}
      {!isChatOpen && !isChatbotLauncherVisible && (
        <button
          onClick={() => {
            setIsChatbotLauncherVisible(true);
            localStorage.setItem('qa_chatbot_visible', 'true');
          }}
          className="fixed bottom-4 right-4 z-40 px-3 py-1.5 bg-slate-900/80 hover:bg-slate-900 text-white rounded-full text-[11px] font-bold shadow-lg flex items-center gap-1.5 cursor-pointer backdrop-blur-sm transition-all hover:scale-105 border border-slate-700/50"
          title="Show AI QA Chatbot"
        >
          <Sparkles className="w-3 h-3 text-yellow-300" />
          <span>Show Chatbot</span>
        </button>
      )}

      {/* Gemini AI Multi-Turn QA Chatbot */}
      <GeminiQaChatbot
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        currentUser={currentUser}
        activeTicket={currentTicket || null}
        onApplyTestCases={(ticketNo, newCases) => {
          setTestCasesMap((prev) => {
            const updated = {
              ...prev,
              [ticketNo]: [...newCases, ...(prev[ticketNo] || [])],
            };
            saveTestCasesMapToStorage(updated);
            return updated;
          });
        }}
      />
    </div>
  );
}
