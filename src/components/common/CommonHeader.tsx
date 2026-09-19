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
  Languages,
  Eye,
  ClipboardPaste,
  Maximize2,
  ExternalLink,
  Download,
} from 'lucide-react';
import { TicketSummary, AttachedDocOrImage } from '../../types';
import { polishObservationText } from '../../utils/textPolisher';
import { parseUploadedFile } from '../../utils/fileParser';
import { translateToSimpleEnglish } from '../../utils/languageAi';

interface CommonHeaderProps {
  mode?: 'developer' | 'qa' | 'observations';
  selectedTicketNumber: string;
  tickets: TicketSummary[];
  description: string;
  testingScenarios: string;
  developerName?: string;
  onChangeDeveloperName?: (value: string) => void;
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
  readOnly?: boolean;
}

export const CommonHeader: React.FC<CommonHeaderProps> = ({
  mode = 'qa',
  selectedTicketNumber,
  tickets,
  description,
  testingScenarios,
  developerName,
  onChangeDeveloperName,
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
  readOnly = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newFieldInput, setNewFieldInput] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<AttachedDocOrImage | null>(null);
  const [isPreviewFieldsOpen, setIsPreviewFieldsOpen] = useState(false);
  const [pasteNotice, setPasteNotice] = useState<string | null>(null);

  // Global window paste listener: automatically catches any screenshot or file pasted anywhere
  useEffect(() => {
    const handleGlobalPaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            const parsed = await parseUploadedFile(file);
            const updated = [...attachedDocs, parsed];
            onUpdateAttachedDocs?.(updated);
            if (parsed.detectedFields && parsed.detectedFields.length > 0) {
              const currentSet = new Set(screenFields);
              parsed.detectedFields.forEach((f) => currentSet.add(f));
              onUpdateScreenFields?.(Array.from(currentSet));
            }
            setPasteNotice(`✅ Pasted screenshot "${parsed.name}" attached successfully! Click 👁️ Preview to view.`);
            setTimeout(() => setPasteNotice(null), 4000);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, [attachedDocs, screenFields, onUpdateAttachedDocs, onUpdateScreenFields]);

  // Dedicated button to paste screenshot directly from system clipboard
  const handleClipboardPasteClick = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.read) {
        const clipboardItems = await navigator.clipboard.read();
        let attached = false;
        for (const item of clipboardItems) {
          for (const type of item.types) {
            if (type.startsWith('image/')) {
              const blob = await item.getType(type);
              const file = new File([blob], `pasted_screenshot_${Date.now()}.png`, { type });
              const parsed = await parseUploadedFile(file);
              const updated = [...attachedDocs, parsed];
              onUpdateAttachedDocs?.(updated);
              if (parsed.detectedFields && parsed.detectedFields.length > 0) {
                const currentSet = new Set(screenFields);
                parsed.detectedFields.forEach((f) => currentSet.add(f));
                onUpdateScreenFields?.(Array.from(currentSet));
              }
              attached = true;
              setPasteNotice(`✅ Screenshot pasted from clipboard! Click 👁️ Preview to view.`);
              setTimeout(() => setPasteNotice(null), 4000);
              break;
            }
          }
          if (attached) break;
        }
        if (!attached) {
          setPasteNotice('ℹ️ No image found in clipboard. Take a screenshot (PrtScn or Win+Shift+S) and press Ctrl+V to paste.');
          setTimeout(() => setPasteNotice(null), 4500);
        }
      } else {
        setPasteNotice('ℹ️ Press Ctrl+V on your keyboard to paste screenshot directly.');
        setTimeout(() => setPasteNotice(null), 4000);
      }
    } catch (err) {
      setPasteNotice('ℹ️ Press Ctrl+V on your keyboard to paste screenshot directly.');
      setTimeout(() => setPasteNotice(null), 4000);
    }
  };

  // Paste handler for the Screen Fields input box (splits comma, newline, or tab separated values)
  const handleFieldPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text');
    if (text && (text.includes(',') || text.includes('\n') || text.includes('\t') || text.includes(';'))) {
      e.preventDefault();
      const parts = text.split(/[,;\n\t]+/).map((s) => s.trim()).filter(Boolean);
      if (parts.length > 0) {
        const set = new Set(screenFields);
        parts.forEach((p) => set.add(p));
        onUpdateScreenFields?.(Array.from(set));
        setPasteNotice(`✅ Pasted ${parts.length} fields successfully into screen fields!`);
        setTimeout(() => setPasteNotice(null), 3500);
      }
    }
  };

  const currentTicket = tickets.find(
    (t) => t.ticketNumber.toLowerCase() === selectedTicketNumber.toLowerCase()
  );

  const devName = developerName || currentTicket?.developer || '';
  const qaName = qaAssigneeName || currentTicket?.qaAssignee || 'Maseera Sayyed';

  const [isTranslatingDesc, setIsTranslatingDesc] = useState(false);
  const [isTranslatingScenarios, setIsTranslatingScenarios] = useState(false);

  const defaultBtnText =
    generateButtonText ||
    (mode === 'developer'
      ? '✨ AI Generate Developer Testing Points'
      : '✨ AI Auto-Generate Test Cases into Table');

  const handleTranslateDescription = async () => {
    if (!description.trim() || isTranslatingDesc) return;
    setIsTranslatingDesc(true);
    try {
      const translated = await translateToSimpleEnglish(description, 'description');
      onChangeDescription(translated);
    } catch {
      const fallback = polishObservationText(description);
      onChangeDescription(fallback);
    } finally {
      setIsTranslatingDesc(false);
    }
  };

  const handleTranslateScenarios = async () => {
    if (!testingScenarios.trim() || isTranslatingScenarios) return;
    setIsTranslatingScenarios(true);
    try {
      const translated = await translateToSimpleEnglish(testingScenarios, 'testing-scenarios');
      onChangeTestingScenarios(translated);
    } catch {
      const fallback = polishObservationText(testingScenarios);
      onChangeTestingScenarios(fallback);
    } finally {
      setIsTranslatingScenarios(false);
    }
  };

  const handlePolishDescription = () => {
    handleTranslateDescription();
  };

  const handlePolishScenarios = () => {
    handleTranslateScenarios();
  };

  // Handle File Upload (Image / Excel / Word / Text)
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newDocs: AttachedDocOrImage[] = [];
    const detectedFieldsToAdd = new Set<string>(screenFields);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const parsed = await parseUploadedFile(file);
        newDocs.push(parsed);

        if (parsed.detectedFields && parsed.detectedFields.length > 0) {
          parsed.detectedFields.forEach((f) => detectedFieldsToAdd.add(f));
        }
      } catch (err) {
        console.error('Failed to parse uploaded file:', err);
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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
      {/* Paste Notification Banner */}
      {pasteNotice && (
        <div className="px-3 py-2 bg-purple-50 border border-purple-200 text-purple-900 rounded-lg text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <ClipboardPaste className="w-4 h-4 text-purple-600 shrink-0" />
            <span>{pasteNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setPasteNotice(null)}
            className="text-purple-400 hover:text-purple-700 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

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
            <Code2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="text-slate-500 font-medium">Developer:</span>
            {onChangeDeveloperName && !readOnly ? (
              <input
                type="text"
                value={devName}
                onChange={(e) => onChangeDeveloperName(e.target.value)}
                placeholder="Assign developer..."
                title="Click to edit developer name - synchronizes across all developer fields for this ticket"
                className="font-bold text-amber-900 bg-amber-100/50 hover:bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300/60 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs w-28 sm:w-36"
              />
            ) : (
              <span className="font-bold text-amber-900">{devName || 'Unassigned'}</span>
            )}
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
              Description {readOnly && <span className="text-[10px] text-slate-400 font-normal lowercase">(read-only)</span>}
            </label>
            {!readOnly && (
              <button
                type="button"
                onClick={handleTranslateDescription}
                disabled={isTranslatingDesc}
                title="Convert any language / Hindi / Hinglish / notes into direct, simple, understandable English"
                className="px-2.5 py-1 bg-gradient-to-r from-purple-50 to-blue-50 hover:from-purple-100 hover:to-blue-100 text-purple-700 border border-purple-200 text-[11px] font-bold rounded-md flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
              >
                <Languages className="w-3.5 h-3.5 text-purple-600" />
                <span>{isTranslatingDesc ? 'Translating to English...' : '🌐 Convert to Simple English'}</span>
              </button>
            )}
          </div>
          <textarea
            rows={2}
            value={description}
            readOnly={readOnly}
            onChange={(e) => !readOnly && onChangeDescription(e.target.value)}
            placeholder="Enter ticket description or requirements..."
            className={`w-full p-2.5 border rounded-lg text-xs font-medium resize-y transition-all ${
              readOnly
                ? 'bg-slate-100/80 border-slate-200 text-slate-700 cursor-default'
                : 'bg-slate-50 border-slate-300 text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
            }`}
          />
        </div>

        {/* Testing Scenarios / Points */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Testing Scenarios / Points {readOnly && <span className="text-[10px] text-slate-400 font-normal lowercase">(read-only)</span>}
            </label>
            {!readOnly && (
              <button
                type="button"
                onClick={handleTranslateScenarios}
                disabled={isTranslatingScenarios}
                title="Convert any language / Hindi / Hinglish / notes into direct, simple, understandable English"
                className="px-2.5 py-1 bg-gradient-to-r from-purple-50 to-blue-50 hover:from-purple-100 hover:to-blue-100 text-purple-700 border border-purple-200 text-[11px] font-bold rounded-md flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
              >
                <Languages className="w-3.5 h-3.5 text-purple-600" />
                <span>{isTranslatingScenarios ? 'Translating to English...' : '🌐 Convert to Simple English'}</span>
              </button>
            )}
          </div>
          <textarea
            rows={2}
            value={testingScenarios}
            readOnly={readOnly}
            onChange={(e) => !readOnly && onChangeTestingScenarios(e.target.value)}
            placeholder="E.g. Positive overdue calculation; Pre-disbursement guard check; Report export (Multiple scenarios will be generated into table)"
            className={`w-full p-2.5 border rounded-lg text-xs font-medium resize-y transition-all ${
              readOnly
                ? 'bg-slate-100/80 border-slate-200 text-slate-700 cursor-default'
                : 'bg-slate-50 border-slate-300 text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
            }`}
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
              <span>Attached UI Screenshots / Files {readOnly && <span className="text-[10px] text-slate-400 font-normal lowercase">(view-only)</span>}</span>
            </label>
            {!readOnly && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClipboardPasteClick}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded text-[11px] font-semibold transition-colors cursor-pointer"
                  title="Paste screenshot directly from clipboard (Ctrl+V)"
                >
                  <ClipboardPaste className="w-3 h-3" />
                  <span>📋 Paste (Ctrl+V)</span>
                </button>
                <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">or Drag &amp; Drop</span>
              </div>
            )}
          </div>

          {/* Drag & Drop / Upload Area */}
          {!readOnly ? (
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
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                  handleFileUpload(e.target.files);
                  if (e.target) e.target.value = '';
                }}
              />
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <Upload className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="font-medium">
                  Click or drop UI screenshot, Excel or spec document
                </span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="text-[10px] font-semibold text-blue-700 bg-blue-100/80 hover:bg-blue-200 px-2.5 py-1 rounded cursor-pointer transition-colors"
              >
                Browse Files
              </button>
            </div>
          ) : attachedDocs.length === 0 ? (
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500 italic">
              No attached documents or screenshots for this ticket.
            </div>
          ) : null}

          {/* Attached Files List Chips */}
          {attachedDocs.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {attachedDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-2 px-2.5 py-1.5 bg-white border border-slate-200 hover:border-blue-300 rounded-lg text-xs shadow-2xs group transition-all"
                >
                  {doc.type === 'image' && doc.url ? (
                    <img
                      src={doc.url}
                      alt={doc.name}
                      className="w-5 h-5 rounded object-cover border border-slate-200 shrink-0"
                    />
                  ) : doc.type === 'image' ? (
                    <ImageIcon className="w-4 h-4 text-purple-600 shrink-0" />
                  ) : doc.type === 'excel' ? (
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                  )}

                  <span className="font-semibold text-slate-800 max-w-[140px] truncate" title={doc.name}>
                    {doc.name}
                  </span>

                  {doc.size && <span className="text-[10px] text-slate-400">({doc.size})</span>}

                  {doc.detectedFields && doc.detectedFields.length > 0 && (
                    <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200/60 px-1.5 py-0.2 rounded-full font-bold">
                      +{doc.detectedFields.length} fields
                    </span>
                  )}

                  {/* Preview Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewDoc(doc);
                    }}
                    title="Preview file content / screenshot"
                    className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded cursor-pointer transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5 text-blue-600" />
                  </button>

                  {!readOnly && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveDoc(doc.id);
                      }}
                      title="Remove attachment"
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Screen / Form Fields List */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Screen / Form Fields Available for Testing {readOnly && <span className="text-[10px] text-slate-400 font-normal lowercase">(view-only)</span>}
              </label>
              {screenFields.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsPreviewFieldsOpen(true)}
                  className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer"
                  title="Open Preview of all fields"
                >
                  <Eye className="w-3 h-3" />
                  <span>Preview ({screenFields.length})</span>
                </button>
              )}
            </div>
            {!readOnly && (
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
            )}
          </div>

          <div className="p-2 bg-slate-50 border border-slate-300 rounded-lg min-h-[42px] flex flex-wrap items-center gap-1.5">
            {screenFields.map((field) => (
              <span
                key={field}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-200/80 rounded-md text-[11px] font-semibold"
              >
                {field}
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => handleRemoveField(field)}
                    className="hover:text-rose-600 cursor-pointer ml-0.5"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                )}
              </span>
            ))}

            {/* Inline Input for New Field (Supports copy-pasting multiple values separated by commas or tabs) */}
            {!readOnly && (
              <div className="inline-flex items-center gap-1">
                <input
                  type="text"
                  value={newFieldInput}
                  onChange={(e) => setNewFieldInput(e.target.value)}
                  onKeyDown={handleAddField}
                  onPaste={handleFieldPaste}
                  placeholder={screenFields.length === 0 ? "Type or paste fields (e.g. Deal ID, Rate, Amount)..." : "+ Add or paste field..."}
                  className="text-xs bg-transparent border-none focus:outline-none text-slate-800 placeholder:text-slate-400 min-w-[160px]"
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
            )}
          </div>
          <p className="text-[10px] text-slate-500">
            * AI uses these fields to generate field-level validations, boundary checks &amp; mandatory field tests even if only screenshot/file is provided.
          </p>
        </div>
      </div>

      {/* 4. Action Row: AI Auto-Generate Button & Duplicate Prevention Badge */}
      {!readOnly && showGenerateButton && onGenerateAi && (
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

      {/* Attachment Preview Modal (For screenshots, excel, docs) */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] shadow-2xl flex flex-col overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                {previewDoc.type === 'image' && <ImageIcon className="w-4 h-4 text-purple-600" />}
                {previewDoc.type === 'excel' && <FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
                {(previewDoc.type === 'word' || previewDoc.type === 'text') && <FileText className="w-4 h-4 text-blue-600" />}
                <div>
                  <h4 className="font-bold text-sm text-slate-900">{previewDoc.name}</h4>
                  <p className="text-[11px] text-slate-500">
                    Type: <span className="font-medium text-slate-700 uppercase">{previewDoc.type}</span> {previewDoc.size && `• Size: ${previewDoc.size}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {previewDoc.url && (
                  <a
                    href={previewDoc.url}
                    download={previewDoc.name}
                    className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Download</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-4 overflow-y-auto max-h-[70vh] flex flex-col items-center justify-center bg-slate-900/5">
              {previewDoc.type === 'image' && previewDoc.url ? (
                <div className="w-full flex flex-col items-center gap-3">
                  <img
                    src={previewDoc.url}
                    alt={previewDoc.name}
                    className="max-h-[60vh] max-w-full object-contain rounded-lg border border-slate-200 shadow-md bg-white"
                  />
                  <p className="text-xs text-slate-500">Pasted / uploaded screenshot preview (100% full quality)</p>
                </div>
              ) : (
                <div className="w-full bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
                  <div>
                    <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Detected Screen / Form Fields:
                    </h5>
                    {previewDoc.detectedFields && previewDoc.detectedFields.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {previewDoc.detectedFields.map((f, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-blue-50 text-blue-800 rounded border border-blue-200 text-xs font-semibold">
                            {f}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No structured fields detected in this file.</p>
                    )}
                  </div>

                  {previewDoc.extractedContent && (
                    <div>
                      <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Extracted Specification Content:
                      </h5>
                      <pre className="p-3 bg-slate-50 rounded-lg text-xs font-mono text-slate-800 whitespace-pre-wrap max-h-60 overflow-y-auto border border-slate-200">
                        {previewDoc.extractedContent}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-slate-100 bg-white flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold cursor-pointer transition-colors"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Screen Fields Preview Modal */}
      {isPreviewFieldsOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] shadow-2xl flex flex-col overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h4 className="font-bold text-sm text-slate-900">
                  Screen / Form Fields Preview ({screenFields.length})
                </h4>
                <p className="text-[11px] text-slate-500">
                  All fields recognized for positive, negative, and boundary test case generation
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPreviewFieldsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5 w-12 text-center">#</th>
                    <th className="p-2.5">Field Name</th>
                    <th className="p-2.5">Validation Rule</th>
                    <th className="p-2.5">Boundary Check</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {screenFields.map((f, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="p-2.5 text-center font-mono text-slate-400">{i + 1}</td>
                      <td className="p-2.5 font-bold text-blue-700">{f}</td>
                      <td className="p-2.5 text-slate-600">
                        {f.toLowerCase().includes('date')
                          ? 'Valid YYYY-MM-DD, Future/Past limits'
                          : f.toLowerCase().includes('rate') || f.toLowerCase().includes('amount')
                          ? 'Numeric only, > 0, precision 2-4 digits'
                          : 'Mandatory non-empty check, SQL/XSS sanitize'}
                      </td>
                      <td className="p-2.5 text-slate-500 italic">
                        {f.toLowerCase().includes('amount')
                          ? '0, -1, 999999999999, Null'
                          : f.toLowerCase().includes('date')
                          ? 'Feb 30, 00/00/0000, 2099'
                          : 'Empty string, 256+ chars, Special chars'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                You can copy-paste multiple fields separated by commas or tabs directly into the input.
              </span>
              <button
                type="button"
                onClick={() => setIsPreviewFieldsOpen(false)}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
