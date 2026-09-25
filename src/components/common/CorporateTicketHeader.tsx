import React, { useState, useEffect, useMemo } from 'react';
import {
  Ticket,
  User,
  GitCommit,
  Building2,
  FileCheck2,
  Copy,
  Check,
  ChevronDown,
  Edit3,
  ExternalLink,
  Code2,
  Languages,
  Unlock,
  Lock,
} from 'lucide-react';
import { TicketSummary } from '../../types';
import { getAllCreatedTicketsOnSystem } from '../../data/dbStore';
import { translateToSimpleEnglish } from '../../utils/languageAi';

export interface CorporateTicketHeaderProps {
  selectedTicketNumber: string;
  tickets: TicketSummary[];
  onSelectTicket: (ticketNumber: string) => void;
  mode?: 'developer' | 'qa' | 'observations';
  // Metadata fields matching Picture 4:
  clientName?: string;
  onChangeClientName?: (val: string) => void;
  moduleName?: string;
  onChangeModuleName?: (val: string) => void;
  taskName?: string; // One line task/feature title
  onChangeTaskName?: (val: string) => void;
  qaAssignee?: string; // Task done by
  onChangeQaAssignee?: (val: string) => void;
  developer?: string;
  onChangeDeveloper?: (val: string) => void;
  sha?: string;
  onChangeSha?: (val: string) => void;
  signOffBy?: string;
  onChangeSignOffBy?: (val: string) => void;
  readOnly?: boolean;
  compact?: boolean;
  extraActions?: React.ReactNode;
}

export const CorporateTicketHeader: React.FC<CorporateTicketHeaderProps> = ({
  selectedTicketNumber,
  tickets,
  onSelectTicket,
  mode = 'qa',
  clientName,
  onChangeClientName,
  moduleName,
  onChangeModuleName,
  taskName,
  onChangeTaskName,
  qaAssignee,
  onChangeQaAssignee,
  developer,
  onChangeDeveloper,
  sha,
  onChangeSha,
  signOffBy,
  onChangeSignOffBy,
  readOnly = false,
  compact = false,
  extraActions,
}) => {
  const [copiedSha, setCopiedSha] = useState(false);
  const [editableTicketInput, setEditableTicketInput] = useState(selectedTicketNumber);
  const [isTypingTicket, setIsTypingTicket] = useState(false);
  const [isTranslatingTask, setIsTranslatingTask] = useState(false);
  // Allow user to toggle edit mode at any time, even if readOnly was set
  const [userEditMode, setUserEditMode] = useState(!readOnly);

  // Sync edit mode when readOnly prop changes
  useEffect(() => {
    setUserEditMode(!readOnly);
  }, [readOnly]);

  const isFieldsEditable = userEditMode;

  // Synchronize internal editable ticket string when selectedTicketNumber changes,
  // BUT only when the user is not actively typing in the input!
  useEffect(() => {
    if (!isTypingTicket) {
      setEditableTicketInput(selectedTicketNumber);
    }
  }, [selectedTicketNumber, isTypingTicket]);

  // Combine system tickets with prop tickets so all Azure and created tickets are present
  const allAvailableTickets = useMemo(() => {
    const map = new Map<string, TicketSummary>();
    tickets.forEach((t) => {
      if (t.ticketNumber) {
        map.set(t.ticketNumber.trim().replace(/^#+/, '').toLowerCase(), t);
      }
    });
    const storedTickets = getAllCreatedTicketsOnSystem();
    storedTickets.forEach((st) => {
      if (st.ticketNumber) {
        const cleanSt = st.ticketNumber.trim().replace(/^#+/, '').toLowerCase();
        if (!map.has(cleanSt)) {
          map.set(cleanSt, st);
        }
      }
    });
    return Array.from(map.values());
  }, [tickets]);

  // Matched ticket for fast auto-fill
  const matchedTicket = useMemo(() => {
    const cleanSel = selectedTicketNumber.trim().replace(/^#+/, '').toLowerCase();
    return allAvailableTickets.find(
      (t) =>
        t.ticketNumber.trim().replace(/^#+/, '').toLowerCase() === cleanSel
    );
  }, [allAvailableTickets, selectedTicketNumber]);

  // Effective values: Respect user's explicit values (including empty string "" when backspacing!)
  // Fall back to matched ticket fields ONLY if undefined
  const effectiveTaskName = taskName !== undefined ? taskName : (matchedTicket?.featureName || '');
  const effectiveQa = qaAssignee !== undefined ? qaAssignee : (matchedTicket?.qaAssignee || '');
  const effectiveDev = developer !== undefined ? developer : (matchedTicket?.developer || '');
  const effectiveSha = sha !== undefined ? sha : (matchedTicket?.shaCommit || '');
  const effectiveClient = clientName !== undefined ? clientName : (matchedTicket?.clientName || 'Treasury Master');
  const effectiveSignOff = signOffBy !== undefined ? signOffBy : (matchedTicket?.signOffBy || '');
  const effectiveModule = moduleName !== undefined ? moduleName : (matchedTicket?.moduleName || '');

  const handleCopySha = () => {
    if (!effectiveSha) return;
    navigator.clipboard?.writeText(effectiveSha);
    setCopiedSha(true);
    setTimeout(() => setCopiedSha(false), 2000);
  };

  const handleSelectDropdownTicket = (ticketNo: string) => {
    setIsTypingTicket(false);
    const clean = ticketNo.trim().replace(/^#+/, '');
    setEditableTicketInput(clean);
    onSelectTicket(clean);

    // Auto-fetch fields from matched ticket
    const cleanSel = clean.toLowerCase();
    const matched = allAvailableTickets.find(
      (t) => t.ticketNumber.trim().replace(/^#+/, '').toLowerCase() === cleanSel
    );
    if (matched) {
      if (onChangeTaskName) onChangeTaskName(matched.featureName || '');
      if (onChangeQaAssignee) onChangeQaAssignee(matched.qaAssignee || '');
      if (onChangeDeveloper) onChangeDeveloper(matched.developer || '');
      if (onChangeSha) onChangeSha(matched.shaCommit || '');
      if (onChangeClientName) onChangeClientName(matched.clientName || 'Treasury Master');
      if (onChangeModuleName) onChangeModuleName(matched.moduleName || '');
      if (onChangeSignOffBy) onChangeSignOffBy(matched.signOffBy || '');
    }
  };

  const handleTicketInputChange = (val: string) => {
    setEditableTicketInput(val);
    const clean = val.trim().replace(/^#+/, '');
    onSelectTicket(clean);

    if (clean) {
      const cleanSel = clean.toLowerCase();
      const matched = allAvailableTickets.find(
        (t) => t.ticketNumber.trim().replace(/^#+/, '').toLowerCase() === cleanSel
      );
      if (matched) {
        if (onChangeTaskName) onChangeTaskName(matched.featureName || '');
        if (onChangeQaAssignee) onChangeQaAssignee(matched.qaAssignee || '');
        if (onChangeDeveloper) onChangeDeveloper(matched.developer || '');
        if (onChangeSha) onChangeSha(matched.shaCommit || '');
        if (onChangeClientName) onChangeClientName(matched.clientName || 'Treasury Master');
        if (onChangeModuleName) onChangeModuleName(matched.moduleName || '');
        if (onChangeSignOffBy) onChangeSignOffBy(matched.signOffBy || '');
      }
    }
  };

  const handleTranslateTaskName = async () => {
    if (!effectiveTaskName.trim() || isTranslatingTask) return;
    setIsTranslatingTask(true);
    try {
      const translated = await translateToSimpleEnglish(effectiveTaskName, 'scenario');
      onChangeTaskName?.(translated);
    } catch {
      // fallback unchanged
    } finally {
      setIsTranslatingTask(false);
    }
  };

  return (
    <div
      id="corporate-ticket-header"
      className="bg-gradient-to-r from-sky-50 via-blue-50/50 to-indigo-50/40 border-2 border-sky-300/80 rounded-2xl shadow-sm overflow-hidden mb-5 transition-all"
    >
      {/* Top Banner Ribbon */}
      <div className="bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-700 px-4 py-2 flex flex-wrap items-center justify-between text-white gap-2">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-sky-200 shrink-0" />
          <span className="text-xs font-black uppercase tracking-wider text-sky-100">
            {mode === 'developer' ? 'Developer Testing Matrix' : 'Treasury Master corporate header'}
          </span>
          <span className="text-sky-300 text-xs hidden sm:inline">•</span>
          <span className="text-xs text-sky-100/90 font-medium hidden sm:inline">
            {mode === 'developer' ? 'Ticket ID • Client Name • SHA • Task Done By' : 'Standard QA & Dev Verification Artifact'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Header Editable Toggle */}
          <button
            type="button"
            onClick={() => setUserEditMode(!userEditMode)}
            className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
              userEditMode
                ? 'bg-amber-400 hover:bg-amber-300 text-amber-950 ring-2 ring-white/40'
                : 'bg-sky-500/80 hover:bg-sky-400 text-white'
            }`}
            title="Toggle edit mode for all corporate header fields"
          >
            {userEditMode ? (
              <>
                <Unlock className="w-3.5 h-3.5 text-amber-950" />
                <span>Editing Headers Enabled</span>
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5 text-sky-200" />
                <span>✏️ Click to Edit Headers</span>
              </>
            )}
          </button>

          {extraActions}
        </div>
      </div>

      {/* Main Corporate Metadata Rows */}
      {mode === 'developer' ? (
        /* DEVELOPER TESTING HEADER: ONLY TICKET ID, CLIENT NAME, SHA, TASK DONE BY */
        <div className="p-3 sm:p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {/* 1. Ticket ID */}
            <div className="flex items-center bg-white/95 border-2 border-blue-400 rounded-xl px-2.5 py-1.5 shadow-2xs group focus-within:ring-2 focus-within:ring-blue-500 transition-all">
              <span className="text-xs font-black text-blue-950 w-20 shrink-0 flex items-center gap-1">
                <Ticket className="w-3.5 h-3.5 text-blue-600" />
                Ticket ID:
              </span>

              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <div className="relative shrink-0">
                  <select
                    value={selectedTicketNumber.replace(/^#+/, '')}
                    onChange={(e) => handleSelectDropdownTicket(e.target.value)}
                    title="Select Ticket"
                    className="appearance-none bg-blue-100 hover:bg-blue-200/80 text-blue-900 text-xs font-black px-2 py-1 pr-5 rounded-lg cursor-pointer outline-none transition-colors max-w-[100px] truncate"
                  >
                    {allAvailableTickets.map((t) => (
                      <option key={t.id || t.ticketNumber} value={t.ticketNumber}>
                        #{t.ticketNumber}
                      </option>
                    ))}
                    {allAvailableTickets.every(
                      (t) => t.ticketNumber.trim().replace(/^#+/, '').toLowerCase() !== selectedTicketNumber.trim().replace(/^#+/, '').toLowerCase()
                    ) && (
                      <option value={selectedTicketNumber.replace(/^#+/, '')}>
                        #{selectedTicketNumber.replace(/^#+/, '')}
                      </option>
                    )}
                  </select>
                  <ChevronDown className="w-3 h-3 text-blue-800 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                <div className="flex items-center gap-1 flex-1 min-w-0 bg-blue-50/70 border border-blue-200 rounded-lg px-2 py-0.5">
                  <span className="text-xs font-bold text-blue-500">#</span>
                  <input
                    type="text"
                    value={editableTicketInput}
                    onFocus={() => setIsTypingTicket(true)}
                    onBlur={() => {
                      setIsTypingTicket(false);
                      const clean = editableTicketInput.trim().replace(/^#+/, '');
                      onSelectTicket(clean);
                    }}
                    onChange={(e) => handleTicketInputChange(e.target.value)}
                    placeholder="Ticket #"
                    title="Type or edit Ticket ID directly"
                    className="w-full text-xs font-black text-blue-900 bg-transparent outline-none font-mono"
                  />
                  <Edit3 className="w-3 h-3 text-blue-400 shrink-0" />
                </div>
              </div>
            </div>

            {/* 2. Client Name */}
            <div className="flex items-center bg-white/95 border border-sky-200 rounded-xl px-3 py-2 shadow-2xs focus-within:border-blue-400">
              <span className="text-xs font-bold text-slate-600 w-24 shrink-0 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-sky-600" />
                Client Name:
              </span>
              <input
                type="text"
                value={effectiveClient}
                onChange={(e) => onChangeClientName?.(e.target.value)}
                placeholder="Client Name (e.g. Treasury Master)"
                className="w-full text-xs font-bold text-slate-800 bg-transparent outline-none focus:text-blue-700"
              />
            </div>

            {/* 3. SHA Commit */}
            <div className="flex items-center bg-white/95 border border-sky-200 rounded-xl px-3 py-2 shadow-2xs focus-within:border-blue-400">
              <span className="text-xs font-bold text-slate-600 w-16 shrink-0 flex items-center gap-1.5">
                <GitCommit className="w-3.5 h-3.5 text-slate-500" />
                SHA:
              </span>
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <input
                  type="text"
                  value={effectiveSha}
                  onChange={(e) => onChangeSha?.(e.target.value)}
                  placeholder="SHA commit hash"
                  className="w-full text-xs font-mono font-bold text-slate-800 bg-transparent outline-none focus:text-blue-700"
                />
                <button
                  type="button"
                  onClick={handleCopySha}
                  title="Copy SHA to clipboard"
                  className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors cursor-pointer"
                >
                  {copiedSha ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* 4. Task Done By (Developer) */}
            <div className="flex items-center bg-white/95 border border-sky-200 rounded-xl px-3 py-2 shadow-2xs focus-within:border-blue-400">
              <span className="text-xs font-bold text-slate-600 w-28 shrink-0 flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5 text-purple-600" />
                Task Done By:
              </span>
              <input
                type="text"
                value={effectiveDev || effectiveQa}
                onChange={(e) => {
                  onChangeDeveloper?.(e.target.value);
                  onChangeQaAssignee?.(e.target.value);
                }}
                placeholder="Developer name"
                className="w-full text-xs font-bold text-slate-800 bg-transparent outline-none focus:text-blue-700"
              />
            </div>
          </div>
        </div>
      ) : (
        /* Main Corporate Metadata Rows (matching Picture 4) */
        <div className="p-3 sm:p-4 space-y-2.5">
        {/* Row 1 & 2: Client Name & Module + Ticket Selection / Editable combo */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {/* Client Name */}
          <div className="flex items-center bg-white/90 border border-sky-200 rounded-xl px-3 py-2 shadow-2xs focus-within:border-blue-400">
            <span className="text-xs font-bold text-slate-600 w-28 shrink-0 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-sky-600" />
              Client Name:
            </span>
            {!isFieldsEditable ? (
              <span className="text-xs font-bold text-slate-800 truncate">{effectiveClient}</span>
            ) : (
              <input
                type="text"
                value={effectiveClient}
                onChange={(e) => onChangeClientName?.(e.target.value)}
                placeholder="Client Name (e.g. Treasury Master)"
                className="w-full text-xs font-bold text-slate-800 bg-transparent outline-none focus:text-blue-700"
              />
            )}
          </div>

          {/* Module Name */}
          <div className="flex items-center bg-white/90 border border-sky-200 rounded-xl px-3 py-2 shadow-2xs focus-within:border-blue-400">
            <span className="text-xs font-bold text-slate-600 w-28 shrink-0 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-indigo-600" />
              Module Name:
            </span>
            {!isFieldsEditable ? (
              <span className="text-xs font-bold text-slate-800 truncate">{effectiveModule}</span>
            ) : (
              <input
                type="text"
                value={effectiveModule}
                onChange={(e) => onChangeModuleName?.(e.target.value)}
                placeholder="Module (e.g. Term Loan)"
                className="w-full text-xs font-bold text-slate-800 bg-transparent outline-none focus:text-blue-700"
              />
            )}
          </div>

          {/* Ticket ID: Dropdown from Azure Tickets + Directly Editable Field */}
          <div className="flex items-center bg-white/90 border-2 border-blue-400 rounded-xl px-2.5 py-1.5 shadow-2xs group focus-within:ring-2 focus-within:ring-blue-500 transition-all">
            <span className="text-xs font-black text-blue-950 w-24 shrink-0 flex items-center gap-1">
              <Ticket className="w-3.5 h-3.5 text-blue-600" />
              Ticket ID:
            </span>

            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              {/* Dropdown containing all Azure & System tickets */}
              <div className="relative shrink-0">
                <select
                  value={selectedTicketNumber.replace(/^#+/, '')}
                  onChange={(e) => handleSelectDropdownTicket(e.target.value)}
                  title="Select Ticket from Azure DevOps / System list"
                  className="appearance-none bg-blue-100 hover:bg-blue-200/80 text-blue-900 text-xs font-black px-2.5 py-1 pr-6 rounded-lg cursor-pointer outline-none transition-colors max-w-[130px] truncate"
                >
                  {allAvailableTickets.map((t) => (
                    <option key={t.id || t.ticketNumber} value={t.ticketNumber}>
                      #{t.ticketNumber} – {t.featureName?.slice(0, 24)}
                    </option>
                  ))}
                  {allAvailableTickets.every(
                    (t) => t.ticketNumber.trim().replace(/^#+/, '').toLowerCase() !== selectedTicketNumber.trim().replace(/^#+/, '').toLowerCase()
                  ) && (
                    <option value={selectedTicketNumber.replace(/^#+/, '')}>
                      #{selectedTicketNumber.replace(/^#+/, '')} (Custom)
                    </option>
                  )}
                </select>
                <ChevronDown className="w-3 h-3 text-blue-800 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Editable ticket number input */}
              <div className="flex items-center gap-1 flex-1 min-w-0 bg-blue-50/70 border border-blue-200 rounded-lg px-2 py-0.5">
                <span className="text-xs font-bold text-blue-500">#</span>
                <input
                  type="text"
                  value={editableTicketInput}
                  onFocus={() => setIsTypingTicket(true)}
                  onBlur={() => {
                    setIsTypingTicket(false);
                    const clean = editableTicketInput.trim().replace(/^#+/, '');
                    onSelectTicket(clean);
                  }}
                  onChange={(e) => handleTicketInputChange(e.target.value)}
                  placeholder="Ticket #"
                  title="Type or edit Ticket ID directly"
                  className="w-full text-xs font-black text-blue-900 bg-transparent outline-none font-mono"
                />
                <Edit3 className="w-3 h-3 text-blue-400 shrink-0" />
              </div>
            </div>
          </div>
        </div>

        {/* Row 3: Task Name (Single line feature or ticket one line, matching Picture 4 Row 4) */}
        <div className="flex items-center justify-between gap-2 bg-white/95 border-2 border-sky-300 rounded-xl px-3 py-2 shadow-2xs">
          <span className="text-xs font-black text-slate-700 w-28 shrink-0 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
            Task Name:
          </span>
          <div className="flex-1 min-w-0">
            {!isFieldsEditable ? (
              <span className="text-xs font-black text-blue-950 truncate tracking-wide block">
                {effectiveTaskName}
              </span>
            ) : (
              <input
                type="text"
                value={effectiveTaskName}
                onChange={(e) => onChangeTaskName?.(e.target.value)}
                placeholder="One-line task / feature name"
                title="One-line task / feature summary (editable)"
                className="w-full text-xs font-black text-blue-950 bg-transparent outline-none focus:text-blue-700 placeholder:text-slate-400 font-sans"
              />
            )}
          </div>

          {/* Quick Translate Task Name to Simple English */}
          {isFieldsEditable && (
            <button
              type="button"
              onClick={handleTranslateTaskName}
              disabled={isTranslatingTask || !effectiveTaskName.trim()}
              title="Translate Task Name into simple, clear English"
              className="px-2 py-0.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-[10px] font-bold rounded flex items-center gap-1 shrink-0 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Languages className="w-3 h-3 text-purple-600" />
              <span>{isTranslatingTask ? 'Translating...' : '🌐 Simple English'}</span>
            </button>
          )}
        </div>

        {/* Row 4: SHA Commit Hash (Picture 4 Row 3) */}
        <div className="flex items-center bg-white/90 border border-sky-200 rounded-xl px-3 py-2 shadow-2xs focus-within:border-blue-400">
          <span className="text-xs font-bold text-slate-600 w-28 shrink-0 flex items-center gap-1.5">
            <GitCommit className="w-3.5 h-3.5 text-slate-500" />
            SHA Commit:
          </span>

          <div className="flex items-center gap-2 flex-1 min-w-0">
            {!isFieldsEditable ? (
              <span className="text-xs font-mono font-bold text-slate-800 truncate">
                {effectiveSha}
              </span>
            ) : (
              <input
                type="text"
                value={effectiveSha}
                onChange={(e) => onChangeSha?.(e.target.value)}
                placeholder="SHA-1 commit hash"
                className="w-full text-xs font-mono font-bold text-slate-800 bg-transparent outline-none focus:text-blue-700"
              />
            )}

            <button
              type="button"
              onClick={handleCopySha}
              title="Copy SHA to clipboard"
              className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-100 rounded-lg shrink-0 transition-colors cursor-pointer"
            >
              {copiedSha ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Row 5: Task Done By (QA Assignee), Developer, and Sign Off By (Picture 4 Rows 5 & 6) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          {/* Task Done By - QA Assignee */}
          <div className="flex items-center bg-white/90 border border-sky-200 rounded-xl px-3 py-2 shadow-2xs focus-within:border-blue-400">
            <span className="text-xs font-bold text-slate-600 w-28 shrink-0 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-emerald-600" />
              Task done by:
            </span>
            {!isFieldsEditable ? (
              <span className="text-xs font-bold text-slate-800 truncate">{effectiveQa}</span>
            ) : (
              <input
                type="text"
                value={effectiveQa}
                onChange={(e) => onChangeQaAssignee?.(e.target.value)}
                placeholder="QA Assignee name"
                className="w-full text-xs font-bold text-slate-800 bg-transparent outline-none focus:text-blue-700"
              />
            )}
          </div>

          {/* Developer */}
          <div className="flex items-center bg-white/90 border border-sky-200 rounded-xl px-3 py-2 shadow-2xs focus-within:border-blue-400">
            <span className="text-xs font-bold text-slate-600 w-28 shrink-0 flex items-center gap-1.5">
              <Code2 className="w-3.5 h-3.5 text-purple-600" />
              Developer:
            </span>
            {!isFieldsEditable ? (
              <span className="text-xs font-bold text-slate-800 truncate">{effectiveDev}</span>
            ) : (
              <input
                type="text"
                value={effectiveDev}
                onChange={(e) => onChangeDeveloper?.(e.target.value)}
                placeholder="Developer name"
                className="w-full text-xs font-bold text-slate-800 bg-transparent outline-none focus:text-blue-700"
              />
            )}
          </div>

          {/* Sign off By */}
          <div className="flex items-center bg-white/90 border border-sky-200 rounded-xl px-3 py-2 shadow-2xs focus-within:border-blue-400">
            <span className="text-xs font-bold text-slate-600 w-28 shrink-0 flex items-center gap-1.5">
              <FileCheck2 className="w-3.5 h-3.5 text-indigo-600" />
              Sign off By:
            </span>
            {!isFieldsEditable ? (
              <span className="text-xs font-bold text-slate-800 truncate">{effectiveSignOff}</span>
            ) : (
              <input
                type="text"
                value={effectiveSignOff}
                onChange={(e) => onChangeSignOffBy?.(e.target.value)}
                placeholder="Senior QA / Sign off Lead"
                className="w-full text-xs font-bold text-slate-800 bg-transparent outline-none focus:text-blue-700"
              />
            )}
          </div>
        </div>
      </div>
    )}
  </div>
);
};
