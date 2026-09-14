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
import { LoginPage } from './components/LoginPage';
import { X, UserCheck, ShieldCheck, Mail, LogOut } from 'lucide-react';

export default function App() {
  // Load Initial Data from persistent localStorage store
  const [dbState, setDbState] = useState(() => loadInitialData());

  // App Settings (Theme & Font)
  const [settings, setSettings] = useState<AppSettings>(dbState.settings || { theme: 'Default', font: 'Inter' });

  // Current logged in user (null if not authenticated)
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(dbState.user);

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

  const [activeModuleFilter, setActiveModuleFilter] = useState<string>('all');
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);

  // Selected Active Ticket ID
  const [activeTicketNumber, setActiveTicketNumber] = useState<string>('21653');

  // Currently active ticket
  const currentTicket =
    tickets.find((t) => t.ticketNumber.toLowerCase() === activeTicketNumber.toLowerCase()) ||
    tickets[0];

  const testCaseHeader: TestCaseHeaderMeta = testCaseHeadersMap[activeTicketNumber] || {
    ticketNo: currentTicket?.ticketNumber || '21653',
    clientName: currentTicket?.clientName || 'Treasury Master',
    sha: currentTicket?.shaCommit || 'SHA-1: 4710b619ea012cba75ee657d64ebd49e656948df*',
    taskName: currentTicket?.featureName || 'penalty overdue report',
    taskDoneBy: currentTicket?.qaAssignee || 'Maseera Sayyed',
    signOffBy: currentTicket?.signOffBy || 'Ashwini Poke',
    reviewStatus: 'Draft',
    version: '1.0',
  };

  const testCasesList =
    activeTicketNumber in testCasesMap
      ? testCasesMap[activeTicketNumber]
      : activeTicketNumber === '21653'
      ? testCasesMap['21653'] || []
      : [];

  const observationsList =
    activeTicketNumber in observationsMap
      ? observationsMap[activeTicketNumber]
      : activeTicketNumber === '21653'
      ? observationsMap['21653'] || []
      : [];

  const observationHeader: ObservationHeaderMeta = {
    ticketName: currentTicket?.featureName || 'penalty overdue report',
    ticketNo: currentTicket?.ticketNumber || '21653',
    qaOwner: currentTicket?.qaAssignee || 'Maseera Sayyed',
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
    const nextTickets = [newTicket, ...tickets];
    setTickets(nextTickets);
    setActiveTicketNumber(newTicket.ticketNumber);
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
            onSelectTicket={(tNo) => {
              setActiveTicketNumber(tNo);
            }}
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
            tickets={tickets}
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
                <h2 className="text-base font-bold">Switch Official User / Logout</h2>
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
                <div className="font-bold text-slate-800">Currently Logged-In User:</div>
                <div className="text-slate-600 mt-1">
                  <strong>{currentUser.name}</strong> ({currentUser.email})
                </div>
                <div className="text-xs text-blue-700 font-bold mt-0.5">
                  Role: {currentUser.role}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => {
                    handleLogout();
                    setIsLoginModalOpen(false);
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg cursor-pointer flex items-center gap-1.5"
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
