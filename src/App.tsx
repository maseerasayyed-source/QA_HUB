import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { NavTab, UserProfile, BeaconModule, TicketSummary, TestCaseHeaderMeta, TestCaseItem } from './types';
import {
  INITIAL_USER,
  INITIAL_MODULES,
  INITIAL_TICKETS,
  INITIAL_TEST_CASE_HEADER,
  INITIAL_TEST_CASES,
} from './data/initialData';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { DashboardView } from './components/DashboardView';
import { Phase1Welcome } from './components/Phase1Welcome';
import { DeveloperTestingView } from './components/DeveloperTestingView';
import { ModulesView } from './components/ModulesView';
import { TicketsView } from './components/TicketsView';
import { ObservationsView } from './components/ObservationsView';
import { UnifiedAITestHub } from './components/UnifiedAITestHub';

export default function App() {
  const [currentUser] = useState<UserProfile>(INITIAL_USER);
  const [activeTab, setActiveTab] = useState<NavTab>('ai-test-hub');
  const [modules, setModules] = useState<BeaconModule[]>(INITIAL_MODULES);
  const [tickets, setTickets] = useState<TicketSummary[]>(INITIAL_TICKETS);
  const [activeModuleFilter, setActiveModuleFilter] = useState<string>('all');
  const [savedTestCaseFormat, setSavedTestCaseFormat] = useState<string | null>(
    'Rows 1-6: Ticket No, Client Name, SHA, Task Name, Task done by, Sign off By. Row 9: TestCase_ID, Test Module, feature tab /flow report, Test Scenario, Test Cases, Test Inputs, Expected Result, Actual Result, Status, Screenshot1'
  );
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);

  const [testCaseHeader, setTestCaseHeader] = useState<TestCaseHeaderMeta>(INITIAL_TEST_CASE_HEADER);
  const [testCasesList, setTestCasesList] = useState<TestCaseItem[]>(INITIAL_TEST_CASES);

  const handleAddModule = (newMod: BeaconModule) => {
    setModules((prev) => [newMod, ...prev]);
  };

  const handleFormatSaved = (formatStr: string) => {
    setSavedTestCaseFormat(formatStr);
  };

  const renderActiveTabContent = () => {
    if (isGuideOpen) {
      return (
        <Phase1Welcome
          onFormatSubmitted={handleFormatSaved}
          savedFormat={savedTestCaseFormat}
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
              setActiveTab('tickets');
            }}
            onNavigateTab={(tab) => {
              setIsGuideOpen(false);
              setActiveTab(tab);
            }}
          />
        );

      case 'tickets':
        return (
          <TicketsView
            tickets={tickets}
            modules={modules}
            onSelectTicket={(t) => {
              setTestCaseHeader((prev) => ({
                ...prev,
                ticketNo: t.ticketNumber,
                taskName: t.featureName,
                clientName: t.clientName || prev.clientName,
                sha: t.shaCommit || prev.sha,
                taskDoneBy: t.qaAssignee || prev.taskDoneBy,
                signOffBy: t.signOffBy || prev.signOffBy,
              }));
              setActiveTab('ai-test-hub');
            }}
            onNavigateTab={(tab) => {
              setIsGuideOpen(false);
              setActiveTab(tab);
            }}
          />
        );

      case 'ai-test-hub':
      case 'generator':
      case 'test-cases':
      case 'execution':
        return (
          <UnifiedAITestHub
            initialHeader={testCaseHeader}
            initialTestCases={testCasesList}
            tickets={tickets}
            modules={modules}
            onUpdateHeader={setTestCaseHeader}
            onUpdateTestCases={setTestCasesList}
          />
        );

      case 'developer-testing':
        return <DeveloperTestingView tickets={tickets} />;

      case 'modules':
        return (
          <ModulesView
            modules={modules}
            onAddModule={handleAddModule}
          />
        );

      case 'observations':
        return <ObservationsView tickets={tickets} />;

      case 'qa-team':
        return (
          <div className="p-8 max-w-5xl mx-auto">
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs">
              <h2 className="text-sm font-bold text-slate-900 mb-2">QA Team &amp; Role Management</h2>
              <p className="text-xs text-slate-500 mb-4">
                Users and roles (Super Admin, Senior QA, QA, Developer, Viewer) will be linked to PostgreSQL in Phase 2.
              </p>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                <div className="font-semibold text-slate-800">Current Logged-in User:</div>
                <div className="text-slate-600 mt-1">{currentUser.name} ({currentUser.email}) - {currentUser.role}</div>
              </div>
            </div>
          </div>
        );

      case 'reports':
      case 'ai-assistant':
      case 'settings':
      default:
        return (
          <div className="p-8 max-w-5xl mx-auto">
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs text-center space-y-3">
              <h2 className="text-base font-bold text-slate-900 capitalize">
                {activeTab.replace('-', ' ')} Module
              </h2>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Part of the QA HUB scalable architecture. As scheduled in our MVP roadmap, this section activates in subsequent phases after the core test case flow is operational.
              </p>
              <button
                onClick={() => setIsGuideOpen(true)}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
              >
                Review Phase 1 Roadmap &amp; Architecture
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans text-slate-800 overflow-hidden">
      {/* 1. Left Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setIsGuideOpen(false);
          setActiveTab(tab);
        }}
        currentUser={currentUser}
      />

      {/* 2. Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar
          currentUser={currentUser}
          activeModuleFilter={activeModuleFilter}
          onModuleFilterChange={setActiveModuleFilter}
          modules={modules}
          onOpenGuide={() => setIsGuideOpen(true)}
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
    </div>
  );
}
