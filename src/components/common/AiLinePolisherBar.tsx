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
  const [generatedCases, setGeneratedCases] = useState<any[]>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [addedNotice, setAddedNotice] = useState<string | null>(null);

  const samplePresets = [
    {
      title: 'FD Rollover TDS (Bullet & Coupon)',
      text: 'FD rollover ka ek ticket hai jisme bullet interest and coupon interest dono pe TDS accounting me reflect hona chahiye aur actual result pass consider krna hai',
    },
    {
      title: 'GL Codes & Visibility',
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
      setGeneratedCases([]);
    } catch (err) {
      console.error('Failed to polish text:', err);
    } finally {
      setIsPolishingDesc(false);
    }
  };

  // Action 2: Generate Full Structured Test Cases (Like ChatGPT)
  const handleGenerateTestCase = async () => {
    if (!inputText.trim() || isGeneratingTestCase) return;
    setIsGeneratingTestCase(true);
    try {
      const result = await processLanguageCommand(inputText, currentModule, currentTicketNo);
      const allCases = (result.structuredTestCases && result.structuredTestCases.length > 0)
        ? result.structuredTestCases
        : (result.structuredTestCase ? [result.structuredTestCase] : []);

      setGeneratedCases(allCases);
      if (result.structuredTestCase) {
        setGeneratedCase(result.structuredTestCase);
      } else if (allCases.length > 0) {
        setGeneratedCase(allCases[0]);
      }
      setPolishedResult(result.englishText);
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

  const handleAddSingleCaseDirectly = (c: any) => {
    if (!c || !onAddTestCase) return;

    const newTC: TestCaseItem = {
      id: `ai-quick-tc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      testCaseId: c.testCaseId || 'TC_NEW',
      testModule: currentModule || 'Treasury Master',
      featureTab: 'Transaction History',
      testScenario: c.testScenario,
      testCases: c.testCases,
      testInputs: c.testInputs || 'Verified with live inputs',
      expectedResult: c.expectedResult,
      actualResult: c.actualResult || 'Verified successfully in accordance with expected specifications (Pass).',
      status: 'pass',
      reviewStatus: 'Draft',
      version: '1.0',
      isAiGenerated: true,
      createdBy: creatorName,
      authorRole: creatorRole,
      createdAt: new Date().toLocaleDateString(),
    };

    onAddTestCase(newTC);
    setAddedNotice(`✅ Added "${c.testScenario.slice(0, 35)}..." to table!`);
    setTimeout(() => setAddedNotice(null), 3000);
  };

  const handleAddAllCasesDirectly = () => {
    if (!generatedCases || generatedCases.length === 0 || !onAddTestCase) return;

    generatedCases.forEach((c, idx) => {
      const newTC: TestCaseItem = {
        id: `ai-quick-tc-${Date.now()}-${idx}`,
        testCaseId: c.testCaseId || `TC_NEW_${idx + 1}`,
        testModule: currentModule || 'Treasury Master',
        featureTab: 'Transaction History',
        testScenario: c.testScenario,
        testCases: c.testCases,
        testInputs: c.testInputs || 'Verified with live inputs',
        expectedResult: c.expectedResult,
        actualResult: c.actualResult || 'Verified successfully in accordance with expected specifications (Pass).',
        status: 'pass',
        reviewStatus: 'Draft',
        version: '1.0',
        isAiGenerated: true,
        createdBy: creatorName,
        authorRole: creatorRole,
        createdAt: new Date().toLocaleDateString(),
      };
      onAddTestCase(newTC);
    });

    setAddedNotice(`✅ Added all ${generatedCases.length} test cases to table!`);
    setTimeout(() => setAddedNotice(null), 3500);
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

          {/* Result 2: Full Structured Test Cases Display (Matches User's GPT Screenshot 2) */}
          {generatedCases.length > 1 ? (
            <div className="mt-3 bg-slate-900/90 border border-purple-500/40 rounded-xl p-3.5 space-y-3 animate-in fade-in">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                    ChatGPT / Gemini QA Suite
                  </span>
                  <h4 className="text-xs font-bold text-white">
                    Generated {generatedCases.length} Corporate QA Test Cases
                  </h4>
                </div>
                <div className="flex items-center gap-2">
                  {onAddTestCase && (
                    <button
                      onClick={handleAddAllCasesDirectly}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm cursor-pointer transition-all active:scale-95"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>➕ Add All ({generatedCases.length} Cases) to Table</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      const allText = generatedCases
                        .map(
                          (c, i) =>
                            `Case ${i + 1}: ${c.testScenario}\nSteps: ${c.testCases}\nExpected: ${c.expectedResult}\nActual: ${c.actualResult || 'Pass'}\n`
                        )
                        .join('\n---\n\n');
                      handleCopy(allText, 'allCases');
                    }}
                    className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800 border border-slate-700 cursor-pointer"
                  >
                    {copiedKey === 'allCases' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === 'allCases' ? 'Copied!' : 'Copy All'}</span>
                  </button>
                </div>
              </div>

              {addedNotice && (
                <div className="p-2 rounded bg-emerald-950/60 border border-emerald-500/40 text-xs text-emerald-300 font-medium">
                  {addedNotice}
                </div>
              )}

              {/* Multi-case listing */}
              <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                {generatedCases.map((c, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-950/70 border border-slate-800 hover:border-slate-700 rounded-lg p-3 space-y-2 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-indigo-900/60 text-indigo-300 text-[11px] font-bold flex items-center justify-center border border-indigo-700/50">
                          {idx + 1}
                        </span>
                        <h5 className="text-xs font-bold text-slate-100">{c.testScenario}</h5>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                          {c.validationScenario || 'Positive Workflow'}
                        </span>
                        {onAddTestCase && (
                          <button
                            onClick={() => handleAddSingleCaseDirectly(c)}
                            className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold rounded flex items-center gap-1 cursor-pointer transition-colors"
                            title="Add this single test case to table"
                          >
                            <PlusCircle className="w-3 h-3" />
                            <span>Add</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px]">
                      <div className="bg-slate-900/60 p-2 rounded border border-slate-800/80">
                        <span className="text-[10px] font-bold text-slate-400 block mb-0.5">Steps</span>
                        <p className="text-slate-300">{c.testCases}</p>
                      </div>
                      <div className="bg-slate-900/60 p-2 rounded border border-slate-800/80">
                        <span className="text-[10px] font-bold text-emerald-400 block mb-0.5">Expected Result</span>
                        <p className="text-slate-300 whitespace-pre-line">{c.expectedResult}</p>
                      </div>
                      <div className="bg-slate-900/60 p-2 rounded border border-slate-800/80">
                        <span className="text-[10px] font-bold text-blue-400 block mb-0.5">Actual Result (Pass)</span>
                        <p className="text-slate-300">
                          {c.actualResult || 'Verified successfully in local build: functioning as per specification (Pass).'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : generatedCase ? (
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
                    {generatedCase.actualResult || 'Verified successfully in local build: functioning as per specification (Pass).'}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center justify-between pt-1 border-t border-slate-800">
                <div className="flex items-center gap-2">
                  {onAddTestCase && (
                    <button
                      onClick={() => handleAddSingleCaseDirectly(generatedCase)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm cursor-pointer transition-all active:scale-95"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>{addedNotice ? addedNotice : '➕ Add to Test Cases Table'}</span>
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
                    {addedNotice}
                  </span>
                )}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
