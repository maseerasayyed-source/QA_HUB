import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { NavTab, UserProfile, BeaconModule, TicketSummary, TestCaseHeaderMeta, TestCaseItem, ObservationHeaderMeta, ObservationItem } from './types';
import {
  loadInitialData,
  saveUserSession,
  saveTicketsToStorage,
  saveTestCasesMapToStorage,
  saveObservationsMapToStorage,
  getRoleByEmail,
  REGISTERED_USERS,
  syncTicketCounts,
} from './data/dbStore';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { DashboardView } from './components/DashboardView';
import { Phase1Welcome } from './components/Phase1Welcome';
import { ModulesView } from './components/ModulesView';
import { TicketsView } from './components/TicketsView';
import { ObservationsView } from './components/ObservationsView';
import { UnifiedAITestHub } from './components/UnifiedAITestHub';
import { X, UserCheck, ShieldCheck, Mail, Ticket } from 'lucide-react';

export default function App() {
  // Load Initial Data from persistent localStorage store
  const [dbState, setDbState] = useState(() => loadInitialData());

  const [currentUser, setCurrentUser] = useState<UserProfile>(dbState.user);
  const [activeTab, setActiveTab] = useState<NavTab>('ai-test-hub');
  const [modules, setModules] = useState<BeaconModule[]>(dbState.modules);
  const [tickets, setTickets] = useState<TicketSummary[]>(() =>
    syncTicketCounts(dbState.tickets, dbState.testCasesMap, dbState.observationsMap)
  );

  const [testCasesMap, setTestCasesMap] = useState<Record<string, TestCaseItem[]>>(dbState.testCasesMap);
  const [observationsMap, setObservationsMap] = useState<Record<string, ObservationItem[]>>(dbState.observationsMap);

  const [activeModuleFilter, setActiveModuleFilter] = useState<string>('all');
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [inputEmail, setInputEmail] = useState<string>(dbState.user.email);

  // Selected Active Ticket ID
  const [activeTicketNumber, setActiveTicketNumber] = useState<string>('21653');

  // Currently active test case header and list for active ticket
  const currentTicket = tickets.find((t) => t.ticketNumber.toLowerCase() === activeTicketNumber.toLowerCase()) || tickets[0];

  const testCaseHeader: TestCaseHeaderMeta = {
    ticketNo: currentTicket?.ticketNumber || '21653',
    clientName: currentTicket?.clientName || 'Treasury Master',
    sha: currentTicket?.shaCommit || 'SHA-1: 4710b619ea012cba75ee657d64ebd49e656948df*',
    taskName: currentTicket?.featureName || 'penalty overdue report',
    taskDoneBy: currentTicket?.qaAssignee || 'Maseera Sayyed',
    signOffBy: currentTicket?.signOffBy || 'Ashwini Poke',
  };

  const testCasesList = testCasesMap[activeTicketNumber] || testCasesMap['21653'] || [];
  const observationsList = observationsMap[activeTicketNumber] || observationsMap['21653'] || [];

  const observationHeader: ObservationHeaderMeta = {
    ticketName: currentTicket?.featureName || 'penalty overdue report',
    ticketNo: currentTicket?.ticketNumber || '21653',
    qaOwner: currentTicket?.qaAssignee || 'Maseera Sayyed',
    clientName: currentTicket?.clientName || 'Treasury Master',
    date: new Date().toISOString().split('T')[0],
  };

  // Sync back tickets, cases, observations whenever map changes
  useEffect(() => {
    const updatedTickets = syncTicketCounts(tickets, testCasesMap, observationsMap);
    saveTicketsToStorage(updatedTickets);
    saveTestCasesMapToStorage(testCasesMap);
    saveObservationsMapToStorage(observationsMap);
  }, [testCasesMap, observationsMap]);

  // Update Test Cases for active ticket
  const handleUpdateTestCases = (newCases: TestCaseItem[]) => {
    const nextMap = { ...testCasesMap, [activeTicketNumber]: newCases };
    setTestCasesMap(nextMap);
    setTickets((prev) => syncTicketCounts(prev, nextMap, observationsMap));
  };

  // Update Observations for active ticket
  const handleUpdateObservations = (newObs: ObservationItem[]) => {
    const nextMap = { ...observationsMap, [activeTicketNumber]: newObs };
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

  // Handle Login via Official Email ID
  const handleLoginWithEmail = (emailStr: string) => {
    const norm = emailStr.toLowerCase().trim();
    if (!norm) return;

    const matched = REGISTERED_USERS.find((u) => u.email.toLowerCase() === norm);
    let newUser: UserProfile;

    if (matched) {
      newUser = matched;
    } else {
      const derivedRole = getRoleByEmail(norm);
      const namePart = norm.split('@')[0].replace(/[._]/g, ' ');
      const capitalizedName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
      newUser = {
        name: capitalizedName,
        email: norm,
        role: derivedRole,
        department: 'Quality Assurance',
        status: 'Active',
        joiningDate: new Date().toISOString().split('T')[0],
      };
    }

    setCurrentUser(newUser);
    saveUserSession(newUser);
    setIsLoginModalOpen(false);
  };

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
              setActiveTicketNumber(t.ticketNumber);
              setActiveTab('ai-test-hub');
            }}
            onNavigateTab={(tab) => {
              setIsGuideOpen(false);
              setActiveTab(tab);
            }}
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
            onUpdateHeader={(newH) => setActiveTicketNumber(newH.ticketNo)}
            onUpdateTestCases={handleUpdateTestCases}
          />
        );

      case 'observations':
        return (
          <ObservationsView
            tickets={tickets}
            initialHeader={observationHeader}
            initialObservations={observationsList}
            onUpdateHeader={(newH) => setActiveTicketNumber(newH.ticketNo)}
            onUpdateObservations={handleUpdateObservations}
          />
        );

      case 'modules':
        return (
          <ModulesView
            modules={modules}
            onAddModule={(m) => setModules([m, ...modules])}
          />
        );

      case 'qa-team':
        return (
          <div className="p-8 max-w-5xl mx-auto space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-bold text-slate-900">QA Team Roles &amp; Privacy Authority Levels</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Official Email Login authentication state and role assignments for Beacon QA Hub.
                  </p>
                </div>
                <button
                  onClick={() => setIsLoginModalOpen(true)}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg cursor-pointer"
                >
                  Switch Official Email / User
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl space-y-2">
                  <div className="font-bold text-purple-900 flex items-center gap-1.5 text-sm">
                    <ShieldCheck className="w-4 h-4 text-purple-600" />
                    <span>Maseera Sayyed</span>
                  </div>
                  <div className="px-2 py-0.5 bg-purple-200 text-purple-900 font-bold rounded text-[10px] inline-block">
                    Super Admin
                  </div>
                  <p className="text-purple-950/80 text-[11px] leading-relaxed">
                    Full authority: Manage users, tickets, modules, database backups, and final sign-offs.
                  </p>
                </div>

                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                  <div className="font-bold text-emerald-900 flex items-center gap-1.5 text-sm">
                    <UserCheck className="w-4 h-4 text-emerald-600" />
                    <span>Ashwini Poke</span>
                  </div>
                  <div className="px-2 py-0.5 bg-emerald-200 text-emerald-900 font-bold rounded text-[10px] inline-block">
                    Admin
                  </div>
                  <p className="text-emerald-950/80 text-[11px] leading-relaxed">
                    Management authority: Review test cases, assign tickets to QA, and sign off test releases.
                  </p>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
                  <div className="font-bold text-blue-900 flex items-center gap-1.5 text-sm">
                    <Mail className="w-4 h-4 text-blue-600" />
                    <span>Team Users (QA / Dev)</span>
                  </div>
                  <div className="px-2 py-0.5 bg-blue-200 text-blue-900 font-bold rounded text-[10px] inline-block">
                    User
                  </div>
                  <p className="text-blue-950/80 text-[11px] leading-relaxed">
                    Standard authority: Execute test cases, attach screenshots, and raise observations.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div className="font-bold text-slate-800">Current Logged-In User Session:</div>
                <div className="text-slate-600 mt-1">
                  <strong>{currentUser.name}</strong> ({currentUser.email}) • Authority Level: <strong className="text-blue-700">{currentUser.role}</strong>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <UnifiedAITestHub
            initialHeader={testCaseHeader}
            initialTestCases={testCasesList}
            tickets={tickets}
            modules={modules}
            onUpdateHeader={(newH) => setActiveTicketNumber(newH.ticketNo)}
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
        onSelectTab={(tab) => {
          setIsGuideOpen(false);
          setActiveTab(tab);
        }}
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

      {/* Official Email ID Login Modal */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-blue-400" />
                <h2 className="text-base font-bold">Official Email ID Login</h2>
              </div>
              <button
                onClick={() => setIsLoginModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <p className="text-slate-600">
                Log in with your official email ID. Authority level (Super Admin, Admin, or User) is automatically determined based on your email:
              </p>

              {/* Preset Quick Login Buttons */}
              <div className="space-y-2">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Quick Select Registered Users:
                </div>

                {REGISTERED_USERS.map((user) => (
                  <button
                    key={user.email}
                    onClick={() => {
                      setCurrentUser(user);
                      saveUserSession(user);
                      setIsLoginModalOpen(false);
                    }}
                    className={`w-full p-2.5 rounded-lg border text-left flex items-center justify-between transition-colors cursor-pointer ${
                      currentUser.email.toLowerCase() === user.email.toLowerCase()
                        ? 'bg-blue-50 border-blue-400 font-bold text-blue-900'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs">{user.name}</div>
                      <div className="text-[10px] text-slate-500">{user.email}</div>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        user.role === 'Super Admin'
                          ? 'bg-purple-100 text-purple-800'
                          : user.role === 'Admin'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {user.role}
                    </span>
                  </button>
                ))}
              </div>

              {/* Custom Email Input */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <label className="block text-slate-700 font-bold">Or enter official email ID:</label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={inputEmail}
                    onChange={(e) => setInputEmail(e.target.value)}
                    placeholder="e.g. name@quantumphinance.com"
                    className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => handleLoginWithEmail(inputEmail)}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg cursor-pointer"
                  >
                    Login
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
