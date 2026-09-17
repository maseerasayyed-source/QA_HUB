import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Wand2,
  Paperclip,
  Image as ImageIcon,
  FileSpreadsheet,
  FileText,
  X,
  Plus,
  User,
  Code2,
  CheckCircle2,
  ShieldCheck,
  Layers,
  Upload,
  Edit3,
  Save,
  Check,
  GitCommit,
  Building,
  RefreshCw,
  Hash,
} from 'lucide-react';
import { TicketSummary, AttachedDocOrImage } from '../../types';
import { polishObservationText } from '../../utils/textPolisher';
import { parseUploadedFile } from '../../utils/fileParser';

export interface CommonHeaderEditableMeta {
  ticketNo?: string;
  taskName?: string;
  featureName?: string;
  developer?: string;
  qaAssignee?: string;
  clientName?: string;
  sha?: string;
  shaCommit?: string;
  signOffBy?: string;
  reviewStatus?: string;
  version?: string;
  dealId?: string;
  moduleName?: string;
  moduleId?: string;
}

interface CommonHeaderProps {
  mode?: 'developer' | 'qa' | 'observations';
  selectedTicketNumber: string;
  tickets: TicketSummary[];
  description: string;
  testingScenarios: string;
  developerName?: string;
  qaAssigneeName?: string;
  clientName?: string;
  shaCommit?: string;
  taskName?: string;
  signOffBy?: string;
  version?: string;
  dealId?: string;
  reviewDoneBy?: string;
  reviewDoneAt?: string;
  reviewStatus?: string;
  attachedDocs?: AttachedDocOrImage[];
  onUpdateAttachedDocs?: (docs: AttachedDocOrImage[]) => void;
  screenFields?: string[];
  onUpdateScreenFields?: (fields: string[]) => void;
  onSelectTicket: (ticketNumber: string) => void;
  onChangeDescription: (value: string) => void;
  onChangeTestingScenarios: (value: string) => void;
  onGenerateAi?: () => void;
  isGenerating?: boolean;
  generateButtonText?: string;
  showGenerateButton?: boolean;
  // Editable Header Fields Callbacks
  onUpdateHeaderMeta?: (updatedFields: CommonHeaderEditableMeta) => void;
  onSaveAndSyncToTickets?: () => void;
}

export const CommonHeader: React.FC<CommonHeaderProps> = ({
  mode = 'qa',
  selectedTicketNumber,
  tickets,
  description,
  testingScenarios,
  developerName,
  qaAssigneeName,
  clientName = 'Treasury Master',
  shaCommit = '',
  taskName = '',
  signOffBy = '',
  version = '1.0',
  dealId = '',
  reviewDoneBy,
  reviewDoneAt,
  reviewStatus = 'Draft',
  attachedDocs = [],
  onUpdateAttachedDocs,
  screenFields = [],
  onUpdateScreenFields,
  onSelectTicket,
  onChangeDescription,
  onChangeTestingScenarios,
  onGenerateAi,
  isGenerating = false,
  generateButtonText,
  showGenerateButton = true,
  onUpdateHeaderMeta,
  onSaveAndSyncToTickets,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newFieldInput, setNewFieldInput] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  // Edit Header Panel Toggle
  const [isEditingHeader, setIsEditingHeader] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  const currentTicket = tickets.find(
    (t) => t.ticketNumber.toLowerCase() === selectedTicketNumber.toLowerCase()
  );

  // Local Editable Header Form State
  const [editTicketNo, setEditTicketNo] = useState(selectedTicketNumber);
  const [editTaskName, setEditTaskName] = useState(taskName || currentTicket?.featureName || '');
  const [editDevName, setEditDevName] = useState(developerName || currentTicket?.developer || '');
  const [editQaName, setEditQaName] = useState(qaAssigneeName || currentTicket?.qaAssignee || 'Maseera Sayyed');
  const [editClientName, setEditClientName] = useState(clientName || currentTicket?.clientName || 'Treasury Master');
  const [editSha, setEditSha] = useState(shaCommit || currentTicket?.shaCommit || '');
  const [editSignOffBy, setEditSignOffBy] = useState(signOffBy || currentTicket?.signOffBy || '');
  const [editVersion, setEditVersion] = useState(version || '1.0');
  const [editDealId, setEditDealId] = useState(dealId || currentTicket?.dealId || `DEAL-${selectedTicketNumber}`);
  const [editReviewStatus, setEditReviewStatus] = useState(reviewStatus);
  const [editModuleName, setEditModuleName] = useState(currentTicket?.moduleName || 'Term Loan');

  // Keep in sync when props change
  useEffect(() => {
    setEditTicketNo(selectedTicketNumber);
    setEditTaskName(taskName || currentTicket?.featureName || '');
    setEditDevName(developerName || currentTicket?.developer || '');
    setEditQaName(qaAssigneeName || currentTicket?.qaAssignee || 'Maseera Sayyed');
    setEditClientName(clientName || currentTicket?.clientName || 'Treasury Master');
    setEditSha(shaCommit || currentTicket?.shaCommit || '');
    setEditSignOffBy(signOffBy || currentTicket?.signOffBy || '');
    setEditVersion(version || '1.0');
    setEditDealId(dealId || currentTicket?.dealId || `DEAL-${selectedTicketNumber}`);
    setEditReviewStatus(reviewStatus);
    setEditModuleName(currentTicket?.moduleName || 'Term Loan');
  }, [
    selectedTicketNumber,
    taskName,
    developerName,
    qaAssigneeName,
    clientName,
    shaCommit,
    signOffBy,
    version,
    dealId,
    reviewStatus,
    currentTicket,
  ]);

  const handleSaveHeaderFields = () => {
    onUpdateHeaderMeta?.({
      ticketNo: editTicketNo.trim(),
      taskName: editTaskName.trim(),
      featureName: editTaskName.trim(),
      developer: editDevName.trim(),
      qaAssignee: editQaName.trim(),
      clientName: editClientName.trim(),
      sha: editSha.trim(),
      shaCommit: editSha.trim(),
      signOffBy: editSignOffBy.trim(),
      reviewStatus: editReviewStatus,
      version: editVersion.trim(),
      dealId: editDealId.trim(),
      moduleName: editModuleName.trim(),
    });
    setIsEditingHeader(false);
    setSyncNotice('Header fields updated successfully!');
    setTimeout(() => setSyncNotice(null), 3500);
  };

  const handleSyncToTickets = () => {
    if (onSaveAndSyncToTickets) {
      onSaveAndSyncToTickets();
    } else if (onUpdateHeaderMeta) {
      handleSaveHeaderFields();
    }
    setSyncNotice(`✅ Ticket #${selectedTicketNumber} synced & saved to Tickets (Azure) and Dashboard!`);
    setTimeout(() => setSyncNotice(null), 4000);
  };

  const devName = developerName || currentTicket?.developer || editDevName || '';
  const qaName = qaAssigneeName || currentTicket?.qaAssignee || editQaName || 'Maseera Sayyed';

  const defaultBtnText =
    generateButtonText ||
    (mode === 'developer'
      ? '✨ AI Generate Developer Testing Points'
      : '✨ AI Auto-Generate Test Cases into Table');

  const handlePolishDescription = () => {
    if (!description.trim()) return;
    const polished = polishObservationText(description);
    onChangeDescription(polished);
  };

  const handlePolishScenarios = () => {
    if (!testingScenarios.trim()) return;
    const polished = polishObservationText(testingScenarios);
    onChangeTestingScenarios(polished);
  };

  // Handle File Upload (Image / Excel / Word / Text)
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newDocs: AttachedDocOrImage[] = [];
    const detectedFieldsToAdd = new Set<string>(screenFields);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const parsed = await parseUploadedFile(file);
      newDocs.push(parsed);

      if (parsed.detectedFields && parsed.detectedFields.length > 0) {
        parsed.detectedFields.forEach((f) => detectedFieldsToAdd.add(f));
      }
    }

    const updated = [...attachedDocs, ...newDocs];
    onUpdateAttachedDocs?.(updated);
    onUpdateScreenFields?.(Array.from(detectedFieldsToAdd));
  };

  const handleRemoveDoc = (id: string) => {
    const updated = attachedDocs.filter((d) => d.id !== id);
    onUpdateAttachedDocs?.(updated);
  };

  // Add Screen Field Chip
  const handleAddField = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    const clean = newFieldInput.trim();
    if (!clean) return;
    if (!screenFields.includes(clean)) {
      onUpdateScreenFields?.([...screenFields, clean]);
    }
    setNewFieldInput('');
  };

  const handleRemoveField = (fieldToRemove: string) => {
    onUpdateScreenFields?.(screenFields.filter((f) => f !== fieldToRemove));
  };

  // Quick Preset Add
  const handleAddPresetFields = (preset: 'deal' | 'penalty' | 'rate') => {
    let presets: string[] = [];
    if (preset === 'deal') {
      presets = ['Deal ID', 'Facility Type', 'Disbursement Amount', 'Value Date', 'Maturity Date'];
    } else if (preset === 'penalty') {
      presets = ['Overdue Amount', 'Penalty Rate %', 'Grace Period Days', 'Notice Date', 'Accrual Frequency'];
    } else {
      presets = ['Index Rate', 'Benchmark Rate', 'Spread %', 'Effective Rate', 'Reset Date'];
    }

    const currentSet = new Set(screenFields);
    presets.forEach((p) => currentSet.add(p));
    onUpdateScreenFields?.(Array.from(currentSet));
  };

  // Clipboard Paste listener for screenshots
  const handleContainerPaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          const parsed = await parseUploadedFile(file);
          const updated = [...attachedDocs, parsed];
          onUpdateAttachedDocs?.(updated);
        }
      }
    }
  };

  return (
    <div
      onPaste={handleContainerPaste}
      className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4"
    >
      {/* 1. Header Information Bar: Ticket ID, Developer Name, QA Name & Review Status */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Ticket Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ticket:</span>
            <select
              value={selectedTicketNumber}
              onChange={(e) => onSelectTicket(e.target.value)}
              className="px-2.5 py-1.5 bg-blue-50/80 border border-blue-200 rounded-lg text-xs font-extrabold text-blue-800 hover:bg-blue-100/70 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              {tickets.map((t) => (
                <option key={t.id} value={t.ticketNumber}>
                  #{t.ticketNumber} – {t.featureName}
                </option>
              ))}
              {!tickets.some((t) => t.ticketNumber === selectedTicketNumber) && (
                <option value={selectedTicketNumber}>
                  #{selectedTicketNumber} – {taskName || 'Selected Ticket'}
                </option>
              )}
            </select>
          </div>

          {/* Developer Name Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200/80 rounded-lg text-xs">
            <Code2 className="w-3.5 h-3.5 text-amber-600" />
            <span className="text-slate-500 font-medium">Developer:</span>
            <span className="font-bold text-amber-900">{devName || 'Unassigned'}</span>
          </div>

          {/* QA Name Badge */}
          {mode !== 'developer' && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-teal-50 border border-teal-200/80 rounded-lg text-xs">
              <User className="w-3.5 h-3.5 text-teal-600" />
              <span className="text-slate-500 font-medium">QA Assignee:</span>
              <span className="font-bold text-teal-900">{qaName}</span>
            </div>
          )}

          {/* Client Name Badge */}
          {clientName && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700">
              <Building className="w-3 h-3 text-slate-500" />
              <span className="text-slate-500 font-medium">Client:</span>
              <span className="font-bold">{clientName}</span>
            </div>
          )}

          {/* SHA Commit Badge */}
          {shaCommit && (
            <div className="hidden md:flex items-center gap-1.5 px-2 py-1 bg-indigo-50 border border-indigo-200 rounded-lg text-xs text-indigo-900 font-mono">
              <GitCommit className="w-3 h-3 text-indigo-600" />
              <span>{shaCommit.slice(0, 10)}</span>
            </div>
          )}

          {/* Review Done By Badge if Approved / Signed-off */}
          {(reviewStatus === 'Approved' || reviewDoneBy || signOffBy) && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-300 rounded-lg text-xs shadow-2xs">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-emerald-700 font-medium">Sign-off:</span>
              <span className="font-extrabold text-emerald-900">
                {signOffBy || reviewDoneBy || 'Maseera Sayyed'}
              </span>
              {reviewDoneAt && <span className="text-[10px] text-emerald-600 font-medium">({reviewDoneAt})</span>}
            </div>
          )}
        </div>

        {/* Right Header Controls: Edit Header Fields & Save & Sync */}
        <div className="flex items-center gap-2">
          {/* Edit Header Fields Button */}
          <button
            type="button"
            onClick={() => setIsEditingHeader(!isEditingHeader)}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              isEditingHeader
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
            }`}
            title="Edit all fields of this header (Ticket #, Developer, QA, Client, SHA, Status, etc.)"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{isEditingHeader ? 'Hide Header Editor' : 'Edit Header Fields'}</span>
          </button>

          {/* Save & Sync to Tickets & Dashboard */}
          <button
            type="button"
            onClick={handleSyncToTickets}
            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            title="Save and ensure this ticket is active in Tickets (Azure) queue and Dashboard"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Save &amp; Sync to Tickets</span>
            <span className="sm:hidden">Sync</span>
          </button>
        </div>
      </div>

      {/* Synchronized Notice Banner */}
      {syncNotice && (
        <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{syncNotice}</span>
        </div>
      )}

      {/* FULL EDITABLE HEADER FORM PANEL (When Toggled) */}
      {isEditingHeader && (
        <div className="p-4 bg-gradient-to-r from-blue-50/70 to-indigo-50/50 border border-blue-200 rounded-xl space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between pb-2 border-b border-blue-200/60">
            <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
              <Edit3 className="w-3.5 h-3.5 text-blue-700" />
              <span>Editable Header Fields (All Fields)</span>
            </div>
            <span className="text-[10px] text-blue-700">
              Changes persist across Test Cases, Observations, and Dashboard
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            {/* Ticket # */}
            <div>
              <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                Ticket # / Work Item ID
              </label>
              <div className="relative">
                <Hash className="w-3 h-3 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={editTicketNo}
                  onChange={(e) => setEditTicketNo(e.target.value)}
                  className="w-full pl-7 pr-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Feature / Task Name */}
            <div>
              <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                Feature / Task Name
              </label>
              <input
                type="text"
                value={editTaskName}
                onChange={(e) => setEditTaskName(e.target.value)}
                placeholder="Feature title..."
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Developer Name */}
            <div>
              <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                Developer Name
              </label>
              <input
                type="text"
                value={editDevName}
                onChange={(e) => setEditDevName(e.target.value)}
                placeholder="Developer Name"
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* QA Assignee */}
            <div>
              <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                QA Assignee Name
              </label>
              <input
                type="text"
                value={editQaName}
                onChange={(e) => setEditQaName(e.target.value)}
                placeholder="QA Assignee"
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Client Name */}
            <div>
              <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                Client Name
              </label>
              <input
                type="text"
                value={editClientName}
                onChange={(e) => setEditClientName(e.target.value)}
                placeholder="e.g. Treasury Master"
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* SHA Commit */}
            <div>
              <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                SHA / Commit Hash
              </label>
              <input
                type="text"
                value={editSha}
                onChange={(e) => setEditSha(e.target.value)}
                placeholder="e.g. 7b1c4e9"
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Sign-Off By / Review Done By */}
            <div>
              <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                Sign-Off / Senior QA
              </label>
              <input
                type="text"
                value={editSignOffBy}
                onChange={(e) => setEditSignOffBy(e.target.value)}
                placeholder="Senior QA Name"
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Review Status / Status */}
            <div>
              <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                Review Status
              </label>
              <select
                value={editReviewStatus}
                onChange={(e) => setEditReviewStatus(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value="Draft">Draft</option>
                <option value="Ready for QA">Ready for QA</option>
                <option value="In Review">In Review</option>
                <option value="Review Pending">Review Pending</option>
                <option value="Changes Required">Changes Required</option>
                <option value="Approved">Approved</option>
              </select>
            </div>

            {/* Module Name */}
            <div>
              <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                Module Name
              </label>
              <input
                type="text"
                value={editModuleName}
                onChange={(e) => setEditModuleName(e.target.value)}
                placeholder="Module Name"
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Version */}
            <div>
              <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                Version
              </label>
              <input
                type="text"
                value={editVersion}
                onChange={(e) => setEditVersion(e.target.value)}
                placeholder="1.0"
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Deal ID (Special for Developer Testing) */}
            {mode === 'developer' && (
              <div>
                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                  Deal ID
                </label>
                <input
                  type="text"
                  value={editDealId}
                  onChange={(e) => setEditDealId(e.target.value)}
                  placeholder="DEAL-1234"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            )}
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsEditingHeader(false)}
              className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveHeaderFields}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Header Fields</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. Main Inputs Grid: Description & Testing Scenarios */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Description Field */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Description
            </label>
            <button
              type="button"
              onClick={handlePolishDescription}
              title="Convert content into clean, professional English"
              className="px-2 py-0.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-[10px] font-bold rounded flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Wand2 className="w-3 h-3 text-purple-600" />
              <span>AI Polish</span>
            </button>
          </div>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => onChangeDescription(e.target.value)}
            placeholder="Enter ticket description or requirements..."
            className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-y transition-all"
          />
        </div>

        {/* Testing Scenarios / Points */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Testing Scenarios / Points (Separate multiple with ;)
            </label>
            <button
              type="button"
              onClick={handlePolishScenarios}
              title="Clean format and separate points with semicolons"
              className="px-2 py-0.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-[10px] font-bold rounded flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Wand2 className="w-3 h-3 text-purple-600" />
              <span>AI Polish</span>
            </button>
          </div>
          <textarea
            rows={2}
            value={testingScenarios}
            onChange={(e) => onChangeTestingScenarios(e.target.value)}
            placeholder="E.g. Positive overdue calculation; Pre-disbursement guard check; Report export (Multiple scenarios will be generated into table)"
            className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-y transition-all"
          />
        </div>
      </div>

      {/* 3. Attachment Field (SS, Excel, Word Doc) & Screen Fields Specification */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
        {/* Attached Files & Screenshots */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
              <Paperclip className="w-3.5 h-3.5 text-blue-600" />
              <span>Attach UI Screenshot / Excel / Word File</span>
            </label>
            <span className="text-[10px] text-slate-400 font-medium">Or paste screenshot (Ctrl+V)</span>
          </div>

          {/* Drag & Drop / Upload Area */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              handleFileUpload(e.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`border border-dashed rounded-lg p-2.5 flex flex-wrap items-center justify-between gap-2 cursor-pointer transition-colors ${
              isDragging
                ? 'border-blue-500 bg-blue-50/50'
                : 'border-slate-300 bg-slate-50/70 hover:bg-slate-50 hover:border-blue-400'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              multiple
              accept="image/*,.xlsx,.xls,.csv,.docx,.doc,.txt,.pdf"
              className="hidden"
              onChange={(e) => handleFileUpload(e.target.files)}
            />
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <Upload className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="font-medium">
                Click or drop UI screenshot, Excel or spec document
              </span>
            </div>
            <span className="text-[10px] font-semibold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded">
              Browse Files
            </span>
          </div>

          {/* Attached Files List Chips */}
          {attachedDocs.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {attachedDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-1.5 px-2 py-1 bg-white border border-slate-200 rounded-md text-xs shadow-2xs"
                >
                  {doc.type === 'image' && <ImageIcon className="w-3.5 h-3.5 text-purple-600" />}
                  {doc.type === 'excel' && <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />}
                  {(doc.type === 'word' || doc.type === 'text') && (
                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                  )}
                  <span className="font-medium text-slate-800 max-w-[140px] truncate">{doc.name}</span>
                  {doc.size && <span className="text-[10px] text-slate-400">({doc.size})</span>}
                  {doc.detectedFields && doc.detectedFields.length > 0 && (
                    <span className="text-[9px] bg-slate-100 text-slate-600 px-1 py-0.2 rounded font-semibold">
                      {doc.detectedFields.length} fields
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveDoc(doc.id);
                    }}
                    className="text-slate-400 hover:text-rose-600 cursor-pointer ml-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Screen / Form Fields List */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Screen / Form Fields Available for Testing
            </label>
            <div className="flex items-center gap-1 text-[10px]">
              <span className="text-slate-400">Presets:</span>
              <button
                type="button"
                onClick={() => handleAddPresetFields('deal')}
                className="text-blue-600 hover:underline cursor-pointer font-medium"
              >
                +Deal
              </button>
              <span className="text-slate-300">•</span>
              <button
                type="button"
                onClick={() => handleAddPresetFields('rate')}
                className="text-blue-600 hover:underline cursor-pointer font-medium"
              >
                +Rate
              </button>
              <span className="text-slate-300">•</span>
              <button
                type="button"
                onClick={() => handleAddPresetFields('penalty')}
                className="text-blue-600 hover:underline cursor-pointer font-medium"
              >
                +Penalty
              </button>
            </div>
          </div>

          <div className="p-2 bg-slate-50 border border-slate-300 rounded-lg min-h-[42px] flex flex-wrap items-center gap-1.5">
            {screenFields.map((field) => (
              <span
                key={field}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-200/80 rounded-md text-[11px] font-semibold"
              >
                {field}
                <button
                  type="button"
                  onClick={() => handleRemoveField(field)}
                  className="hover:text-rose-600 cursor-pointer ml-0.5"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}

            {/* Inline Input for New Field */}
            <div className="inline-flex items-center gap-1">
              <input
                type="text"
                value={newFieldInput}
                onChange={(e) => setNewFieldInput(e.target.value)}
                onKeyDown={handleAddField}
                placeholder={screenFields.length === 0 ? "Type field (e.g. Deal ID) and press Enter..." : "+ Add field..."}
                className="text-xs bg-transparent border-none focus:outline-none text-slate-800 placeholder:text-slate-400 min-w-[140px]"
              />
              {newFieldInput.trim() && (
                <button
                  type="button"
                  onClick={handleAddField}
                  className="p-0.5 bg-blue-600 text-white rounded cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
          <p className="text-[10px] text-slate-500">
            * AI uses these fields to generate field-level validations, boundary checks &amp; mandatory field tests even if only screenshot/file is provided.
          </p>
        </div>
      </div>

      {/* 4. Action Row: AI Auto-Generate Button & Duplicate Prevention Badge */}
      {showGenerateButton && onGenerateAi && (
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              Duplicate Prevention Active
            </span>
            <span className="hidden sm:inline text-slate-400">•</span>
            <span className="hidden sm:inline text-[11px]">
              AI will skip scenarios already covered in your table
            </span>
          </div>

          <button
            type="button"
            onClick={onGenerateAi}
            disabled={isGenerating}
            className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg flex items-center gap-2 cursor-pointer shadow-sm hover:shadow transition-all"
          >
            <Sparkles className="w-4 h-4 text-blue-200" />
            <span>{isGenerating ? 'Generating Unique Scenarios...' : defaultBtnText}</span>
          </button>
        </div>
      )}
    </div>
  );
};
