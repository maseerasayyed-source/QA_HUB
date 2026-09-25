import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Sparkles,
  ClipboardPaste,
  Save,
  Check,
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  Ban,
  Paperclip,
  Upload,
  Eye,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Download,
} from 'lucide-react';
import { TestCaseItem, TicketSummary, FileAttachment } from '../../types';
import {
  generateTestCaseFieldsWithAi,
  parseQuickPasteSolution,
} from '../../utils/aiGenerator';

interface TestCaseSolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  testCase: TestCaseItem | null;
  ticket?: TicketSummary;
  onSave: (updated: Partial<TestCaseItem>) => void;
}

export const TestCaseSolutionModal: React.FC<TestCaseSolutionModalProps> = ({
  isOpen,
  onClose,
  testCase,
  ticket,
  onSave,
}) => {
  if (!isOpen || !testCase) return null;

  const [clipboardText, setClipboardText] = useState('');
  const [scenario, setScenario] = useState(testCase.testScenario || '');
  const [testCasesText, setTestCasesText] = useState(testCase.testCases || '');
  const [expectedResult, setExpectedResult] = useState(testCase.expectedResult || '');
  const [actualResult, setActualResult] = useState(
    testCase.actualResult && testCase.actualResult !== 'Pending execution'
      ? testCase.actualResult
      : 'Verified successfully in accordance with expected specifications.'
  );
  const [status, setStatus] = useState<'pass' | 'fail' | 'blocked' | 'not run'>(
    (testCase.status as any) || 'pass'
  );
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [previewAttachment, setPreviewAttachment] = useState<FileAttachment | null>(null);
  const [previewZoom, setPreviewZoom] = useState<number>(1);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (testCase) {
      setScenario(testCase.testScenario || '');
      setTestCasesText(testCase.testCases || '');
      setExpectedResult(testCase.expectedResult || '');
      setActualResult(
        testCase.actualResult && testCase.actualResult !== 'Pending execution'
          ? testCase.actualResult
          : 'Verified successfully in accordance with expected specifications.'
      );
      setStatus(((testCase.status as any) || 'pass').toLowerCase() as any);
      setClipboardText('');

      // Normalize existing attachments and screenshots
      const initialAtts: FileAttachment[] = [...(testCase.attachments || [])];
      ['screenshot1', 'screenshot2', 'screenshot3', 'screenshot4'].forEach((key, idx) => {
        const val = (testCase as any)[key];
        if (val && !initialAtts.some((a) => a.url === val)) {
          initialAtts.push({
            id: `ss-${idx}-${Date.now()}`,
            name: `Screenshot ${idx + 1}`,
            url: val,
            uploadedAt: new Date().toLocaleDateString(),
          });
        }
      });
      setAttachments(initialAtts);
    }
  }, [testCase]);

  // Modal paste listener for multiple screenshots
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items || items.length === 0) return;

      let pastedCount = 0;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            pastedCount++;
            const reader = new FileReader();
            reader.onload = (event) => {
              const url = event.target?.result as string;
              const newAtt: FileAttachment = {
                id: `pasted-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                name: `screenshot_${new Date().toISOString().replace(/[:.]/g, '-')}.png`,
                url,
                size: `${Math.round(file.size / 1024)} KB`,
                uploadedAt: new Date().toLocaleDateString(),
              };
              setAttachments((prev) => [...prev, newAtt]);
            };
            reader.readAsDataURL(file);
          }
        }
      }

      if (pastedCount > 0) {
        showToast(`✅ ${pastedCount} screenshot(s) pasted from clipboard!`);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
    if (previewAttachment?.id === id) {
      setPreviewAttachment(null);
    }
    showToast('Attachment removed.');
  };

  const handleFileUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const count = files.length;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const url = e.target?.result as string;
        const newAtt: FileAttachment = {
          id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: file.name,
          url,
          size: `${Math.round(file.size / 1024)} KB`,
          uploadedAt: new Date().toLocaleDateString(),
        };
        setAttachments((prev) => [...prev, newAtt]);
      };
      reader.readAsDataURL(file);
    });
    showToast(`✅ Added ${count} screenshot/file(s) successfully!`);
  };

  const handleClipboardPasteClick = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.read) {
        const items = await navigator.clipboard.read();
        let found = false;
        for (const item of items) {
          for (const type of item.types) {
            if (type.startsWith('image/')) {
              const blob = await item.getType(type);
              const reader = new FileReader();
              reader.onload = (e) => {
                const url = e.target?.result as string;
                const newAtt: FileAttachment = {
                  id: `pasted-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                  name: `screenshot_${new Date().toISOString().replace(/[:.]/g, '-')}.png`,
                  url,
                  size: `${Math.round(blob.size / 1024)} KB`,
                  uploadedAt: new Date().toLocaleDateString(),
                };
                setAttachments((prev) => [...prev, newAtt]);
                showToast('✅ Screenshot pasted from clipboard!');
              };
              reader.readAsDataURL(blob);
              found = true;
            }
          }
        }
        if (!found) {
          showToast('No image in clipboard. Copy image first or press Ctrl+V directly.');
        }
      } else {
        showToast('Press Ctrl+V anywhere in this window to paste screenshot.');
      }
    } catch {
      showToast('Press Ctrl+V directly to paste screenshot from clipboard.');
    }
  };

  const handleAutoFillFromClipboard = async () => {
    const textToProcess = clipboardText.trim() || scenario.trim();
    if (!textToProcess) {
      showToast('Please paste or type your requirement point first.');
      return;
    }

    setIsAiGenerating(true);
    try {
      const res = await fetch('/api/ai/convert-language-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: textToProcess,
          rawCommand: textToProcess,
          moduleName: ticket?.moduleName || 'Term Loan',
          ticketNo: ticket?.ticketNumber || '1024',
          ticketTitle: ticket?.featureName || '',
          context: 'qa_solution_modal',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const item = data.result || data.structuredTestCase;
        if (data.success && item) {
          if (item.testScenario || item.scenario) setScenario(item.testScenario || item.scenario);
          if (item.testCases) setTestCasesText(item.testCases);
          if (item.expectedResult) setExpectedResult(item.expectedResult);
          if (item.actualResult) setActualResult(item.actualResult);
          setStatus('pass');
          showToast('✨ AI generated high-standard test case & results!');
          setIsAiGenerating(false);
          return;
        }
      }
    } catch (e) {
      console.warn('AI endpoint failed, falling back to local engine:', e);
    }

    // Local deterministic generator
    const parsed = parseQuickPasteSolution(textToProcess);
    if (parsed.scenario) setScenario(parsed.scenario);
    if (parsed.testCases) setTestCasesText(parsed.testCases);
    if (parsed.expectedResult) setExpectedResult(parsed.expectedResult);
    if (parsed.actualResult) setActualResult(parsed.actualResult);
    setStatus('pass');
    setIsAiGenerating(false);
    showToast('✨ Fields successfully auto-filled from requirement point!');
  };

  const handleAutoGenerateWithAi = async () => {
    const baseText = scenario.trim() || clipboardText.trim() || ticket?.featureName || 'Verification Point';
    setIsAiGenerating(true);

    try {
      const res = await fetch('/api/ai/convert-language-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: baseText,
          rawCommand: baseText,
          moduleName: ticket?.moduleName || 'Term Loan',
          ticketNo: ticket?.ticketNumber || '1024',
          ticketTitle: ticket?.featureName || '',
          context: 'qa_solution_modal',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const item = data.result || data.structuredTestCase;
        if (data.success && item) {
          if (item.testScenario || item.scenario) setScenario(item.testScenario || item.scenario);
          if (item.testCases) setTestCasesText(item.testCases);
          if (item.expectedResult) setExpectedResult(item.expectedResult);
          if (item.actualResult) setActualResult(item.actualResult);
          setStatus('pass');
          showToast('✨ Polished test case & results generated successfully!');
          setIsAiGenerating(false);
          return;
        }
      }
    } catch (e) {
      console.warn('AI polish call failed, using local model:', e);
    }

    const generated = generateTestCaseFieldsWithAi(baseText, ticket);
    setScenario(generated.scenario);
    setTestCasesText(generated.testCases);
    setExpectedResult(generated.expectedResult);
    setActualResult(generated.actualResult);
    setStatus('pass');
    setIsAiGenerating(false);
    showToast('✨ Polished test case created successfully!');
  };

  const handleSave = () => {
    onSave({
      testScenario: scenario,
      testCases: testCasesText,
      expectedResult: expectedResult,
      actualResult: actualResult,
      status: status,
      attachments: attachments,
      screenshot1: attachments[0]?.url || undefined,
      screenshot2: attachments[1]?.url || undefined,
      screenshot3: attachments[2]?.url || undefined,
      screenshot4: attachments[3]?.url || undefined,
    });
    onClose();
  };

  // Preview navigation
  const previewIndex = previewAttachment
    ? attachments.findIndex((a) => a.id === previewAttachment.id)
    : -1;

  const handlePrevPreview = () => {
    if (previewIndex > 0) {
      setPreviewAttachment(attachments[previewIndex - 1]);
      setPreviewZoom(1);
    }
  };

  const handleNextPreview = () => {
    if (previewIndex < attachments.length - 1) {
      setPreviewAttachment(attachments[previewIndex + 1]);
      setPreviewZoom(1);
    }
  };

  return (
    <div
      id="test-case-solution-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-fadeIn overflow-y-auto"
    >
      <div
        id="test-case-solution-modal"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full my-auto overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 bg-purple-100 text-purple-700 rounded-lg">
              <FileText className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                Test Case Details &amp; Solution -{' '}
                <span className="text-purple-700 font-mono">
                  [{testCase.testCaseId || 'TC1'}]
                </span>
              </h2>
              {ticket && (
                <p className="text-[11px] text-slate-500 truncate max-w-md">
                  Ticket #{ticket.ticketNumber} • {ticket.featureName} ({ticket.moduleName})
                </p>
              )}
            </div>
          </div>
          <button
            id="close-solution-modal-btn"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {notification && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg flex items-center gap-2 font-medium animate-fadeIn">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{notification}</span>
            </div>
          )}

          {/* Quick Paste Solution Card */}
          <div className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-purple-950 font-bold text-xs">
                <ClipboardPaste className="w-4 h-4 text-purple-600" />
                <span>Quick Paste Requirement / Point</span>
              </div>
              <button
                id="auto-fill-clipboard-btn"
                type="button"
                onClick={handleAutoFillFromClipboard}
                disabled={isAiGenerating}
                className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white font-bold text-[11px] rounded-md transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                <span>{isAiGenerating ? 'AI Generating...' : 'Auto-fill Fields'}</span>
              </button>
            </div>
            <textarea
              id="clipboard-solution-textarea"
              rows={2}
              value={clipboardText}
              onChange={(e) => setClipboardText(e.target.value)}
              placeholder="e.g. 1) Gl code me jo new fiels add hui h wo sab editable hona chahiye .. (Paste or write any Hindi/Hinglish/English point, then click 'Auto-fill Fields')"
              className="w-full p-2.5 bg-white border border-purple-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500 resize-y"
            />
          </div>

          {/* Test Scenario with AI Generate Button */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800 block text-xs">
                Test Scenario (Short &amp; Understandable)
              </label>
              <button
                id="auto-generate-all-fields-ai-btn"
                type="button"
                onClick={handleAutoGenerateWithAi}
                disabled={isAiGenerating}
                className="px-2.5 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-[11px] rounded-md transition-all shadow-2xs cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                <span>
                  {isAiGenerating ? 'AI Generating...' : 'Polish with AI'}
                </span>
              </button>
            </div>
            <input
              id="solution-modal-scenario-input"
              type="text"
              value={scenario}
              onChange={(e) => setScenario(e.target.value)}
              placeholder="e.g. Verify that all newly added GL Code configuration fields are editable and allow updates."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white font-medium"
            />
          </div>

          {/* Test Cases (Normal single verification statement) */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-800 block text-xs">
              Test Case (Verification Statement)
            </label>
            <textarea
              id="solution-modal-steps-textarea"
              rows={2}
              value={testCasesText}
              onChange={(e) => setTestCasesText(e.target.value)}
              placeholder="e.g. Verify that all newly added fields in the GL Code section are editable, accept user modifications, and save updated values without validation errors."
              className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white resize-y"
            />
          </div>

          {/* Expected Result */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-800 block text-xs">
              Expected Result (Bulleted Points)
            </label>
            <textarea
              id="solution-modal-expected-textarea"
              rows={3}
              value={expectedResult}
              onChange={(e) => setExpectedResult(e.target.value)}
              placeholder="• All newly added GL Code configuration fields are enabled and allow user input.&#10;• System accepts valid modifications to GL Code values without constraint errors.&#10;• Upon saving, updated GL Code values are accurately stored and reflected in the system."
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white resize-y font-mono text-[11.5px]"
            />
          </div>

          {/* Two-Column Grid: Actual Result & Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 items-start">
            {/* Left: Actual Result (2 cols) */}
            <div className="md:col-span-2 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-800 block text-xs">
                  Actual Result (Editable)
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setActualResult('Verified successfully in accordance with expected specifications.')
                  }
                  className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200 cursor-pointer"
                  title="Click to reset to default pass result"
                >
                  Defaults to Pass
                </button>
              </div>
              <textarea
                id="solution-modal-actual-textarea"
                rows={2}
                value={actualResult}
                onChange={(e) => setActualResult(e.target.value)}
                placeholder="Verified successfully. All newly added GL Code fields are fully editable, user inputs are accepted without error, and updated configurations are saved accurately."
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white resize-y"
              />
            </div>

            {/* Right: Execution Status */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-800 block text-xs">
                Execution Status
              </label>
              <div className="relative">
                <select
                  id="solution-modal-status-select"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white cursor-pointer"
                >
                  <option value="pass">🟢 Pass</option>
                  <option value="fail">🔴 Fail</option>
                  <option value="blocked">🟠 Blocked</option>
                  <option value="not run">⚪ Not Run</option>
                </select>
              </div>

              <div
                className={`p-2 rounded-lg border flex items-center gap-1.5 text-[11px] font-semibold ${
                  status === 'pass'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : status === 'fail'
                    ? 'bg-red-50 border-red-200 text-red-800'
                    : status === 'blocked'
                    ? 'bg-amber-50 border-amber-200 text-amber-800'
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                {status === 'pass' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                {status === 'fail' && <AlertCircle className="w-3.5 h-3.5 text-red-600" />}
                {status === 'blocked' && <Ban className="w-3.5 h-3.5 text-amber-600" />}
                {status === 'not run' && <Clock className="w-3.5 h-3.5 text-slate-500" />}
                <span>
                  {status === 'pass'
                    ? 'Passed Execution'
                    : status === 'fail'
                    ? 'Defect Logged'
                    : status === 'blocked'
                    ? 'Blocked Execution'
                    : 'Not Executed Yet'}
                </span>
              </div>
            </div>
          </div>

          {/* Attached Files & Multiple Screenshots Section */}
          <div className="space-y-2.5 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
                  <Paperclip className="w-3.5 h-3.5 text-blue-600" />
                  <span>Test Evidence / Screenshots</span>
                </label>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    attachments.length > 0
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {attachments.length} attached
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClipboardPasteClick}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-md text-[11px] font-semibold transition-colors cursor-pointer"
                  title="Paste screenshot directly from clipboard (Ctrl+V)"
                >
                  <ClipboardPaste className="w-3.5 h-3.5 text-purple-600" />
                  <span>Paste Screenshot (Ctrl+V)</span>
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-md text-[11px] font-semibold transition-colors cursor-pointer"
                  title="Select and attach multiple files or screenshots"
                >
                  <Upload className="w-3.5 h-3.5 text-blue-600" />
                  <span>Add Multiple Screenshots</span>
                </button>
              </div>
            </div>

            {/* Hidden Multiple File Input */}
            <input
              type="file"
              ref={fileInputRef}
              multiple
              accept="image/*,.xlsx,.xls,.csv,.docx,.doc,.txt,.pdf"
              className="hidden"
              onChange={(e) => {
                handleFileUpload(e.target.files);
                if (e.target) e.target.value = '';
              }}
            />

            {/* Drag and Drop Zone */}
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
              className={`border-2 border-dashed rounded-xl p-3 flex items-center justify-between gap-3 cursor-pointer transition-all ${
                isDragging
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-300 bg-slate-50/70 hover:bg-slate-50 hover:border-blue-400'
              }`}
            >
              <div className="flex items-center gap-2.5 text-xs text-slate-600">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-semibold text-slate-800 block text-[11.5px]">
                    Drop multiple screenshots or files here, or press <strong>Ctrl+V</strong> to paste
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    Supports selecting multiple PNG, JPG, WebP, PDF, or Excel sheets simultaneously
                  </span>
                </div>
              </div>
              <span className="text-[11px] font-bold text-blue-700 bg-blue-100 hover:bg-blue-200 px-3 py-1 rounded-lg shrink-0">
                Browse Files
              </span>
            </div>

            {/* List of Attachments with Thumbnail & Preview Option */}
            {attachments.length > 0 ? (
              <div className="space-y-1.5 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {attachments.map((att, idx) => {
                    const isImg =
                      att.url?.startsWith('data:image') ||
                      att.url?.includes('.png') ||
                      att.url?.includes('.jpg') ||
                      att.url?.includes('.jpeg') ||
                      att.url?.includes('.webp');

                    return (
                      <div
                        key={att.id}
                        className="flex items-center justify-between gap-2 p-2 bg-white border border-slate-200 hover:border-blue-400 rounded-xl text-xs group shadow-2xs transition-all"
                      >
                        <div
                          className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1"
                          onClick={() => {
                            setPreviewAttachment(att);
                            setPreviewZoom(1);
                          }}
                          title="Click to preview screenshot"
                        >
                          {isImg ? (
                            <div className="relative w-11 h-11 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shrink-0 group-hover:ring-2 group-hover:ring-blue-400 transition-all">
                              <img
                                src={att.url}
                                alt={att.name}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                                <Eye className="w-3.5 h-3.5" />
                              </div>
                            </div>
                          ) : (
                            <div className="w-11 h-11 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 shrink-0">
                              <FileText className="w-5 h-5" />
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <span className="font-bold text-slate-800 block truncate text-[11px]" title={att.name}>
                              {idx + 1}. {att.name}
                            </span>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                              {att.size && <span>{att.size}</span>}
                              <span>•</span>
                              <span className="text-blue-600 font-medium">Click to preview</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setPreviewAttachment(att);
                              setPreviewZoom(1);
                            }}
                            title="Preview Screenshot"
                            className="inline-flex items-center gap-1 px-2 py-1 text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md font-semibold text-[10.5px] cursor-pointer transition-colors"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Preview</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveAttachment(att.id)}
                            title="Remove attachment"
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md cursor-pointer transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 italic">No screenshots or evidence files attached yet. You can attach multiple screenshots by clicking Browse or pressing Ctrl+V.</p>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 border-t border-slate-200 shrink-0">
          <span className="text-[11px] text-slate-500">
            Click <strong>Save Changes</strong> to update the test case row
          </span>
          <div className="flex items-center gap-2.5">
            <button
              id="solution-modal-cancel-btn"
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="solution-modal-save-btn"
              type="button"
              onClick={handleSave}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Changes / Update Test Case</span>
            </button>
          </div>
        </div>
      </div>

      {/* Screenshot Full Preview Modal with Zoom, Navigation & Download */}
      {previewAttachment && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 animate-fadeIn"
          onClick={() => {
            setPreviewAttachment(null);
            setPreviewZoom(1);
          }}
        >
          <div
            className="bg-white rounded-2xl max-w-4xl max-h-[90vh] w-full overflow-hidden flex flex-col shadow-2xl animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Preview Modal Header */}
            <div className="p-3.5 bg-slate-900 text-white border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className="p-1 bg-blue-600 rounded">
                  <Eye className="w-4 h-4 text-white" />
                </span>
                <div className="min-w-0">
                  <span className="font-bold text-xs text-white block truncate max-w-sm">
                    {previewAttachment.name}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {previewIndex >= 0 ? `Screenshot ${previewIndex + 1} of ${attachments.length}` : 'Preview'}
                    {previewAttachment.size ? ` • ${previewAttachment.size}` : ''}
                  </span>
                </div>
              </div>

              {/* Preview Controls */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPreviewZoom((z) => Math.max(0.5, z - 0.25))}
                  title="Zoom Out"
                  className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewZoom(1)}
                  title="Reset Zoom"
                  className="px-2 py-1 text-[11px] font-mono text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  {Math.round(previewZoom * 100)}%
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewZoom((z) => Math.min(3, z + 0.25))}
                  title="Zoom In"
                  className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>

                {previewAttachment.url && (
                  <a
                    href={previewAttachment.url}
                    download={previewAttachment.name || 'screenshot.png'}
                    title="Download Screenshot"
                    className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer ml-1"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => handleRemoveAttachment(previewAttachment.id)}
                  title="Delete this attachment"
                  className="p-1.5 text-red-400 hover:text-red-300 hover:bg-slate-800 rounded-lg cursor-pointer ml-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <div className="w-px h-5 bg-slate-700 mx-1" />

                <button
                  onClick={() => {
                    setPreviewAttachment(null);
                    setPreviewZoom(1);
                  }}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer"
                  title="Close preview (Esc)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Preview Image Body with Nav Buttons */}
            <div className="relative p-4 flex items-center justify-center overflow-auto max-h-[78vh] min-h-[300px] bg-slate-950/95">
              {/* Prev Button */}
              {attachments.length > 1 && (
                <button
                  type="button"
                  disabled={previewIndex <= 0}
                  onClick={handlePrevPreview}
                  className={`absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 text-white hover:bg-black/90 transition-all z-10 ${
                    previewIndex <= 0 ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'
                  }`}
                  title="Previous Screenshot"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              )}

              {/* Display Image */}
              {previewAttachment.url ? (
                <div className="overflow-auto max-h-[74vh] flex items-center justify-center">
                  <img
                    src={previewAttachment.url}
                    alt={previewAttachment.name}
                    style={{ transform: `scale(${previewZoom})`, transformOrigin: 'center center' }}
                    className="max-h-[70vh] max-w-full rounded-lg object-contain shadow-2xl transition-transform duration-150"
                  />
                </div>
              ) : (
                <p className="text-slate-400 text-xs">No preview available for this file type.</p>
              )}

              {/* Next Button */}
              {attachments.length > 1 && (
                <button
                  type="button"
                  disabled={previewIndex >= attachments.length - 1}
                  onClick={handleNextPreview}
                  className={`absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 text-white hover:bg-black/90 transition-all z-10 ${
                    previewIndex >= attachments.length - 1 ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'
                  }`}
                  title="Next Screenshot"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              )}
            </div>

            {/* Preview Modal Footer */}
            <div className="px-4 py-2.5 bg-slate-900 text-slate-400 text-[11px] border-t border-slate-800 flex items-center justify-between">
              <span>
                Screenshot {previewIndex + 1} of {attachments.length}
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setPreviewAttachment(null);
                    setPreviewZoom(1);
                  }}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-md transition-colors cursor-pointer"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
