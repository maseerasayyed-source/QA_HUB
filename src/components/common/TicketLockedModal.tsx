import React from 'react';
import { Lock, X, EyeOff } from 'lucide-react';

interface TicketLockedModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticketNumber: string;
  createdBy?: string;
  reason?: string;
}

export const TicketLockedModal: React.FC<TicketLockedModalProps> = ({
  isOpen,
  onClose,
  ticketNumber,
  createdBy = 'Creator',
  reason,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-3 bg-amber-100 text-amber-800 rounded-xl shrink-0">
            <Lock className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900">
                Ticket #{ticketNumber} is Locked
              </h3>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Created &amp; edited by: <strong className="text-slate-800">{createdBy}</strong>
            </p>
          </div>
        </div>

        <div className="p-3.5 bg-amber-50/90 border border-amber-200 rounded-xl text-xs text-amber-950 space-y-2">
          <p className="font-semibold leading-relaxed">
            {reason || `This ticket is currently in Draft / Edit mode by ${createdBy}.`}
          </p>
          <div className="flex items-start gap-2 pt-1 border-t border-amber-200/60">
            <EyeOff className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-800 leading-relaxed">
              Test cases, developer testing points, observations, and RFEs are confidential while in <strong>Draft / Edit mode</strong>. Only <strong>{createdBy}</strong> can view or edit them. Once they click <strong>&quot;Save &amp; Submit&quot;</strong>, this ticket will become visible to all team members in <strong>Read-Only mode</strong>.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer transition-colors"
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  );
};
