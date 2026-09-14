import React, { useState, useRef } from 'react';
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
} from 'lucide-react';
import { TicketSummary, AttachedDocOrImage } from '../../types';
import { polishObservationText } from '../../utils/textPolisher';
import { parseUploadedFile } from '../../utils/fileParser';

interface CommonHeaderProps {
  mode?: 'developer' | 'qa' | 'observations';
  selectedTicketNumber: string;
  tickets: TicketSummary[];
  description: string;
  testingScenarios: string;
  developerName?: string;
  qaAssigneeName?: string;
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
}

export const CommonHeader: React.FC<CommonHeaderProps> = ({
  mode = 'qa',
  selectedTicketNumber,
  tickets,
  description,
  testingScenarios,
  developerName,
  qaAssigneeName,
  reviewDoneBy,
  reviewDoneAt,
  reviewStatus,
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
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newFieldInput, setNewFieldInput] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const currentTicket = tickets.find(
    (t) => t.ticketNumber.toLowerCase() === selectedTicketNumber.toLowerCase()
  );

  const devName = developerName || currentTicket?.developer || 'Kunal Joshi';
  const qaName = qaAssigneeName || currentTicket?.qaAssignee || 'Maseera Sayyed';

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
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
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
            </select>
          </div>

          {/* Developer Name Badge (Always in developer testing, also in QA) */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200/80 rounded-lg text-xs">
            <Code2 className="w-3.5 h-3.5 text-amber-600" />
            <span className="text-slate-500 font-medium">Developer:</span>
            <span className="font-bold text-amber-900">{devName}</span>
          </div>

          {/* QA Name Badge (In QA & Observation modes) */}
          {mode !== 'developer' && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-teal-50 border border-teal-200/80 rounded-lg text-xs">
              <User className="w-3.5 h-3.5 text-teal-600" />
              <span className="text-slate-500 font-medium">QA Assignee:</span>
              <span className="font-bold text-teal-900">{qaName}</span>
            </div>
          )}

          {/* Review Done By Badge if Approved / Signed-off */}
          {(reviewStatus === 'Approved' || reviewDoneBy) && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-300 rounded-lg text-xs shadow-2xs animate-in fade-in duration-300">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-emerald-700 font-medium">Review Done By:</span>
              <span className="font-extrabold text-emerald-900">{reviewDoneBy || 'Maseera Sayyed'}</span>
              {reviewDoneAt && <span className="text-[10px] text-emerald-600 font-medium">({reviewDoneAt})</span>}
            </div>
          )}
        </div>

        {/* Module Indicator */}
        {currentTicket && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <span>Module:</span>
            <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
              {currentTicket.moduleName}
            </span>
          </div>
        )}
      </div>

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
            * AI uses these fields to generate field-level validations, boundary checks & mandatory field tests even if only screenshot/file is provided.
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
