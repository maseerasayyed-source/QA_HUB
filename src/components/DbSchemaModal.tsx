import React, { useState } from 'react';
import { Database, Copy, CheckCircle2, X, Terminal, Server, Table } from 'lucide-react';

interface DbSchemaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DbSchemaModal: React.FC<DbSchemaModalProps> = ({ isOpen, onClose }) => {
  const [copiedKey, setCopiedKey] = useState<string>('');
  const [activeSchemaTab, setActiveSchemaTab] = useState<'sql' | 'instructions'>('sql');

  if (!isOpen) return null;

  const sqlDDL = `-- ==========================================================
-- PostgreSQL Database Schema for Beacon QA Hub (All Modules)
-- Run this in your PostgreSQL / Cloud SQL / Supabase terminal:
-- ==========================================================

-- 1. Users Table
CREATE TABLE IF NOT EXISTS qa_users (
    id VARCHAR(120) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'QA',
    department VARCHAR(100) DEFAULT 'Quality Assurance',
    status VARCHAR(20) DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Modules Table
CREATE TABLE IF NOT EXISTS beacon_modules (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50) NOT NULL,
    category VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tickets Table
CREATE TABLE IF NOT EXISTS qa_tickets (
    id VARCHAR(100) PRIMARY KEY,
    ticket_number VARCHAR(50) UNIQUE NOT NULL,
    feature_name VARCHAR(255) NOT NULL,
    module_id VARCHAR(50) REFERENCES beacon_modules(id),
    module_name VARCHAR(150),
    developer VARCHAR(150),
    qa_assignee VARCHAR(150),
    created_by VARCHAR(150),
    creator_email VARCHAR(255),
    client_name VARCHAR(150) DEFAULT 'Treasury Master',
    priority VARCHAR(30) DEFAULT 'Medium',
    status VARCHAR(50) DEFAULT 'New',
    test_cases_count INT DEFAULT 0,
    passed_count INT DEFAULT 0,
    failed_count INT DEFAULT 0,
    observations_count INT DEFAULT 0,
    description TEXT,
    received_date VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Test Cases Table
CREATE TABLE IF NOT EXISTS qa_test_cases (
    id VARCHAR(100) PRIMARY KEY,
    ticket_number VARCHAR(50) NOT NULL,
    test_case_id VARCHAR(50) NOT NULL,
    test_module VARCHAR(100),
    feature_tab VARCHAR(100),
    test_scenario TEXT NOT NULL,
    test_cases_steps TEXT NOT NULL,
    test_inputs TEXT,
    expected_result TEXT NOT NULL,
    actual_result TEXT,
    status VARCHAR(30) DEFAULT 'not run',
    validation_scenario TEXT,
    additional_coverage TEXT,
    review_status VARCHAR(50) DEFAULT 'Draft',
    version VARCHAR(20) DEFAULT '1.0',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. NEW: User Manuals Table (Word & SOP Generator)
CREATE TABLE IF NOT EXISTS qa_user_manuals (
    id VARCHAR(100) PRIMARY KEY,
    ticket_number VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    module_name VARCHAR(100) NOT NULL,
    version VARCHAR(20) DEFAULT '1.0',
    author_name VARCHAR(150) NOT NULL,
    author_email VARCHAR(255) NOT NULL,
    client_name VARCHAR(150) DEFAULT 'Treasury Master',
    overview TEXT,
    prerequisites JSONB DEFAULT '[]'::jsonb,
    workflow_steps JSONB DEFAULT '[]'::jsonb,
    faq_troubleshooting JSONB DEFAULT '[]'::jsonb,
    attached_test_cases_summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. NEW: Daily Task Work Log Table
CREATE TABLE IF NOT EXISTS qa_daily_tasks (
    id VARCHAR(100) PRIMARY KEY,
    date DATE NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    user_name VARCHAR(150) NOT NULL,
    task_title VARCHAR(255) NOT NULL,
    ticket_no VARCHAR(50),
    module_name VARCHAR(100),
    time_spent_hours NUMERIC(4, 2) NOT NULL DEFAULT 1.0,
    time_slot VARCHAR(100),
    status VARCHAR(30) NOT NULL DEFAULT 'In Progress',
    notes_or_remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. NEW: User Personal Notepad / Standup Notes Table
CREATE TABLE IF NOT EXISTS qa_user_notepads (
    id VARCHAR(100) PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    category VARCHAR(50) DEFAULT 'Daily Standup',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for lightning queries
CREATE INDEX IF NOT EXISTS idx_qa_daily_tasks_user_date ON qa_daily_tasks(user_email, date);
CREATE INDEX IF NOT EXISTS idx_qa_user_manuals_ticket ON qa_user_manuals(ticket_number);
CREATE INDEX IF NOT EXISTS idx_qa_test_cases_ticket ON qa_test_cases(ticket_number);
`;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(''), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 animate-scale-in max-h-[90vh] flex flex-col space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Database Schema &amp; Table Creation Guide
              </h2>
              <p className="text-xs text-slate-500">
                PostgreSQL table definitions for User Manuals, Daily Tasks, and existing QA entities.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div className="flex items-center gap-2 text-xs font-bold">
            <button
              onClick={() => setActiveSchemaTab('sql')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeSchemaTab === 'sql'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              SQL DDL Script (PostgreSQL)
            </button>
            <button
              onClick={() => setActiveSchemaTab('instructions')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeSchemaTab === 'instructions'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              How to Connect &amp; Execute
            </button>
          </div>

          <button
            onClick={() => copyToClipboard(sqlDDL, 'sql')}
            className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
          >
            {copiedKey === 'sql' ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy SQL Query</span>
              </>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto pr-1">
          {activeSchemaTab === 'sql' ? (
            <pre className="p-4 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono overflow-x-auto leading-relaxed">
              <code>{sqlDDL}</code>
            </pre>
          ) : (
            <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-950">
                <h4 className="font-bold text-sm mb-1">How Database Connection Works</h4>
                <p>
                  The app uses browser-backed offline persistence by default so you never lose work.
                  When you connect to an external PostgreSQL database (e.g. AWS RDS, GCP Cloud SQL, or Supabase),
                  you can execute the provided DDL script to create the tables.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 text-sm">Step 1: Execute Table DDL</h4>
                <p className="text-slate-600">
                  Open your database management tool (pgAdmin, DBeaver, or psql terminal) and paste the SQL script from the previous tab. It will create:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-600 font-medium">
                  <li><strong className="text-slate-900">qa_user_manuals</strong>: Stores generated SOP user manuals, step JSON, and screenshot links.</li>
                  <li><strong className="text-slate-900">qa_daily_tasks</strong>: Stores every user's daily work items, time spent, date, and status.</li>
                  <li><strong className="text-slate-900">qa_user_notepads</strong>: Stores private scratchpads and standup notes.</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 text-sm">Step 2: Environment Variables</h4>
                <p className="text-slate-600">
                  Set your PostgreSQL credentials in your environment configuration:
                </p>
                <div className="p-3 bg-slate-100 rounded-lg font-mono text-[11px] text-slate-800">
                  DATABASE_URL=postgresql://user:password@hostname:5432/beacon_qa_db
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 pt-3 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
