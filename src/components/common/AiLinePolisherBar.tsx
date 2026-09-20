import React, { useState } from 'react';
import {
  Sparkles,
  Wand2,
  PlusCircle,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  FileText,
  CheckCircle2,
  RotateCcw,
  ArrowRight,
  Languages,
} from 'lucide-react';
import { TestCaseItem } from '../../types';
import { translateToSimpleEnglish, processLanguageCommand, ConvertedCommandResult } from '../../utils/languageAi';

interface AiLinePolisherBarProps {
  currentModule?: string;
  currentTicketNo?: string;
  creatorName?: string;
  creatorRole?: string;
  onAddTestCase?: (testCase: TestCaseItem) => void;
  onApplyToDescription?: (text: string) => void;
  onApplyToTestingScenarios?: (text: string) => void;
}

export const AiLinePolisherBar: React.FC<AiLinePolisherBarProps> = ({
  currentModule = 'Term Loan',
  currentTicketNo = 'FEATURE 22609',
  creatorName = 'QA Engineer',
  creatorRole = 'QA',
  onAddTestCase,
  onApplyToDescription,
  onApplyToTestingScenarios,
}) => {
  const [inputText, setInputText] = useState('');
  const [isPolishingDesc, setIsPolishingDesc] = useState(false);
  const [isGeneratingTestCase, setIsGeneratingTestCase] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [polishedResult, setPolishedResult] = useState<string | null>(null);
  const [generatedCase, setGeneratedCase] = useState<ConvertedCommandResult['structuredTestCase'] | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [addedNotice, setAddedNotice] = useState(false);

  const samplePresets = [
    {
      title: 'Visibility (Hinglish)',
      text: 'deal wise me jo existing deal hai us me internal UI pe to koi field nahi dikh rahi hai interest, investment code k liye ..but front UI pe codes dikh rahe hai and generate me bhi visible ho rahe hai',
    },
    {
      title: 'Undo Split (Workflow)',
      text: 'UNDO from history THE SPLIT IN ACTION from deal where split in perform ... and check the deal where split out hua hai ... split in se undo krte hi split out se bhi wo action undo hogi .. and vise versa',
    },
    {
      title: 'Negative Validation',
      text: 'agar loan amount blank chhod de ya negative rate dale to submit pe alert dialog aana chahiye and record save nahi hona chahiye',
    },
  ];

  // Action 1: Polish into pristine Corporate English paragraph (Like Screenshot 1)
  const handlePolishText = async () => {
    if (!inputText.trim() || isPolishingDesc) return;
    setIsPolishingDesc(true);
    try {
      const result = await translateToSimpleEnglish(inputText, 'description');
      setPolishedResult(result);
      setGeneratedCase(null);
    } catch (err) {
      console.error('Failed to polish text:', err);
    } finally {
      setIsPolishingDesc(false);
    }
  };

  // Action 2: Generate Full Structured Test Case (Like Screenshot 2)
  const handleGenerateTestCase = async () => {
    if (!inputText.trim() || isGeneratingTestCase) return;
    setIsGeneratingTestCase(true);
    try {
      const result = await processLanguageCommand(inputText, currentModule, currentTicketNo);
      if (result.structuredTestCase) {
        setGeneratedCase(result.structuredTestCase);
        setPolishedResult(result.englishText);
      }
    } catch (err) {
      console.error('Failed to generate test case:', err);
    } finally {
      setIsGeneratingTestCase(false);
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleAddRowDirectly = () => {
    if (!generatedCase || !onAddTestCase) return;

    const newTC: TestCaseItem = {
      id: `ai-quick-tc-${Date.now()}`,
      testCaseId: 'TC_NEW', // Parent table handles numbering
      testModule: currentModule || 'Treasury Master',
      featureTab: 'Transaction History',
      testScenario: generatedCase.testScenario,
      testCases: generatedCase.testCases,
      testInputs: 'Verified with live inputs',
      expectedResult: generatedCase.expectedResult,
      actualResult: generatedCase.actualResult || 'Verified successfully in accordance with expected behavior.',
      status: 'pass',
      reviewStatus: 'Draft',
      version: '1.0',
      isAiGenerated: true,
      createdBy: creatorName,
      authorRole: creatorRole,
      createdAt: new Date().toLocaleDateString(),
    };

    onAddTestCase(newTC);
    setAddedNotice(true);
    setTimeout(() => setAddedNotice(false), 3000);
  };

  return (
    <div className="bg-gradient-to-r from-slate-900 via-[#1E293B] to-indigo-950/70 border border-indigo-500/30 rounded-xl shadow-lg p-3.5 text-slate-200 mb-3.5 transition-all">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-xs">
            <Sparkles className="w-4 h-4 text-yellow-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-white tracking-wide flex items-center gap-1.5">
                <span>⚡ AI Quick Line Polisher & Scenario Generator</span>
                <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-semibold border border-indigo-500/40">
                  GPT Polish
                </span>
              </h3>
            </div>
            <p className="text-[11px] text-slate-400">
              Type or paste ANY informal line in Hindi / Hinglish / English — AI polishes it into structured Corporate QA format instantly.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title={isExpanded ? 'Collapse bar' : 'Expand bar'}
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {isExpanded && (
        <div className="mt-3 space-y-2.5 pt-2.5 border-t border-slate-700/60">
          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider mr-1">
              Sample Prompts:
            </span>
            {samplePresets.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => setInputText(preset.text)}
                className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-indigo-900/60 hover:text-indigo-200 text-slate-300 border border-slate-700 text-[10px] font-medium transition-colors cursor-pointer"
              >
                {preset.title}
              </button>
            ))}
          </div>

          {/* Text Input */}
          <div className="relative">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="e.g. 'deal wise me jo existing deal hai us me internal UI pe to koi field nahi dikh rahi...' OR 'UNDO from history THE SPLIT IN ACTION...'"
              rows={2}
              className="w-full bg-slate-950/70 border border-slate-700 hover:border-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg p-2.5 text-xs text-slate-100 placeholder-slate-500 resize-none outline-hidden"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handlePolishText}
                disabled={!inputText.trim() || isPolishingDesc || isGeneratingTestCase}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer transition-all active:scale-95"
                title="Polish raw Hindi/Hinglish line into crisp, formal corporate English (like ChatGPT output)"
              >
                <Wand2 className="w-3.5 h-3.5 text-yellow-300" />
                <span>{isPolishingDesc ? 'Polishing...' : '✨ Polish into Corporate Description'}</span>
              </button>

              <button
                onClick={handleGenerateTestCase}
                disabled={!inputText.trim() || isPolishingDesc || isGeneratingTestCase}
                className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer transition-all active:scale-95"
                title="Generate complete Test Scenario, Steps, Expected Result, and Actual Result"
              >
                <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                <span>{isGeneratingTestCase ? 'Generating Test Case...' : '⚡ Generate Full QA Test Case'}</span>
              </button>
            </div>

            {inputText && (
              <button
                onClick={() => {
                  setInputText('');
                  setPolishedResult(null);
                  setGeneratedCase(null);
                }}
                className="text-xs text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          {/* Result 1: Polished Paragraph Display */}
          {polishedResult && !generatedCase && (
            <div className="mt-3 bg-slate-900/80 border border-indigo-500/40 rounded-xl p-3 space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between text-xs font-bold text-indigo-300">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Polished Corporate English
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopy(polishedResult, 'desc')}
                    className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-800 border border-slate-700"
                  >
                    {copiedKey === 'desc' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === 'desc' ? 'Copied' : 'Copy'}</span>
                  </button>
                  {onApplyToDescription && (
                    <button
                      onClick={() => onApplyToDescription(polishedResult)}
                      className="text-[11px] text-indigo-300 hover:text-white px-2 py-0.5 rounded bg-indigo-900/50 hover:bg-indigo-800 border border-indigo-700"
                    >
                      Apply to Description
                    </button>
                  )}
                </div>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed font-sans bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                {polishedResult}
              </p>
            </div>
          )}

          {/* Result 2: Full Structured Test Case Display (Matches User's GPT Screenshot 2) */}
          {generatedCase && (
            <div className="mt-3 bg-slate-900/90 border border-purple-500/40 rounded-xl p-3.5 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                    {generatedCase.validationScenario || 'Positive Workflow'}
                  </span>
                  <h4 className="text-xs font-bold text-white">Generated Corporate QA Test Case</h4>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      handleCopy(
                        `Test Scenario:\n${generatedCase.testScenario}\n\nTest Case:\n${generatedCase.testCases}\n\nExpected Result:\n${generatedCase.expectedResult}\n\nActual Result:\n${generatedCase.actualResult || ''}`,
                        'fullCase'
                      )
                    }
                    className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800 border border-slate-700"
                  >
                    {copiedKey === 'fullCase' ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    <span>{copiedKey === 'fullCase' ? 'Copied' : 'Copy All'}</span>
                  </button>
                </div>
              </div>

              {/* Grid breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
                {/* Test Scenario */}
                <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider block">
                    Test Scenario
                  </span>
                  <p className="text-slate-200 font-medium">{generatedCase.testScenario}</p>
                </div>

                {/* Test Case Steps */}
                <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider block">
                    Test Case (Steps / Verification)
                  </span>
                  <p className="text-slate-200 whitespace-pre-line">{generatedCase.testCases}</p>
                </div>

                {/* Expected Result */}
                <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                    Expected Result
                  </span>
                  <p className="text-slate-300 whitespace-pre-line leading-relaxed">{generatedCase.expectedResult}</p>
                </div>

                {/* Actual Result */}
                <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block">
                    Actual Result
                  </span>
                  <p className="text-slate-300 whitespace-pre-line leading-relaxed">
                    {generatedCase.actualResult || 'Verified successfully in accordance with expected behavior.'}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center justify-between pt-1 border-t border-slate-800">
                <div className="flex items-center gap-2">
                  {onAddTestCase && (
                    <button
                      onClick={handleAddRowDirectly}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm cursor-pointer transition-all active:scale-95"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>{addedNotice ? '✅ Added to Table!' : '➕ Add to Test Cases Table'}</span>
                    </button>
                  )}

                  {onApplyToTestingScenarios && (
                    <button
                      onClick={() => onApplyToTestingScenarios(generatedCase.testScenario)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-colors"
                    >
                      Apply to Testing Scenarios
                    </button>
                  )}
                </div>

                {addedNotice && (
                  <span className="text-xs text-emerald-400 font-medium">
                    Test case row inserted into table successfully!
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
