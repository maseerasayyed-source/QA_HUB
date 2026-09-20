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
} from 'lucide-react';
import { TicketSummary } from '../../types';
import { getAllCreatedTicketsOnSystem } from '../../data/dbStore';

export interface CorporateTicketHeaderProps {
  selectedTicketNumber: string;
  tickets: TicketSummary[];
  onSelectTicket: (ticketNumber: string) => void;
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
  clientName = 'Treasury Master',
  onChangeClientName,
  moduleName,
  onChangeModuleName,
  taskName = '',
  onChangeTaskName,
  qaAssignee = 'Maseera Sayyed',
  onChangeQaAssignee,
  developer = '',
  onChangeDeveloper,
  sha = 'SHA-1: 4710b619ea012cba75ee657d64ebd49e656948df*',
  onChangeSha,
  signOffBy = 'Ashwini poke',
  onChangeSignOffBy,
  readOnly = false,
  compact = false,
  extraActions,
}) => {
  const [copiedSha, setCopiedSha] = useState(false);
  const [editableTicketInput, setEditableTicketInput] = useState(selectedTicketNumber);

  // Synchronize internal editable ticket string when selectedTicketNumber changes
  useEffect(() => {
    setEditableTicketInput(selectedTicketNumber);
  }, [selectedTicketNumber]);

  // Combine system tickets with prop tickets so all Azure and created tickets are present
  const allAvailableTickets = useMemo(() => {
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

  // Matched ticket for fast auto-fill
  const matchedTicket = useMemo(() => {
    return allAvailableTickets.find(
      (t) =>
        t.ticketNumber.trim().toLowerCase() ===
        selectedTicketNumber.trim().toLowerCase().replace('#', '')
    );
  }, [allAvailableTickets, selectedTicketNumber]);

  const effectiveTaskName = taskName || matchedTicket?.featureName || 'penalty overdue report';
  const effectiveQa = qaAssignee || matchedTicket?.qaAssignee || 'Maseera Sayyed';
  const effectiveDev = developer || matchedTicket?.developer || 'Rahul Sharma';
  const effectiveSha =
    sha || matchedTicket?.shaCommit || 'SHA-1: 4710b619ea012cba75ee657d64ebd49e656948df*';
  const effectiveClient = clientName || matchedTicket?.clientName || 'Treasury Master';
  const effectiveSignOff = signOffBy || matchedTicket?.signOffBy || 'Ashwini poke';
  const effectiveModule = moduleName || matchedTicket?.moduleName || 'Term Loan';

  const handleCopySha = () => {
    navigator.clipboard?.writeText(effectiveSha);
    setCopiedSha(true);
    setTimeout(() => setCopiedSha(false), 2000);
  };

  const handleTicketInputChange = (val: string) => {
    setEditableTicketInput(val);
    const clean = val.trim().replace('#', '');
    if (clean) {
      onSelectTicket(clean);
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
            Treasury Master corporate header
          </span>
          <span className="text-sky-300 text-xs hidden sm:inline">•</span>
          <span className="text-xs text-sky-100/90 font-medium hidden sm:inline">
            Standard QA &amp; Dev Verification Artifact
          </span>
        </div>

        {extraActions && (
          <div className="flex items-center gap-2">
            {extraActions}
          </div>
        )}
      </div>

      {/* Main Corporate Metadata Rows (matching Picture 4) */}
      <div className="p-3 sm:p-4 space-y-2.5">
        {/* Row 1 & 2: Client Name & Module + Ticket Selection / Editable combo */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {/* Client Name */}
          <div className="flex items-center bg-white/90 border border-sky-200 rounded-xl px-3 py-2 shadow-2xs">
            <span className="text-xs font-bold text-slate-600 w-28 shrink-0 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-sky-600" />
              Client Name:
            </span>
            {readOnly ? (
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
          <div className="flex items-center bg-white/90 border border-sky-200 rounded-xl px-3 py-2 shadow-2xs">
            <span className="text-xs font-bold text-slate-600 w-28 shrink-0 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-indigo-600" />
              Module Name:
            </span>
            {readOnly ? (
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
                  value={selectedTicketNumber.replace('#', '')}
                  onChange={(e) => {
                    onSelectTicket(e.target.value);
                  }}
                  title="Select Ticket from Azure DevOps / System list"
                  className="appearance-none bg-blue-100 hover:bg-blue-200/80 text-blue-900 text-xs font-black px-2.5 py-1 pr-6 rounded-lg cursor-pointer outline-none transition-colors max-w-[130px] truncate"
                >
                  {allAvailableTickets.map((t) => (
                    <option key={t.id || t.ticketNumber} value={t.ticketNumber}>
                      #{t.ticketNumber} – {t.featureName?.slice(0, 24)}
                    </option>
                  ))}
                  {allAvailableTickets.every(
                    (t) => t.ticketNumber !== selectedTicketNumber.replace('#', '')
                  ) && (
                    <option value={selectedTicketNumber.replace('#', '')}>
                      #{selectedTicketNumber.replace('#', '')} (Custom)
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
                  value={editableTicketInput.replace('#', '')}
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
        <div className="flex items-center bg-white/95 border-2 border-sky-300 rounded-xl px-3 py-2 shadow-2xs">
          <span className="text-xs font-black text-slate-700 w-28 shrink-0 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
            Task Name:
          </span>
          {readOnly ? (
            <span className="text-xs font-black text-blue-950 truncate tracking-wide">
              {effectiveTaskName}
            </span>
          ) : (
            <input
              type="text"
              value={effectiveTaskName}
              onChange={(e) => onChangeTaskName?.(e.target.value)}
              placeholder="e.g. penalty overdue report (feature or ticket one line)"
              title="One-line task / feature summary (editable)"
              className="w-full text-xs font-black text-blue-950 bg-transparent outline-none focus:text-blue-700 placeholder:text-slate-400 font-sans"
            />
          )}
        </div>

        {/* Row 4: SHA Commit Hash (Picture 4 Row 3) */}
        <div className="flex items-center bg-white/90 border border-sky-200 rounded-xl px-3 py-2 shadow-2xs">
          <span className="text-xs font-bold text-slate-600 w-28 shrink-0 flex items-center gap-1.5">
            <GitCommit className="w-3.5 h-3.5 text-slate-500" />
            SHA Commit:
          </span>

          <div className="flex items-center gap-2 flex-1 min-w-0">
            {readOnly ? (
              <span className="text-xs font-mono font-bold text-slate-800 truncate">
                {effectiveSha}
              </span>
            ) : (
              <input
                type="text"
                value={effectiveSha}
                onChange={(e) => onChangeSha?.(e.target.value)}
                placeholder="SHA-1: 4710b619ea012cba75ee657d64ebd49e656948df*"
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
          <div className="flex items-center bg-white/90 border border-sky-200 rounded-xl px-3 py-2 shadow-2xs">
            <span className="text-xs font-bold text-slate-600 w-28 shrink-0 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-emerald-600" />
              Task done by:
            </span>
            {readOnly ? (
              <span className="text-xs font-bold text-slate-800 truncate">{effectiveQa}</span>
            ) : (
              <input
                type="text"
                value={effectiveQa}
                onChange={(e) => onChangeQaAssignee?.(e.target.value)}
                placeholder="QA Assignee (e.g. Maseera Sayyed)"
                className="w-full text-xs font-bold text-slate-800 bg-transparent outline-none focus:text-blue-700"
              />
            )}
          </div>

          {/* Developer */}
          <div className="flex items-center bg-white/90 border border-sky-200 rounded-xl px-3 py-2 shadow-2xs">
            <span className="text-xs font-bold text-slate-600 w-28 shrink-0 flex items-center gap-1.5">
              <Code2 className="w-3.5 h-3.5 text-purple-600" />
              Developer:
            </span>
            {readOnly ? (
              <span className="text-xs font-bold text-slate-800 truncate">{effectiveDev}</span>
            ) : (
              <input
                type="text"
                value={effectiveDev}
                onChange={(e) => onChangeDeveloper?.(e.target.value)}
                placeholder="Developer Name"
                className="w-full text-xs font-bold text-slate-800 bg-transparent outline-none focus:text-blue-700"
              />
            )}
          </div>

          {/* Sign off By */}
          <div className="flex items-center bg-white/90 border border-sky-200 rounded-xl px-3 py-2 shadow-2xs">
            <span className="text-xs font-bold text-slate-600 w-28 shrink-0 flex items-center gap-1.5">
              <FileCheck2 className="w-3.5 h-3.5 text-indigo-600" />
              Sign off By:
            </span>
            {readOnly ? (
              <span className="text-xs font-bold text-slate-800 truncate">{effectiveSignOff}</span>
            ) : (
              <input
                type="text"
                value={effectiveSignOff}
                onChange={(e) => onChangeSignOffBy?.(e.target.value)}
                placeholder="Senior QA / Sign off Lead (e.g. Ashwini poke)"
                className="w-full text-xs font-bold text-slate-800 bg-transparent outline-none focus:text-blue-700"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
