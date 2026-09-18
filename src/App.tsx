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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

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

  // Update Test Cases for active ticket
  const handleUpdateTestCases = (newCases: TestCaseItem[], ticketNum?: string) => {
    const targetTicket = ticketNum || activeTicketNumber;
    const nextMap = { ...testCasesMap, [targetTicket]: newCases };
    setTestCasesMap(nextMap);
    setTickets((prev) => syncTicketCounts(prev, nextMap, observationsMap));
  };

  const handleUpdateTestCaseHeader = (newHeader: TestCaseHeaderMeta) => {
    setTestCaseHeadersMap((prev) => ({
      ...prev,
      [newHeader.ticketNo]: newHeader,
    }));
    setActiveTicketNumber(newHeader.ticketNo);
  };

  // Update Developer Testing Map
  const handleUpdateDevTestingMap = (
    ticketNo: string,
    items: DeveloperTestItem[],
    header?: DeveloperTestHeaderMeta
  ) => {
    setDevTestingMap((prev) => ({ ...prev, [ticketNo]: items }));
    if (header) {
      setDevTestingHeadersMap((prev) => ({ ...prev, [ticketNo]: header }));
    }
  };

  // Update Observations for active ticket
  const handleUpdateObservations = (newObs: ObservationItem[], ticketNum?: string) => {
    const target = ticketNum || activeTicketNumber;
    const nextMap = { ...observationsMap, [target]: newObs };
    setObservationsMap(nextMap);
    setTickets((prev) => syncTicketCounts(prev, testCasesMap, nextMap));
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
