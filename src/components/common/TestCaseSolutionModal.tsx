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
  ImageIcon,
  FileSpreadsheet,
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

  // Modal paste listener for screenshots
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      // Don't intercept if user is typing text in textareas or inputs
      const activeEl = document.activeElement;
      const isInput = activeEl?.tagName === 'INPUT' || activeEl?.tagName === 'TEXTAREA';
      
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            // If they are pasting an image, handle it as screenshot
            e.preventDefault();
            const reader = new FileReader();
            reader.onload = (event) => {
              const url = event.target?.result as string;
              const newAtt: FileAttachment = {
                id: `pasted-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                name: `pasted_screenshot_${Date.now()}.png`,
                url,
                size: `${Math.round(file.size / 1024)} KB`,
                uploadedAt: new Date().toLocaleDateString(),
              };
              setAttachments((prev) => [...prev, newAtt]);
              showToast('✅ Pasted screenshot attached to test case!');
            };
            reader.readAsDataURL(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
    showToast('Attachment removed.');
  };

  const handleFileUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;
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
        showToast(`Uploaded "${file.name}"`);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleClipboardPasteClick = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.read) {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          for (const type of item.types) {
            if (type.startsWith('image/')) {
              const blob = await item.getType(type);
              const reader = new FileReader();
              reader.onload = (e) => {
                const url = e.target?.result as string;
                const newAtt: FileAttachment = {
                  id: `pasted-${Date.now()}`,
                  name: `pasted_screenshot_${Date.now()}.png`,
                  url,
                  size: `${Math.round(blob.size / 1024)} KB`,
                  uploadedAt: new Date().toLocaleDateString(),
                };
                setAttachments((prev) => [...prev, newAtt]);
                showToast('✅ Screenshot pasted from clipboard!');
              };
              reader.readAsDataURL(blob);
              return;
            }
          }
        }
        showToast('No image in clipboard. Use Ctrl+V or copy an image first.');
      } else {
        showToast('Press Ctrl+V to paste screenshot.');
      }
    } catch {
      showToast('Clipboard permission blocked. Press Ctrl+V directly to paste.');
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
          rawCommand: textToProcess,
          context: 'qa_solution_modal',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.result) {
          if (data.result.scenario) setScenario(data.result.scenario);
          if (data.result.testCases) setTestCasesText(data.result.testCases);
          if (data.result.expectedResult) setExpectedResult(data.result.expectedResult);
          if (data.result.actualResult) setActualResult(data.result.actualResult);
          setStatus('pass');
          showToast('Fields successfully generated with AI in concise standard!');
          setIsAiGenerating(false);
          return;
        }
      }
    } catch {
      // Fall through to deterministic local generator
    }

    // Local deterministic generator
    const parsed = parseQuickPasteSolution(textToProcess);
    if (parsed.scenario) setScenario(parsed.scenario);
    if (parsed.testCases) setTestCasesText(parsed.testCases);
    if (parsed.expectedResult) setExpectedResult(parsed.expectedResult);
    if (parsed.actualResult) setActualResult(parsed.actualResult);
    setStatus('pass');
    setIsAiGenerating(false);
    showToast('Fields successfully auto-filled from requirement point!');
  };

  const handleAutoGenerateWithAi = async () => {
    const baseText = scenario.trim() || clipboardText.trim() || ticket?.featureName || 'Verification Point';
    setIsAiGenerating(true);

    try {
      const res = await fetch('/api/ai/convert-language-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawCommand: baseText,
          context: 'qa_solution_modal',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.result) {
          if (data.result.scenario) setScenario(data.result.scenario);
          if (data.result.testCases) setTestCasesText(data.result.testCases);
          if (data.result.expectedResult) setExpectedResult(data.result.expectedResult);
          if (data.result.actualResult) setActualResult(data.result.actualResult);
          setStatus('pass');
          showToast('ChatGPT-style test case generated successfully!');
          setIsAiGenerating(false);
          return;
        }
      }
    } catch {
      // Fallback
    }

    const generated = generateTestCaseFieldsWithAi(baseText, ticket);
    setScenario(generated.scenario);
    setTestCasesText(generated.testCases);
    setExpectedResult(generated.expectedResult);
    setActualResult(generated.actualResult);
    setStatus('pass');
    setIsAiGenerating(false);
    showToast('ChatGPT-style test case generated successfully!');
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
                <span>{isAiGenerating ? 'Formatting...' : 'Auto-fill Fields'}</span>
              </button>
            </div>
            <textarea
              id="clipboard-solution-textarea"
              rows={2}
              value={clipboardText}
              onChange={(e) => setClipboardText(e.target.value)}
              placeholder="Paste your point here (e.g. Undoing a Split In action from the transaction history of the Split In deal should also automatically undo the corresponding Split Out action...) then click 'Auto-fill Fields'..."
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
              placeholder="e.g. Validate Undo functionality for Split In action from transaction history."
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
              placeholder="e.g. Verify that when the Split In action is undone from the transaction history of the Split In deal, the corresponding Split Out action is also automatically undone in the related existing deal, and vice versa."
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
              placeholder="• Undoing the Split In action should automatically undo the corresponding Split Out action in the related deal.&#10;• Similarly, undoing the Split Out action should automatically undo the corresponding Split In action.&#10;• Both related split actions remain synchronized."
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white resize-y"
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
                <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Defaults to Pass
                </span>
              </div>
              <textarea
                id="solution-modal-actual-textarea"
                rows={2}
                value={actualResult}
                onChange={(e) => setActualResult(e.target.value)}
                placeholder="e.g. Undoing the Split In action successfully undid the corresponding Split Out action in the related deal, and vice versa."
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white resize-y"
              />
            </div>

            {/* Right: Execution Status Dropdown (1 col) */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-800 block text-xs">
                Execution Status
              </label>
              <div className="relative">
                <select
                  id="solution-modal-status-select"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-2xs"
                >
                  <option value="pass">🟢 Pass</option>
                  <option value="fail">🔴 Fail</option>
                  <option value="blocked">🟠 Blocked</option>
                  <option value="not run">⚪ Not Run</option>
                </select>
              </div>
              <div className="mt-2 p-2 rounded-lg text-[11px] font-medium flex items-center gap-1.5 border">
                {status === 'pass' && (
                  <span className="text-emerald-700 bg-emerald-50 w-full py-1 px-2 rounded flex items-center gap-1.5 border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Passed Execution
                  </span>
                )}
                {status === 'fail' && (
                  <span className="text-red-700 bg-red-50 w-full py-1 px-2 rounded flex items-center gap-1.5 border border-red-200">
                    <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                    Failed Execution
                  </span>
                )}
                {status === 'blocked' && (
                  <span className="text-amber-700 bg-amber-50 w-full py-1 px-2 rounded flex items-center gap-1.5 border border-amber-200">
                    <Ban className="w-3.5 h-3.5 text-amber-600" />
                    Blocked
                  </span>
                )}
                {status === 'not run' && (
                  <span className="text-slate-600 bg-slate-100 w-full py-1 px-2 rounded flex items-center gap-1.5 border border-slate-200">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    Not Run Yet
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Attached Files & Screenshots Section */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
                <Paperclip className="w-3.5 h-3.5 text-blue-600" />
                <span>Test Evidence / Screenshots ({attachments.length})</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClipboardPasteClick}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded text-[11px] font-semibold transition-colors cursor-pointer"
                  title="Paste screenshot directly from clipboard (Ctrl+V)"
                >
                  <ClipboardPaste className="w-3 h-3" />
                  <span>📋 Paste Screenshot (Ctrl+V)</span>
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded text-[11px] font-semibold transition-colors cursor-pointer"
                >
                  <Upload className="w-3 h-3" />
                  <span>Upload File</span>
                </button>
              </div>
            </div>

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
              className={`border border-dashed rounded-xl p-2.5 flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                isDragging
                  ? 'border-blue-500 bg-blue-50/60'
                  : 'border-slate-300 bg-slate-50/80 hover:bg-slate-50 hover:border-blue-400'
              }`}
            >
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <Upload className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="font-medium text-[11px]">
                  Drop screenshots or files here, or press <strong>Ctrl+V</strong> to paste
                </span>
              </div>
              <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                Browse
              </span>
            </div>

            {/* List of Attachments with Thumbnail & Remove Option */}
            {attachments.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center justify-between gap-2 p-2 bg-slate-50 border border-slate-200 hover:border-blue-300 rounded-lg text-xs group transition-all"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {att.url?.startsWith('data:image') || att.url?.includes('.png') || att.url?.includes('.jpg') || att.url?.includes('.jpeg') ? (
                        <img
                          src={att.url}
                          alt={att.name}
                          onClick={() => setPreviewAttachment(att)}
                          className="w-8 h-8 rounded object-cover border border-slate-200 shrink-0 cursor-pointer hover:opacity-85"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded bg-blue-100 flex items-center justify-center text-blue-700 shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <span className="font-bold text-slate-800 block truncate text-[11px]" title={att.name}>
                          {att.name}
                        </span>
                        {att.size && <span className="text-[10px] text-slate-400 block">{att.size}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setPreviewAttachment(att)}
                        title="Preview screenshot"
                        className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-blue-600" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(att.id)}
                        title="Remove screenshot"
                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 italic">No screenshots or files attached yet.</p>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 border-t border-slate-200 shrink-0">
          <span className="text-[11px] text-slate-500">
            Click <strong>Save Changes</strong> to update the table row
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

      {/* Attachment Full Preview Modal */}
      {previewAttachment && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-fadeIn"
          onClick={() => setPreviewAttachment(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-3xl max-h-[85vh] w-full overflow-hidden flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
              <span className="font-bold text-xs text-slate-800 truncate">{previewAttachment.name}</span>
              <button
                onClick={() => setPreviewAttachment(null)}
                className="p-1 text-slate-500 hover:text-slate-800 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 flex items-center justify-center overflow-auto max-h-[75vh] bg-slate-900/5">
              {previewAttachment.url ? (
                <img
                  src={previewAttachment.url}
                  alt={previewAttachment.name}
                  className="max-h-[70vh] max-w-full rounded object-contain"
                />
              ) : (
                <p className="text-slate-500 text-xs">No image preview available.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
