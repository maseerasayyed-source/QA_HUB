import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  Edit3,
  Building,
  User,
  ShieldCheck,
  Tag,
  Hash,
  Layers,
  FileText,
  AlertCircle,
  GitCommit,
} from 'lucide-react';
import { TicketSummary } from '../../types';

interface EditTicketModalProps {
  isOpen: boolean;
  ticket: TicketSummary | null;
  modules: { id: string; name: string }[];
  onClose: () => void;
  onSaveTicket: (updatedTicket: TicketSummary, oldTicketNumber?: string) => void;
}

export const EditTicketModal: React.FC<EditTicketModalProps> = ({
  isOpen,
  ticket,
  modules,
  onClose,
  onSaveTicket,
}) => {
  const [ticketNumber, setTicketNumber] = useState('');
  const [featureName, setFeatureName] = useState('');
  const [moduleId, setModuleId] = useState('');
  const [priority, setPriority] = useState<TicketSummary['priority']>('High');
  const [status, setStatus] = useState<TicketSummary['status']>('Ready for QA');
  const [developer, setDeveloper] = useState('');
  const [qaAssignee, setQaAssignee] = useState('');
  const [signOffBy, setSignOffBy] = useState('');
  const [clientName, setClientName] = useState('');
  const [shaCommit, setShaCommit] = useState('');
  const [description, setDescription] = useState('');
  const [testingScenarios, setTestingScenarios] = useState('');

  useEffect(() => {
    if (ticket) {
      setTicketNumber(ticket.ticketNumber || '');
      setFeatureName(ticket.featureName || '');
      setModuleId(ticket.moduleId || modules[0]?.id || 'term loan');
      setPriority(ticket.priority || 'High');
      setStatus(ticket.status || 'Ready for QA');
      setDeveloper(ticket.developer || '');
      setQaAssignee(ticket.qaAssignee || '');
      setSignOffBy(ticket.signOffBy || '');
      setClientName(ticket.clientName || 'Treasury Master');
      setShaCommit(ticket.shaCommit || '');
      setDescription(ticket.description || '');
      setTestingScenarios(ticket.testingScenarios || ticket.scenarioDetails || '');
    }
  }, [ticket, modules]);

  if (!isOpen || !ticket) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketNumber.trim() || !featureName.trim()) {
      alert('Please provide both Ticket Number and Feature Name.');
      return;
    }

    const matchedMod = modules.find((m) => m.id === moduleId);
    const updated: TicketSummary = {
      ...ticket,
      ticketNumber: ticketNumber.trim(),
      featureName: featureName.trim(),
      moduleId,
      moduleName: matchedMod ? matchedMod.name : ticket.moduleName,
      priority,
      status,
      developer: developer.trim(),
      qaAssignee: qaAssignee.trim(),
      signOffBy: signOffBy.trim(),
      clientName: clientName.trim(),
      shaCommit: shaCommit.trim(),
      description: description.trim(),
      testingScenarios: testingScenarios.trim(),
      scenarioDetails: testingScenarios.trim(),
    };

    onSaveTicket(updated, ticket.ticketNumber);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="p-1 bg-blue-500/20 text-blue-400 rounded-md border border-blue-500/30">
              <Edit3 className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold">Edit Ticket &amp; Header Fields</h2>
              <p className="text-[11px] text-slate-400">Modify any field of Ticket #{ticket.ticketNumber}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Row 1: Ticket Number & Feature Name */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Ticket # / Work Item ID <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Hash className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  required
                  value={ticketNumber}
                  onChange={(e) => setTicketNumber(e.target.value)}
                  placeholder="e.g. 21653"
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Feature / Task Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={featureName}
                onChange={(e) => setFeatureName(e.target.value)}
                placeholder="e.g. Loan Disbursement Schedule Calculation"
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Row 2: Module, Priority, Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Module</label>
              <select
                value={moduleId}
                onChange={(e) => setModuleId(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                {modules.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="New">New</option>
                <option value="Ready for QA">Ready for QA</option>
                <option value="In Testing">In Testing</option>
                <option value="Observation Raised">Observation Raised</option>
                <option value="Retesting">Retesting</option>
                <option value="Regression">Regression</option>
                <option value="Passed">Passed</option>
                <option value="Failed">Failed</option>
                <option value="Blocked">Blocked</option>
                <option value="Pre-UAT">Pre-UAT</option>
                <option value="Closed">Closed</option>
              </select>
            </div>
          </div>

          {/* Row 3: Developer, QA Assignee, Sign Off By */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Developer</label>
              <input
                type="text"
                value={developer}
                onChange={(e) => setDeveloper(e.target.value)}
                placeholder="Developer Name"
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">QA Assignee</label>
              <input
                type="text"
                value={qaAssignee}
                onChange={(e) => setQaAssignee(e.target.value)}
                placeholder="QA Assignee Name"
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Sign-Off By</label>
              <input
                type="text"
                value={signOffBy}
                onChange={(e) => setSignOffBy(e.target.value)}
                placeholder="Senior QA / Approver"
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Row 4: Client Name & SHA Commit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Client Name</label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="e.g. Treasury Master"
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">SHA / Commit Hash</label>
              <div className="relative">
                <GitCommit className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={shaCommit}
                  onChange={(e) => setShaCommit(e.target.value)}
                  placeholder="e.g. c3f4a9b"
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed description of this ticket or feature..."
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
            />
          </div>

          {/* Testing Scenarios */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">Testing Scenarios / Key Points</label>
            <textarea
              rows={2}
              value={testingScenarios}
              onChange={(e) => setTestingScenarios(e.target.value)}
              placeholder="Key scenarios or acceptance points..."
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
