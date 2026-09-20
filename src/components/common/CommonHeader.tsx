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
import { CorporateTicketHeader } from './CorporateTicketHeader';

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
  clientName?: string;
  onChangeClientName?: (value: string) => void;
  moduleName?: string;
  onChangeModuleName?: (value: string) => void;
  taskName?: string;
  onChangeTaskName?: (value: string) => void;
  sha?: string;
  onChangeSha?: (value: string) => void;
  signOffBy?: string;
  onChangeSignOffBy?: (value: string) => void;
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
  onAiGenerateSuccess?: (data: any) => void;
  onAiGenerateMultiScenarios?: (scenarios: string[]) => void;
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
  clientName,
  onChangeClientName,
  moduleName,
  onChangeModuleName,
  taskName,
  onChangeTaskName,
  sha,
  onChangeSha,
  signOffBy,
  onChangeSignOffBy,
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

  const devName = developerName !== undefined ? developerName : (currentTicket?.developer || '');
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

      {/* 1. Enhanced Corporate Header Bar: Client Name, Module, Ticket ID (dropdown + editable), Task Name (1-line), QA Assignee, Developer, SHA, Sign Off By */}
      <CorporateTicketHeader
        selectedTicketNumber={selectedTicketNumber}
        tickets={tickets}
        onSelectTicket={onSelectTicket}
        clientName={clientName}
        onChangeClientName={onChangeClientName}
        moduleName={moduleName || currentTicket?.moduleName}
        onChangeModuleName={onChangeModuleName}
        taskName={taskName || currentTicket?.featureName}
        onChangeTaskName={onChangeTaskName}
        qaAssignee={qaName}
        developer={devName}
        onChangeDeveloper={onChangeDeveloperName}
        sha={sha || currentTicket?.shaCommit}
        onChangeSha={onChangeSha}
        signOffBy={signOffBy || reviewDoneBy || currentTicket?.signOffBy}
        onChangeSignOffBy={onChangeSignOffBy}
        readOnly={readOnly}
      />

      {/* 2. Main Input: Description (Full Width) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Description / Requirements {readOnly && <span className="text-[10px] text-slate-400 font-normal lowercase">(read-only)</span>}
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
          rows={3}
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

      {/* 3. Attached Files & Screenshots (Full Width) */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
            <Paperclip className="w-3.5 h-3.5 text-blue-600" />
            <span>Attached UI Screenshots / Files {readOnly && <span className="text-[10px] text-slate-400 font-normal lowercase">(view-only)</span>}</span>
            {attachedDocs.length > 0 && (
              <span className="text-[11px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                {attachedDocs.length} {attachedDocs.length === 1 ? 'file' : 'files'}
              </span>
            )}
          </label>
          {!readOnly && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClipboardPasteClick}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-md text-[11px] font-bold transition-colors cursor-pointer shadow-2xs"
                title="Paste screenshot directly from clipboard (Ctrl+V)"
              >
                <ClipboardPaste className="w-3.5 h-3.5" />
                <span>📋 Paste Screenshot (Ctrl+V)</span>
              </button>
              <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">or Drag &amp; Drop / Upload below</span>
            </div>
          )}
        </div>

        {/* Drag & Drop / Upload Area */}
        {!readOnly && (
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
            className={`border-2 border-dashed rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 cursor-pointer transition-colors ${
              isDragging
                ? 'border-blue-500 bg-blue-50/70'
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
            <div className="flex items-center gap-2.5 text-xs text-slate-600">
              <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                <Upload className="w-4 h-4 shrink-0" />
              </div>
              <div>
                <span className="font-bold text-slate-800">
                  Click or drag and drop UI screenshots, Excel or spec documents here
                </span>
                <p className="text-[11px] text-slate-500">Supports PNG, JPG, Excel (.xlsx, .csv), Word (.docx), and PDF</p>
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="text-xs font-bold text-blue-700 bg-blue-100 hover:bg-blue-200 px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
            >
              Browse Files
            </button>
          </div>
        )}

        {/* Attached Files List Chips & Previews */}
        {attachedDocs.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 pt-1">
            {attachedDocs.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between gap-2 p-2 bg-white border border-slate-200 hover:border-blue-300 rounded-xl text-xs shadow-2xs group transition-all"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {doc.type === 'image' && (doc.url || doc.dataUrl) ? (
                    <img
                      src={doc.url || doc.dataUrl}
                      alt={doc.name}
                      onClick={() => setPreviewDoc(doc)}
                      className="w-9 h-9 rounded-lg object-cover border border-slate-200 shrink-0 cursor-pointer hover:opacity-85"
                    />
                  ) : doc.type === 'image' ? (
                    <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center text-purple-700 shrink-0">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                  ) : doc.type === 'excel' ? (
                    <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                  ) : (
                    <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700 shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                  )}

                  <div className="min-w-0">
                    <span className="font-bold text-slate-800 block truncate text-xs" title={doc.name}>
                      {doc.name}
                    </span>
                    {doc.size && <span className="text-[10px] text-slate-400 block">{doc.size}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {/* Preview Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewDoc(doc);
                    }}
                    title="Preview file content / screenshot"
                    className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors"
                  >
                    <Eye className="w-4 h-4 text-blue-600" />
                  </button>

                  {!readOnly && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveDoc(doc.id);
                      }}
                      title="Remove attachment"
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer transition-colors flex items-center gap-1"
                    >
                      <X className="w-4 h-4 text-red-500" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : readOnly ? (
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500 italic">
            No attached documents or screenshots for this ticket.
          </div>
        ) : null}
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
