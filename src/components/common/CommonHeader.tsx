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
  ChevronLeft,
  ChevronRight,
  Trash2,
} from 'lucide-react';
import { TicketSummary, AttachedDocOrImage } from '../../types';
import { polishObservationText } from '../../utils/textPolisher';
import { parseUploadedFile } from '../../utils/fileParser';
import { translateToSimpleEnglish } from '../../utils/languageAi';
import { CorporateTicketHeader } from './CorporateTicketHeader';

function dataURLtoBlob(dataUrl: string): Blob {
  try {
    const parts = dataUrl.split(',');
    const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/png';
    const bstr = atob(parts[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  } catch {
    return new Blob([], { type: 'image/png' });
  }
}

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
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const pasteCaptureRef = useRef<HTMLTextAreaElement>(null);

  // Focus paste capture area when modal opens
  useEffect(() => {
    if (isPasteModalOpen) {
      setTimeout(() => {
        pasteCaptureRef.current?.focus();
      }, 80);
    }
  }, [isPasteModalOpen]);

  // Helper to process and attach any files or screenshots
  const attachFilesList = async (filesToAttach: (File | Blob)[], sourceHint = 'files') => {
    if (!filesToAttach || filesToAttach.length === 0) return;
    const newDocs: AttachedDocOrImage[] = [];
    const detectedFieldsToAdd = new Set<string>(screenFields);

    for (let i = 0; i < filesToAttach.length; i++) {
      const item = filesToAttach[i];
      try {
        const fileObj =
          item instanceof File
            ? item
            : new File([item], `screenshot_${Date.now()}_${i + 1}.png`, {
                type: item.type || 'image/png',
              });
        const parsed = await parseUploadedFile(fileObj);
        newDocs.push(parsed);

        if (parsed.detectedFields && parsed.detectedFields.length > 0) {
          parsed.detectedFields.forEach((f) => detectedFieldsToAdd.add(f));
        }
      } catch (err) {
        console.error('Failed to parse uploaded item:', err);
      }
    }

    if (newDocs.length === 0) return;

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    const updated = [...attachedDocs, ...newDocs];
    onUpdateAttachedDocs?.(updated);
    onUpdateScreenFields?.(Array.from(detectedFieldsToAdd));
    setPreviewDoc(newDocs[newDocs.length - 1]);
    setPasteNotice(`✅ ${newDocs.length} ${sourceHint} attached successfully! Click "Preview" to inspect.`);
    setTimeout(() => setPasteNotice(null), 4000);
  };

  // Extract all images/files from clipboard DataTransfer
  const handleClipboardPasteData = async (
    clipboardData: DataTransfer | null
  ): Promise<boolean> => {
    if (!clipboardData) return false;
    const filesToAttach: File[] = [];

    // 1. Files array (e.g. copied files from disk or clipboard)
    if (clipboardData.files && clipboardData.files.length > 0) {
      for (let i = 0; i < clipboardData.files.length; i++) {
        const f = clipboardData.files[i];
        if (
          f.type.startsWith('image/') ||
          /\.(png|jpe?g|webp|gif|bmp|xlsx?|csv|docx?|pdf|txt)$/i.test(f.name) ||
          f.size > 0
        ) {
          filesToAttach.push(f);
        }
      }
    }

    // 2. Clipboard items (e.g. Snipping tool Win+Shift+S / PrtScn / browser copy image)
    if (clipboardData.items && clipboardData.items.length > 0) {
      for (let i = 0; i < clipboardData.items.length; i++) {
        const item = clipboardData.items[i];
        if (item.type.indexOf('image') !== -1 || item.kind === 'file') {
          const file = item.getAsFile();
          if (
            file &&
            !filesToAttach.some(
              (existing) => existing.size === file.size && existing.name === file.name
            )
          ) {
            filesToAttach.push(file);
          }
        }
      }
    }

    // 3. Copied HTML with img tags (e.g. copied image element from webpage or word)
    if (filesToAttach.length === 0) {
      const html = clipboardData.getData('text/html');
      if (html) {
        const match = html.match(/<img[^>]+src=["'](data:image\/[^"']+|https?:\/\/[^"']+)["']/i);
        if (match && match[1]) {
          const src = match[1];
          if (src.startsWith('data:image/')) {
            const blob = dataURLtoBlob(src);
            filesToAttach.push(
              new File([blob], `pasted_screenshot_${Date.now()}.png`, { type: blob.type || 'image/png' })
            );
          }
        }
      }
    }

    // 4. Text data URL (e.g. data:image/png;base64,... or image URL)
    if (filesToAttach.length === 0) {
      const text = clipboardData.getData('text');
      if (text && text.trim().startsWith('data:image/')) {
        const blob = dataURLtoBlob(text.trim());
        filesToAttach.push(
          new File([blob], `pasted_screenshot_${Date.now()}.png`, { type: blob.type || 'image/png' })
        );
      }
    }

    if (filesToAttach.length > 0) {
      await attachFilesList(
        filesToAttach,
        filesToAttach.length === 1 ? 'screenshot' : 'screenshots'
      );
      return true;
    }
    return false;
  };

  // Global window paste listener: catches any screenshot or file pasted anywhere on page
  useEffect(() => {
    const handleGlobalPaste = async (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

      const hasFiles =
        (e.clipboardData?.files && e.clipboardData.files.length > 0) ||
        Array.from(e.clipboardData?.items || []).some((it) =>
          it.kind === 'file' || it.type.startsWith('image/')
        );

      if (hasFiles) {
        // If an image or file is in clipboard, prevent default text paste and attach it cleanly!
        e.preventDefault();
        await handleClipboardPasteData(e.clipboardData);
      } else if (!isInput) {
        // If user is not focused on an input/textarea, handle paste
        await handleClipboardPasteData(e.clipboardData);
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
        const files: File[] = [];
        for (const item of clipboardItems) {
          for (const type of item.types) {
            if (type.startsWith('image/')) {
              const blob = await item.getType(type);
              files.push(
                new File([blob], `pasted_screenshot_${Date.now()}.png`, { type })
              );
            }
          }
        }
        if (files.length > 0) {
          await attachFilesList(
            files,
            files.length === 1 ? 'screenshot' : 'screenshots'
          );
          return;
        }
      }
    } catch {
      // Browser permission blocked clipboard.read() in iframe
    }
    // Fallback: open dedicated interactive paste capture dialog
    setIsPasteModalOpen(true);
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

  const cleanSelNo = (selectedTicketNumber || '').trim().replace(/^#+/, '').toLowerCase();
  const currentTicket = tickets.find(
    (t) => (t.ticketNumber || '').trim().replace(/^#+/, '').toLowerCase() === cleanSelNo
  );

  const devName = developerName !== undefined ? developerName : (currentTicket?.developer || '');
  const qaName = qaAssigneeName !== undefined ? qaAssigneeName : (currentTicket?.qaAssignee || '');

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
    const filesArray = Array.from(files);
    await attachFilesList(filesArray, filesArray.length === 1 ? 'file' : 'files');
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
    const handled = await handleClipboardPasteData(e.clipboardData);
    if (handled) {
      e.preventDefault();
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
        mode={mode}
        selectedTicketNumber={selectedTicketNumber}
        tickets={tickets}
        onSelectTicket={onSelectTicket}
        clientName={clientName}
        onChangeClientName={onChangeClientName}
        moduleName={moduleName !== undefined ? moduleName : (currentTicket?.moduleName || '')}
        onChangeModuleName={onChangeModuleName}
        taskName={taskName !== undefined ? taskName : (currentTicket?.featureName || '')}
        onChangeTaskName={onChangeTaskName}
        qaAssignee={qaName}
        developer={devName}
        onChangeDeveloper={onChangeDeveloperName}
        sha={sha !== undefined ? sha : (currentTicket?.shaCommit || '')}
        onChangeSha={onChangeSha}
        signOffBy={signOffBy !== undefined ? signOffBy : (reviewDoneBy || currentTicket?.signOffBy || '')}
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
          value={description ?? ''}
          readOnly={readOnly}
          onChange={(e) => !readOnly && onChangeDescription?.(e.target.value)}
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
            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
              attachedDocs.length > 0 ? 'bg-blue-600 text-white shadow-2xs' : 'bg-slate-200 text-slate-600'
            }`}>
              {attachedDocs.length} {attachedDocs.length === 1 ? 'file attached' : 'files attached'}
            </span>
          </label>
          {!readOnly && (
            <div className="flex items-center gap-2">
              {attachedDocs.length > 0 && (
                <button
                  type="button"
                  onClick={() => setPreviewDoc(attachedDocs[attachedDocs.length - 1])}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-md text-[11px] font-bold transition-colors cursor-pointer shadow-2xs"
                  title="Preview latest attached screenshot or document"
                >
                  <Eye className="w-3.5 h-3.5 text-blue-600" />
                  <span>👁️ Preview ({attachedDocs.length})</span>
                </button>
              )}
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

        {/* Prominent Attachment Summary Banner */}
        <div className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs ${
          attachedDocs.length > 0
            ? 'bg-blue-50/80 border-blue-200 text-blue-900'
            : 'bg-slate-50 border-slate-200 text-slate-500'
        }`}>
          <div className="flex items-center gap-2">
            <span className="font-bold">
              {attachedDocs.length > 0
                ? `📎 ${attachedDocs.length} ${attachedDocs.length === 1 ? 'File' : 'Files'} Attached (${attachedDocs.filter((d) => d.type === 'image').length} Screenshots, ${attachedDocs.filter((d) => d.type !== 'image').length} Documents)`
                : '📎 No screenshots or files attached yet.'}
            </span>
            {attachedDocs.length > 0 && (
              <span className="text-[11px] text-blue-700">
                • {attachedDocs.map((d) => d.name).slice(0, 3).join(', ')}{attachedDocs.length > 3 ? ` +${attachedDocs.length - 3} more` : ''}
              </span>
            )}
          </div>
          {attachedDocs.length > 0 && (
            <button
              type="button"
              onClick={() => setPreviewDoc(attachedDocs[0])}
              className="text-[11px] font-bold text-blue-700 underline hover:text-blue-900 cursor-pointer shrink-0"
            >
              View All
            </button>
          )}
        </div>

        {/* Drag & Drop / Paste / Upload Area */}
        {!readOnly && (
          <div
            tabIndex={0}
            onPaste={async (e) => {
              e.preventDefault();
              e.stopPropagation();
              await handleClipboardPasteData(e.clipboardData);
            }}
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
            className={`border-2 border-dashed rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 transition-all outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
              isDragging
                ? 'border-blue-500 bg-blue-50/80 shadow-md'
                : 'border-slate-300 bg-slate-50/80 hover:border-purple-400 hover:bg-purple-50/30'
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
              <div className="p-2.5 bg-purple-100 text-purple-700 rounded-lg shrink-0 shadow-2xs">
                <ClipboardPaste className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-slate-800 text-sm block">
                  Paste Screenshot (Ctrl+V), or Drag &amp; Drop documents here
                </span>
                <p className="text-[11px] text-slate-500">
                  Direct paste for Snips / Win+Shift+S / PrtScn / Copied files. Or click &ldquo;Browse Files&rdquo; for local disk files.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {attachedDocs.length > 0 && (
                <button
                  type="button"
                  onClick={() => setPreviewDoc(attachedDocs[attachedDocs.length - 1])}
                  className="text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg cursor-pointer transition-colors flex items-center gap-1.5 shadow-2xs"
                  title="Preview attached screenshot"
                >
                  <Eye className="w-3.5 h-3.5 text-blue-600" />
                  <span>Preview ({attachedDocs.length})</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleClipboardPasteClick}
                className="text-xs font-bold text-purple-700 bg-purple-100 hover:bg-purple-200 px-3 py-1.5 rounded-lg cursor-pointer transition-colors flex items-center gap-1.5 shadow-2xs"
              >
                <ClipboardPaste className="w-3.5 h-3.5" />
                <span>Paste Screenshot</span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="text-xs font-bold text-blue-700 bg-blue-100 hover:bg-blue-200 px-3 py-1.5 rounded-lg cursor-pointer transition-colors flex items-center gap-1.5 shadow-2xs"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Browse Files</span>
              </button>
            </div>
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
        <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] shadow-2xl flex flex-col overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            {(() => {
              const currentDocIndex = attachedDocs.findIndex((d) => d.id === previewDoc.id);
              const hasPrev = attachedDocs.length > 1;
              const hasNext = attachedDocs.length > 1;

              const handlePrev = () => {
                const prevIdx = (currentDocIndex - 1 + attachedDocs.length) % attachedDocs.length;
                setPreviewDoc(attachedDocs[prevIdx]);
              };

              const handleNext = () => {
                const nextIdx = (currentDocIndex + 1) % attachedDocs.length;
                setPreviewDoc(attachedDocs[nextIdx]);
              };

              return (
                <>
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {previewDoc.type === 'image' && <ImageIcon className="w-5 h-5 text-purple-600 shrink-0" />}
                      {previewDoc.type === 'excel' && <FileSpreadsheet className="w-5 h-5 text-emerald-600 shrink-0" />}
                      {(previewDoc.type === 'word' || previewDoc.type === 'text') && <FileText className="w-5 h-5 text-blue-600 shrink-0" />}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-slate-900 truncate" title={previewDoc.name}>
                            {previewDoc.name}
                          </h4>
                          {attachedDocs.length > 1 && (
                            <span className="text-[11px] font-semibold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full shrink-0">
                              {currentDocIndex + 1} of {attachedDocs.length}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Type: <span className="font-medium text-slate-700 uppercase">{previewDoc.type}</span> {previewDoc.size && `• Size: ${previewDoc.size}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {hasPrev && (
                        <div className="flex items-center gap-1 mr-2 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                          <button
                            type="button"
                            onClick={handlePrev}
                            title="Previous attachment"
                            className="p-1 text-slate-600 hover:text-purple-700 hover:bg-white rounded cursor-pointer transition-colors"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <span className="text-[11px] font-mono px-1 font-bold text-slate-600">
                            {currentDocIndex + 1}/{attachedDocs.length}
                          </span>
                          <button
                            type="button"
                            onClick={handleNext}
                            title="Next attachment"
                            className="p-1 text-slate-600 hover:text-purple-700 hover:bg-white rounded cursor-pointer transition-colors"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      )}

                      {(previewDoc.url || previewDoc.dataUrl) && (
                        <a
                          href={previewDoc.url || previewDoc.dataUrl}
                          download={previewDoc.name}
                          className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors border border-transparent hover:border-blue-200"
                          title="Download attachment"
                        >
                          <Download className="w-4 h-4" />
                          <span className="hidden sm:inline">Download</span>
                        </a>
                      )}

                      {!readOnly && (
                        <button
                          type="button"
                          onClick={() => {
                            handleRemoveDoc(previewDoc.id);
                            if (attachedDocs.length <= 1) {
                              setPreviewDoc(null);
                            } else {
                              const remaining = attachedDocs.filter((d) => d.id !== previewDoc.id);
                              setPreviewDoc(remaining[0]);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                          title="Remove this attachment"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setPreviewDoc(null)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg cursor-pointer transition-colors"
                        title="Close preview"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Modal Content */}
                  <div className="p-4 overflow-y-auto max-h-[65vh] flex flex-col items-center justify-center bg-slate-900/5">
                    {previewDoc.type === 'image' && (previewDoc.url || previewDoc.dataUrl) ? (
                      <div className="w-full flex flex-col items-center gap-3">
                        <img
                          src={previewDoc.url || previewDoc.dataUrl}
                          alt={previewDoc.name}
                          className="max-h-[58vh] max-w-full object-contain rounded-lg border border-slate-200 shadow-md bg-white"
                        />
                        <p className="text-xs text-slate-500 font-medium">
                          Pasted / uploaded screenshot preview (100% full resolution)
                        </p>
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

                  {/* Multi-Screenshot Thumbnail Carousel (Quick switch between multiple attached screenshots) */}
                  {attachedDocs.length > 1 && (
                    <div className="p-2.5 bg-slate-100 border-t border-slate-200 flex items-center gap-2 overflow-x-auto">
                      <span className="text-[11px] font-bold text-slate-500 uppercase shrink-0 pl-1">
                        All ({attachedDocs.length}):
                      </span>
                      {attachedDocs.map((doc, idx) => {
                        const isCurrent = doc.id === previewDoc.id;
                        return (
                          <button
                            key={doc.id}
                            type="button"
                            onClick={() => setPreviewDoc(doc)}
                            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium shrink-0 cursor-pointer transition-all border ${
                              isCurrent
                                ? 'bg-purple-600 text-white border-purple-700 shadow-xs ring-2 ring-purple-300'
                                : 'bg-white text-slate-700 hover:bg-slate-200 border-slate-300'
                            }`}
                          >
                            {doc.type === 'image' && (doc.url || doc.dataUrl) ? (
                              <img src={doc.url || doc.dataUrl} alt={doc.name} className="w-5 h-5 rounded object-cover" />
                            ) : (
                              <FileText className="w-4 h-4" />
                            )}
                            <span className="truncate max-w-[120px]">{doc.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Modal Footer */}
                  <div className="p-3 border-t border-slate-100 bg-white flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      {attachedDocs.length > 1
                        ? `Viewing attachment ${currentDocIndex + 1} of ${attachedDocs.length}. Use arrow buttons or click thumbnails to switch.`
                        : 'Screenshot preview loaded.'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPreviewDoc(null)}
                      className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                    >
                      Close Preview
                    </button>
                  </div>
                </>
              );
            })()}
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
      {/* Direct Screenshot Paste Capture Modal for iframe safety */}
      {isPasteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-purple-100 text-purple-700 rounded-lg">
                  <ClipboardPaste className="w-4 h-4" />
                </span>
                <h3 className="text-sm font-bold text-slate-900">Paste UI Screenshot</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPasteModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div
              className="p-6 border-2 border-dashed border-purple-300 bg-purple-50/50 hover:bg-purple-50/80 rounded-xl text-center cursor-pointer transition-colors"
              onClick={() => pasteCaptureRef.current?.focus()}
            >
              <ClipboardPaste className="w-10 h-10 text-purple-600 mx-auto mb-2" />
              <div className="text-xs font-bold text-purple-950 mb-1">
                Press Ctrl+V anywhere now
              </div>
              <div className="text-[11px] text-purple-700 mb-3">
                Or Right Click → Paste below (Win+Shift+S / PrtScn / Copied file)
              </div>
              <textarea
                ref={pasteCaptureRef}
                rows={2}
                onPaste={async (e) => {
                  e.preventDefault();
                  const handled = await handleClipboardPasteData(e.clipboardData);
                  if (handled) {
                    setIsPasteModalOpen(false);
                  }
                }}
                placeholder="Click here and press Ctrl+V to paste your screenshot..."
                className="w-full text-xs p-2.5 bg-white border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-center text-slate-700 resize-none shadow-2xs"
              />
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsPasteModalOpen(false);
                  fileInputRef.current?.click();
                }}
                className="text-blue-600 hover:text-blue-800 font-semibold cursor-pointer underline flex items-center gap-1"
              >
                <Upload className="w-3 h-3" />
                <span>Browse from disk instead</span>
              </button>
              <button
                type="button"
                onClick={() => setIsPasteModalOpen(false)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold cursor-pointer transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
