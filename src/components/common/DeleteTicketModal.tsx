import React, { useState } from 'react';
import {
  AlertTriangle,
  Trash2,
  X,
  Layers,
  ShieldAlert,
  CheckCircle2,
  RefreshCw,
  HelpCircle,
} from 'lucide-react';
import { TicketSummary } from '../../types';

interface DeleteTicketModalProps {
  isOpen: boolean;
  ticket: TicketSummary | null;
  onClose: () => void;
  onConfirmDelete: (ticketNumber: string, mode: 'tickets-only' | 'all-modules') => void;
}

export const DeleteTicketModal: React.FC<DeleteTicketModalProps> = ({
  isOpen,
  ticket,
  onClose,
  onConfirmDelete,
}) => {
  const [selectedMode, setSelectedMode] = useState<'tickets-only' | 'all-modules'>('tickets-only');

  if (!isOpen || !ticket) return null;

  const handleConfirm = () => {
    onConfirmDelete(ticket.ticketNumber, selectedMode);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1 bg-red-500/20 text-red-400 rounded-md border border-red-500/30">
              <Trash2 className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold">Delete Azure DevOps Ticket #{ticket.ticketNumber}</h2>
              <p className="text-[11px] text-slate-400 truncate max-w-xs">{ticket.featureName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 text-xs">
          <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-amber-900 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-[11px]">Choose how you want to delete this ticket:</p>
              <p className="text-[10px] text-amber-800 mt-0.5">
                Select whether to delete it only from the Tickets tab or purge it from every module across the system.
              </p>
            </div>
          </div>

          {/* Option Cards */}
          <div className="space-y-3">
            {/* Option 1: Delete only from Tickets Tab */}
            <div
              onClick={() => setSelectedMode('tickets-only')}
              className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer ${
                selectedMode === 'tickets-only'
                  ? 'border-blue-600 bg-blue-50/60 shadow-xs'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="delete-mode"
                    checked={selectedMode === 'tickets-only'}
                    onChange={() => setSelectedMode('tickets-only')}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <div className="flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-blue-600" />
                    <span className="font-bold text-slate-900 text-xs">
                      1. Delete from Tickets Tab Only
                    </span>
                  </div>
                </div>
                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 font-bold text-[10px] rounded-full uppercase tracking-wider">
                  Safe / Restoreable
                </span>
              </div>
              <p className="text-[11px] text-slate-600 mt-2 pl-6 leading-relaxed">
                Removes Ticket #{ticket.ticketNumber} from this Tickets (Azure) queue and Dashboard.
                <strong className="text-slate-800 font-semibold"> All Test Cases, Observations, and Developer Testing in other tabs remain safe</strong>.
              </p>
              <div className="mt-2 pl-6 pt-2 border-t border-blue-200/60 flex items-center gap-1.5 text-[10px] font-semibold text-blue-700">
                <RefreshCw className="w-3 h-3" />
                <span>If you open another module and click &apos;Save &amp; Submit&apos;, it will reappear in Tickets and Dashboard!</span>
              </div>
            </div>

            {/* Option 2: Delete from EVERY module */}
            <div
              onClick={() => setSelectedMode('all-modules')}
              className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer ${
                selectedMode === 'all-modules'
                  ? 'border-red-600 bg-red-50/60 shadow-xs'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="delete-mode"
                    checked={selectedMode === 'all-modules'}
                    onChange={() => setSelectedMode('all-modules')}
                    className="w-4 h-4 text-red-600 focus:ring-red-500 cursor-pointer"
                  />
                  <div className="flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-red-600" />
                    <span className="font-bold text-slate-900 text-xs">
                      2. Delete from EVERY Module (All Modules)
                    </span>
                  </div>
                </div>
                <span className="px-2 py-0.5 bg-red-100 text-red-800 font-bold text-[10px] rounded-full uppercase tracking-wider">
                  Permanent Purge
                </span>
              </div>
              <p className="text-[11px] text-slate-600 mt-2 pl-6 leading-relaxed">
                Permanently wipes out Ticket #{ticket.ticketNumber} and all its data from the entire system:
              </p>
              <ul className="mt-1.5 pl-9 space-y-0.5 text-[10px] text-red-800 font-medium list-disc">
                <li>Tickets queue &amp; Dashboard</li>
                <li>All Test Cases ({ticket.testCasesCount || 0} cases)</li>
                <li>All Observations &amp; RFEs ({ticket.observationsCount || 0} items)</li>
                <li>Developer Testing points &amp; evidence</li>
                <li>System-wide ticket history</li>
              </ul>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className={`px-4 py-2 font-bold text-xs rounded-lg text-white transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ${
                selectedMode === 'all-modules'
                  ? 'bg-red-600 hover:bg-red-700 ring-2 ring-red-600/30'
                  : 'bg-amber-600 hover:bg-amber-700 ring-2 ring-amber-600/30'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>
                {selectedMode === 'all-modules'
                  ? 'Purge from All Modules'
                  : 'Delete from Tickets Tab Only'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
