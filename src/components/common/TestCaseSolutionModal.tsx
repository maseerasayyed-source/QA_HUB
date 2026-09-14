import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  ClipboardPaste,
  Save,
  Check,
  FileText,
  HelpCircle,
} from 'lucide-react';
import { TestCaseItem, TicketSummary } from '../../types';
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
  const [preconditions, setPreconditions] = useState(
    testCase.preconditions || 'Financial module setup and user permissions available.'
  );
  const [steps, setSteps] = useState(testCase.testCases || '');
  const [inputs, setInputs] = useState(testCase.testInputs || '');
  const [expectedResult, setExpectedResult] = useState(
    testCase.expectedResult || ''
  );
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [copiedNotification, setCopiedNotification] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (testCase) {
      setScenario(testCase.testScenario || '');
      setPreconditions(
        testCase.preconditions ||
          'Financial module setup and user permissions available.'
      );
      setSteps(testCase.testCases || '');
      setInputs(testCase.testInputs || '');
      setExpectedResult(testCase.expectedResult || '');
      setClipboardText('');
    }
  }, [testCase]);

  const handleAutoFillFromClipboard = () => {
    if (!clipboardText.trim()) {
      setCopiedNotification('Please paste text into the box first.');
      setTimeout(() => setCopiedNotification(null), 2500);
      return;
    }
    const parsed = parseQuickPasteSolution(clipboardText);
    if (parsed.scenario) setScenario(parsed.scenario);
    if (parsed.preconditions) setPreconditions(parsed.preconditions);
    if (parsed.steps) setSteps(parsed.steps);
    if (parsed.inputs) setInputs(parsed.inputs);
    if (parsed.expectedResult) setExpectedResult(parsed.expectedResult);

    setCopiedNotification('Fields successfully auto-filled from clipboard text!');
    setTimeout(() => setCopiedNotification(null), 3000);
  };

  const handleAutoGenerateWithAi = () => {
    setIsAiGenerating(true);
    setTimeout(() => {
      const generated = generateTestCaseFieldsWithAi(scenario, ticket);
      setScenario(generated.scenario);
      setPreconditions(generated.preconditions);
      setSteps(generated.steps);
      setInputs(generated.inputs);
      setExpectedResult(generated.expectedResult);
      setIsAiGenerating(false);
      setCopiedNotification('All fields generated with AI based on scenario & ticket!');
      setTimeout(() => setCopiedNotification(null), 3000);
    }, 450);
  };

  const handleSave = () => {
    onSave({
      testScenario: scenario,
      preconditions: preconditions,
      testCases: steps,
      testInputs: inputs,
      expectedResult: expectedResult,
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
                Test Case Solution &amp; Steps -{' '}
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
          {copiedNotification && (
            <div className="p-2.5 bg-purple-50 border border-purple-200 text-purple-900 rounded-lg flex items-center gap-2 font-medium animate-fadeIn">
              <Check className="w-4 h-4 text-purple-600 shrink-0" />
              <span>{copiedNotification}</span>
            </div>
          )}

          {/* Quick Paste Solution Card (Image 3 Top Section) */}
          <div className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-purple-950 font-bold text-xs">
                <ClipboardPaste className="w-4 h-4 text-purple-600" />
                <span>Quick Paste Solution from Clipboard (Ctrl+V)</span>
              </div>
              <button
                id="auto-fill-clipboard-btn"
                type="button"
                onClick={handleAutoFillFromClipboard}
                className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white font-bold text-[11px] rounded-md transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5"
              >
                <span>Auto-fill Fields</span>
              </button>
            </div>
            <textarea
              id="clipboard-solution-textarea"
              rows={2}
              value={clipboardText}
              onChange={(e) => setClipboardText(e.target.value)}
              placeholder="Paste copied solution text here (Scenario, Steps, Inputs, Expected) then click 'Auto-fill Fields'..."
              className="w-full p-2.5 bg-white border border-purple-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500 resize-y"
            />
          </div>

          {/* Test Scenario with AI Generate Button */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800 block text-xs">
                Test Scenario
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
                  {isAiGenerating
                    ? 'AI Generating Fields...'
                    : 'Auto-Generate All Fields with AI'}
                </span>
              </button>
            </div>
            <input
              id="solution-modal-scenario-input"
              type="text"
              value={scenario}
              onChange={(e) => setScenario(e.target.value)}
              placeholder="e.g. Penalty entries appear in the cashflow when overdue occurs after loan disbursement."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
            />
          </div>

          {/* Preconditions */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-800 block text-xs">
              Preconditions
            </label>
            <input
              id="solution-modal-preconditions-input"
              type="text"
              value={preconditions}
              onChange={(e) => setPreconditions(e.target.value)}
              placeholder="e.g. Financial module setup and user permissions available."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
            />
          </div>

          {/* Test Steps */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-800 block text-xs">
              Test Steps (Sequential 1. 2. 3...)
            </label>
            <textarea
              id="solution-modal-steps-textarea"
              rows={3}
              value={steps}
              onChange={(e) => setSteps(e.target.value)}
              placeholder="Sequential steps: 1. Open module... 2. Enter parameters... 3. Click submit..."
              className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white resize-y"
            />
          </div>

          {/* Two-Column Grid: Test Inputs & Expected Result */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Left: Test Inputs / Data */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-800 block text-xs">
                Test Inputs / Data
              </label>
              <textarea
                id="solution-modal-inputs-textarea"
                rows={3}
                value={inputs}
                onChange={(e) => setInputs(e.target.value)}
                placeholder="e.g. TL-23-24-00001\npenalty interest - 10%\npenalty principal - 10%"
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white resize-y"
              />
            </div>

            {/* Right: Expected Result */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-800 block text-xs">
                Expected Result
              </label>
              <textarea
                id="solution-modal-expected-textarea"
                rows={3}
                value={expectedResult}
                onChange={(e) => setExpectedResult(e.target.value)}
                placeholder="e.g. The cashflow should display the deal with penalty entries whenever overdue occurs..."
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white resize-y"
              />
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 border-t border-slate-200 shrink-0">
          <span className="text-[11px] text-slate-500">
            Press <strong>Ctrl+Enter</strong> or click Save to update table
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
    </div>
  );
};
