import React, { useState } from 'react';
import {
  CheckCircle2,
  Database,
  GitBranch,
  Layers,
  ArrowRight,
  Sparkles,
  FileSpreadsheet,
  AlertTriangle,
  FileCode2,
  Terminal,
  Server,
  ShieldCheck,
  Send,
  HelpCircle,
} from 'lucide-react';

interface Phase1WelcomeProps {
  onFormatSubmitted: (formatSummary: string) => void;
  savedFormat: string | null;
  onOpenWorkbench?: () => void;
}

export const Phase1Welcome: React.FC<Phase1WelcomeProps> = ({
  onFormatSubmitted,
  savedFormat,
  onOpenWorkbench,
}) => {
  const [activeTab, setActiveTab] = useState<'architecture' | 'roadmap' | 'format-input' | 'beginner-guide'>('format-input');
  const [customFormatInput, setCustomFormatInput] = useState(savedFormat || '');
  const [formatSavedNotification, setFormatSavedNotification] = useState(false);

  const handleSaveFormat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customFormatInput.trim()) return;
    onFormatSubmitted(customFormatInput);
    setFormatSavedNotification(true);
    setTimeout(() => setFormatSavedNotification(false), 3000);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-xl p-6 border border-slate-700 shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                Phase 1 Foundation
              </span>
              <span className="text-xs text-slate-300">Beacon Finance QA Platform</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Welcome to QA HUB — &quot;One Hub for Smarter QA&quot;
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              A scalable, modular QA workbench tailored for Beacon. As requested, we build step-by-step
              with clear beginner instructions, waiting for your custom Test Case format before locking in database tables.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-slate-800/80 border border-slate-700 p-3 rounded-lg text-xs">
              <div className="text-slate-400">Current Phase:</div>
              <div className="font-semibold text-emerald-400 flex items-center gap-1.5 mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Phase 1: Architecture &amp; Format Prep</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveTab('format-input')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'format-input'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>1. Provide Test Case Format</span>
          {savedFormat && (
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('architecture')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'architecture'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>2. System &amp; DB Architecture</span>
        </button>

        <button
          onClick={() => setActiveTab('roadmap')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'roadmap'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>3. MVP Scope &amp; Roadmap</span>
        </button>

        <button
          onClick={() => setActiveTab('beginner-guide')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'beginner-guide'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>4. Beginner VS Code &amp; GitHub Guide</span>
        </button>
      </div>

      {/* Tab Content 1: Format Input */}
      {activeTab === 'format-input' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Step A: Provide Your Existing Test Case Format
                </h2>
                <p className="text-xs text-slate-500">
                  We will NOT add or delete columns. Paste your exact column names or spreadsheet structure below.
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold text-emerald-950">Excel Format Detected &amp; Loaded:</strong> Header block (Ticket No, Client Name, SHA, Task Name, Done by, Sign off By) + 10 Columns (TestCase_ID, Test Module, feature tab /flow report, Test Scenario, Test Cases, Test Inputs, Expected Result, Actual Result, Status, Screenshot1) with instant Excel (.xlsx) download!
                </div>
              </div>
              {onOpenWorkbench && (
                <button
                  type="button"
                  onClick={onOpenWorkbench}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-xs shrink-0 cursor-pointer shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Open Test Cases &amp; Download</span>
                </button>
              )}
            </div>

            <form onSubmit={handleSaveFormat} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Paste your test case format columns / headers / sample rows:
                </label>
                <textarea
                  rows={7}
                  value={customFormatInput}
                  onChange={(e) => setCustomFormatInput(e.target.value)}
                  placeholder={`Example:
1. Test Case ID
2. Module / Sub-module
3. Test Scenario
4. Pre-conditions
5. Test Steps
6. Test Data
7. Expected Result
8. Actual Result
9. Execution Status (Pass/Fail/Blocked)
10. Severity / Priority
11. Tester Name
12. Execution Date
13. Remarks / Observation ID`}
                  className="w-full text-xs font-mono p-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800"
                ></textarea>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="text-xs text-slate-500">
                  {savedFormat ? (
                    <span className="text-emerald-600 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Format received &amp; ready for Phase 2 database migration
                    </span>
                  ) : (
                    <span>You can paste it here or in your next chat message.</span>
                  )}
                </div>

                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-md flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Register Format in QA HUB</span>
                </button>
              </div>

              {formatSavedNotification && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-md">
                  Test case format registered successfully! Ready for database mapping.
                </div>
              )}
            </form>
          </div>

          {/* Quick Beacon Scope Overview */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Beacon Financial Modules Supported
            </h3>
            <p className="text-xs text-slate-600">
              QA HUB comes pre-loaded with 18 Beacon financial modules configured in the database layer:
            </p>
            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {[
                { name: 'Term Loan (Amortization, Bullet)', tag: 'Lending' },
                { name: 'Short Term Loan & WCDL', tag: 'Lending' },
                { name: 'Letter of Credit & Bank Guarantees', tag: 'Trade' },
                { name: 'Cash Credit (CC) & Overdraft (OD)', tag: 'Limits' },
                { name: 'Investments: NCD, GSec, CP, FD, MF', tag: 'Treasury' },
                { name: 'Interest & Day-Count (30/360, Act/365)', tag: 'Calculations' },
                { name: 'Cashflows & Projections', tag: 'ALM' },
                { name: 'Accounting & Journal Entries', tag: 'Ledger' },
                { name: 'Payment Bulk & Maker-Checker', tag: 'Workflows' },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded bg-white border border-slate-200 text-xs"
                >
                  <span className="font-medium text-slate-800 truncate">{item.name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                    {item.tag}
                  </span>
                </div>
              ))}
            </div>
            <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200">
              Modules are 100% dynamic and stored in the database so you can add new products anytime.
            </div>
          </div>
        </div>
      )}

      {/* Tab Content 2: Architecture */}
      {activeTab === 'architecture' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
              <div className="flex items-center gap-2 mb-2 text-indigo-600">
                <FileCode2 className="w-5 h-5" />
                <h3 className="font-bold text-sm text-slate-900">Frontend (UI)</h3>
              </div>
              <p className="text-xs text-slate-600 mb-3">
                React with Vite &amp; Tailwind CSS. Component-driven design with Lucide icons.
              </p>
              <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
                <li>Modular layout with dedicated tab routing</li>
                <li>Zero complicated setups, instant live preview</li>
                <li>Accessible financial data tables &amp; forms</li>
              </ul>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
              <div className="flex items-center gap-2 mb-2 text-indigo-600">
                <Server className="w-5 h-5" />
                <h3 className="font-bold text-sm text-slate-900">Backend &amp; Server</h3>
              </div>
              <p className="text-xs text-slate-600 mb-3">
                Node.js &amp; Express API routes. Keeps credentials safe and proxies AI requests securely.
              </p>
              <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
                <li>RESTful API routes (/api/tickets, /api/test-cases)</li>
                <li>Gemini API server-side integration</li>
                <li>File &amp; screenshot attachment storage</li>
              </ul>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
              <div className="flex items-center gap-2 mb-2 text-indigo-600">
                <Database className="w-5 h-5" />
                <h3 className="font-bold text-sm text-slate-900">Database (PostgreSQL)</h3>
              </div>
              <p className="text-xs text-slate-600 mb-3">
                PostgreSQL connected via pgAdmin locally. Relational design with foreign keys.
              </p>
              <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
                <li>users, roles, modules</li>
                <li>tickets, test_cases, test_executions</li>
                <li>observations, developer_testing, audit_logs</li>
              </ul>
            </div>
          </div>

          {/* Database Schema Map */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Database className="w-4 h-4 text-indigo-600" />
              <span>Recommended Relational Schema Architecture (PostgreSQL)</span>
            </h3>
            <p className="text-xs text-slate-600 mb-4">
              Here is how each table connects to ensure data integrity without circular dependencies:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="font-bold text-slate-900 mb-1 border-b border-slate-200 pb-1">
                  1. Core Reference
                </div>
                <div className="text-slate-600 space-y-1 font-mono text-[11px]">
                  <div>users (id, name, email, role)</div>
                  <div>modules (id, name, code)</div>
                  <div>roles (id, role_name)</div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="font-bold text-slate-900 mb-1 border-b border-slate-200 pb-1">
                  2. Tickets &amp; Dev Testing
                </div>
                <div className="text-slate-600 space-y-1 font-mono text-[11px]">
                  <div>tickets (id, module_id, qa_id)</div>
                  <div>developer_testing (ticket_id, dev_id, scenarios, status)</div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="font-bold text-slate-900 mb-1 border-b border-slate-200 pb-1">
                  3. Test Cases (Dynamic)
                </div>
                <div className="text-slate-600 space-y-1 font-mono text-[11px]">
                  <div>test_cases (id, ticket_id, ...)</div>
                  <div className="text-indigo-600 font-semibold italic">
                    *Columns mapped directly from your format
                  </div>
                  <div>test_executions (history logs)</div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="font-bold text-slate-900 mb-1 border-b border-slate-200 pb-1">
                  4. Quality &amp; Audit
                </div>
                <div className="text-slate-600 space-y-1 font-mono text-[11px]">
                  <div>observations (id, ticket_id)</div>
                  <div>attachments (screenshot_url)</div>
                  <div>audit_logs (who, when, what)</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content 3: MVP Scope vs Future */}
      {activeTab === 'roadmap' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-5">
              <h3 className="text-sm font-bold text-emerald-950 flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Phase 1-4 MVP Scope (What We Build First)</span>
              </h3>
              <ul className="text-xs text-emerald-900 space-y-2.5">
                <li className="flex items-start gap-2">
                  <span className="font-bold">1. Project Setup:</span> Clean VS Code workspace, Tailwind layout, responsive sidebar &amp; topbar.
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold">2. Test Case Format Ingestion:</span> Registering your exact spreadsheet format without adding or removing columns.
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold">3. Ticket Management:</span> Create tickets for Beacon features, assign module, developer &amp; QA.
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold">4. Developer Testing Section:</span> Separate record of pre-QA developer tests and limitations.
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold">5. AI Test Case Generator:</span> Input requirement + Beacon UI screenshot → generates cases in your format.
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold">6. Test Case Editor &amp; Execution:</span> Edit every cell, run test execution, track pass/fail/blocked.
                </li>
              </ul>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-3">
                <Layers className="w-4 h-4 text-slate-500" />
                <span>Later Phases (Deferred for Scalability)</span>
              </h3>
              <ul className="text-xs text-slate-600 space-y-2.5">
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-slate-700">Complex Analytics:</span> Defect leakage formulas, MTTR calculation, and heatmap trends.
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-slate-700">AI Senior QA Assistant:</span> Chatbot assistant analyzing historical regressions and duplicate detection.
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-slate-700">Multi-tenant Cloud Auth:</span> Enterprise SSO or corporate LDAP integration.
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-slate-700">Custom Domain &amp; SSL:</span> Setting up https://qa-hub.company.com (after local testing is rock solid).
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content 4: Beginner Guide */}
      {activeTab === 'beginner-guide' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-5">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900">
              Beginner Step-by-Step Guide for VS Code, GitHub &amp; PostgreSQL
            </h3>
          </div>

          <div className="space-y-4 text-xs text-slate-700">
            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
              <div className="font-bold text-slate-900 mb-1">Tools You Need on Your Computer:</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                <div className="flex items-center gap-2 p-2 bg-white rounded border border-slate-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <div>
                    <div className="font-semibold">Node.js (v18 or v20)</div>
                    <div className="text-[11px] text-slate-500">Runs JavaScript/TypeScript on your computer</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 bg-white rounded border border-slate-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <div>
                    <div className="font-semibold">VS Code</div>
                    <div className="text-[11px] text-slate-500">The code editor where you work</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 bg-white rounded border border-slate-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <div>
                    <div className="font-semibold">Git</div>
                    <div className="text-[11px] text-slate-500">Version control software to push to GitHub</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 bg-white rounded border border-slate-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <div>
                    <div className="font-semibold">PostgreSQL &amp; pgAdmin 4</div>
                    <div className="text-[11px] text-slate-500">Your local relational database engine</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-slate-900">How You Will Run QA HUB Locally:</h4>
              <ol className="list-decimal list-inside space-y-1.5 pl-1">
                <li>Open VS Code. Open your project folder.</li>
                <li>Press <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-700 font-mono">Ctrl + `</code> (backtick) to open the Terminal in VS Code.</li>
                <li>Type <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-900 font-mono font-bold">npm run dev</code> and hit Enter.</li>
                <li>Your terminal will show: <code className="text-emerald-700 font-mono">Local: http://localhost:3000</code>.</li>
                <li>Open your browser (Chrome or Edge) and go to <code className="text-indigo-600 font-mono">http://localhost:3000</code>. QA HUB is live!</li>
              </ol>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-200">
              <h4 className="font-bold text-slate-900">What Happens When You Close VS Code or Restart?</h4>
              <p className="text-slate-600">
                Nothing is lost! All your files remain saved on your hard drive, and all data in PostgreSQL remains safely in your database.
                Whenever you want to work again, just open VS Code and run <code className="bg-slate-100 px-1 py-0.5 rounded font-mono font-bold">npm run dev</code>.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
