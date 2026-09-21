import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  Sparkles,
  Send,
  X,
  Bot,
  User,
  CheckCircle,
  FileSpreadsheet,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  Trash2,
  RotateCcw,
  ArrowDown,
  Loader2,
  FileCheck,
} from 'lucide-react';
import { TestCaseItem, TicketSummary, UserProfile } from '../types';
import { exportTestCasesToExcel } from '../utils/excelExport';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
  structuredCases?: any[];
}

interface GeminiQaChatbotProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: UserProfile | null;
  activeTicket?: TicketSummary | null;
  onApplyTestCases?: (ticketNo: string, newCases: TestCaseItem[]) => void;
}

const SAMPLE_ACCOUNTING_PROMPT = `currently me ek testing kr rahi hu,
accounting me jo Gl code ka column hai pahle wo deal wie accounting master se fetch hota tha ,
client ko har deal ka indivisual code create krna padta tha .. but ab Global accounting code master me humne wo fields add ki hai ...
is according ab accounting enteries me dikhega ...
ab me tujhe wo bhi scenarios point dungi us k hisab se mujhe test case proper format me geneate krna ...

1) Gl code me jo new fiels add hui h wo sab editable hona chahiye ..
2) old branch pe jo deal already accounting (generate) saved hogai h unki accounting me again koi bhi entry ya reversal entry nahi banna chahiye ...
3) gsec (SLR, LCR, INvestment, Lien, Other jo bhi purpose mention hai us k according jo GL me code diya gya hai properly reflect hona chahiye accounting me
4) same for Bond ( coupon NCD )
5) same for FD
6) same for CP
7) same for TREps investment
8) treps borrowing k fields and uski proper entry
9) deal wise accounting me wo fields dikh rahi h kya
9) jis date pe GL me code update hue h us k according hi accounting me Show honge ...
10) after UNdo the action from GL....cOde should not visible ...

abhi k liye sare actual result pass hi conider kr`;

export const GeminiQaChatbot: React.FC<GeminiQaChatbotProps> = ({
  isOpen,
  onClose,
  currentUser,
  activeTicket,
  onApplyTestCases,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      role: 'model',
      content: `Hello ${currentUser?.name ? currentUser.name.split(' ')[0] : 'there'}! 👋 

I am your **Beacon AI QA Architect & Test Case Generator** (powered by Gemini 3.5 Flash). 

You can write your testing requirements, background context, or numbered scenarios in **ANY language** (Hindi, Hinglish, casual notes, or English). Tell me:
- What feature/workflow you are testing
- Numbered scenario points (1, 2, 3...)
- Any constraints (e.g. *"abhi k liye sare actual result pass hi consider kr"*)

I will immediately convert them into a structured, production-grade QA test case table matching ChatGPT standards!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [appliedNotice, setAppliedNotice] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      textareaRef.current?.focus();
    }
  }, [isOpen, messages]);

  if (!isOpen) return null;

  const currentTicketNo = activeTicket?.ticketNumber || '1024';

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend !== undefined ? textToSend : inputMessage).trim();
    if (!text || isLoading) return;

    const userMsgId = `user-${Date.now()}`;
    const newMessages: ChatMessage[] = [
      ...messages,
      {
        id: userMsgId,
        role: 'user',
        content: text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ];

    setMessages(newMessages);
    setInputMessage('');
    setIsLoading(true);

    try {
      const apiMessages = newMessages
        .filter((m) => m.id !== 'welcome-1')
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          ticketContext: {
            ticketNo: currentTicketNo,
            moduleName: activeTicket?.moduleName || 'Accounting / Term Loan',
            featureName: activeTicket?.featureName || 'Global Accounting Code Master',
            description: activeTicket?.description || '',
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const modelReply = data.reply || 'Here are the generated test cases.';
        const structuredCases = data.structuredCases || [];

        setMessages((prev) => [
          ...prev,
          {
            id: `model-${Date.now()}`,
            role: 'model',
            content: modelReply,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            structuredCases: structuredCases.length > 0 ? structuredCases : undefined,
          },
        ]);
      } else {
        throw new Error(`Chat API error: ${res.status}`);
      }
    } catch (err) {
      console.error('Chat error:', err);
      // Fallback message
      setMessages((prev) => [
        ...prev,
        {
          id: `model-${Date.now()}`,
          role: 'model',
          content: `⚠️ Note: Connection interrupted. Please try again or check network connection.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyToTicket = (cases: any[]) => {
    if (!cases || cases.length === 0) return;

    const formatted: TestCaseItem[] = cases.map((c, idx) => {
      const num = idx + 1;
      const tcId = c.testCaseId || `TC${num < 10 ? '0' + num : num}`;
      return {
        id: `tc-${Date.now()}-${idx}`,
        testCaseId: tcId,
        testModule: c.testModule || (activeTicket?.moduleName || 'Accounting').toLowerCase(),
        featureTab: c.featureTab || 'General',
        testScenario: c.testScenario || `Test scenario ${num}`,
        preconditions: c.preconditions || 'Standard environment and permissions configured.',
        testCases: c.testCases || `Verify that ${c.testScenario}`,
        testInputs: c.testInputs || 'Standard parameters',
        expectedResult: c.expectedResult || 'Expected behavior verified.',
        actualResult: c.actualResult || 'Verified successfully in accordance with specifications.',
        validationScenario: c.validationScenario || (idx % 2 === 0 ? 'Positive Workflow' : 'Negative Validation'),
        status: (c.status || 'pass').toLowerCase() as any,
        reviewStatus: 'Draft',
        version: '1.0',
        attachments: [],
        createdBy: currentUser?.name || 'Maseera Sayyed',
        createdAt: new Date().toLocaleDateString(),
      };
    });

    if (onApplyTestCases) {
      onApplyTestCases(currentTicketNo, formatted);
      setAppliedNotice(`✅ Successfully applied ${formatted.length} test cases to Ticket #${currentTicketNo}!`);
      setTimeout(() => setAppliedNotice(null), 4000);
    }
  };

  const handleExportCases = (cases: any[]) => {
    if (!cases || cases.length === 0) return;
    const formatted: TestCaseItem[] = cases.map((c, idx) => ({
      id: `tc-${Date.now()}-${idx}`,
      testCaseId: c.testCaseId || `TC${String(idx + 1).padStart(2, '0')}`,
      testModule: c.testModule || activeTicket?.moduleName || 'Accounting',
      featureTab: 'General',
      testScenario: c.testScenario || '',
      preconditions: '',
      testCases: c.testCases || '',
      testInputs: '',
      expectedResult: c.expectedResult || '',
      actualResult: c.actualResult || 'Verified successfully',
      validationScenario: c.validationScenario || 'Positive Workflow',
      status: 'pass',
      reviewStatus: 'Draft',
      version: '1.0',
      attachments: [],
    }));

    exportTestCasesToExcel(
      {
        ticketNo: currentTicketNo,
        clientName: activeTicket?.clientName || 'Treasury Master',
        sha: activeTicket?.shaCommit || 'SHA-1: 4710b619ea012cba75ee657d64ebd49e656948df*',
        taskName: activeTicket?.featureName || 'Global Accounting Code Master',
        taskDoneBy: currentUser?.name || 'Maseera Sayyed',
        signOffBy: activeTicket?.signOffBy || 'Ashwini poke',
        version: '1.0',
      },
      formatted
    );
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Helper to parse Markdown tables inside bot responses
  const renderMessageContent = (msg: ChatMessage) => {
    const raw = msg.content;
    // Remove the json:qa-cases codeblock from user display
    const cleanText = raw.replace(/```json:qa-cases[\s\S]*?```/g, '').trim();

    // Check if there's a markdown table
    const tableRegex = /\|(.+)\|[\r\n]+\|[-:| ]+\|[\r\n]+((?:\|.+\|[\r\n]*)+)/;
    const match = cleanText.match(tableRegex);

    if (match) {
      const beforeTable = cleanText.substring(0, match.index).trim();
      const headerRow = match[1].split('|').map((s) => s.trim()).filter(Boolean);
      const rows = match[2]
        .trim()
        .split('\n')
        .map((r) => r.split('|').map((c) => c.trim()).filter(Boolean))
        .filter((r) => r.length > 0);
      const afterTable = cleanText.substring((match.index || 0) + match[0].length).trim();

      return (
        <div className="space-y-3">
          {beforeTable && (
            <div className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed font-medium">
              {beforeTable}
            </div>
          )}

          {/* Rendered ChatGPT-style Table */}
          <div className="overflow-x-auto rounded-lg border border-slate-700 bg-slate-950 shadow-md">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-slate-200 uppercase text-[11px] font-bold border-b border-slate-800">
                  {headerRow.map((h, i) => (
                    <th key={i} className="p-2.5 border-r border-slate-800 last:border-r-0 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-200">
                {rows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-900/60 transition-colors">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="p-2.5 border-r border-slate-800 last:border-r-0 align-top">
                        {cell.includes('Working as expected') || cell.includes('✅') ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700">
                            <CheckCircle className="w-2.5 h-2.5" />
                            <span>Working as expected</span>
                          </span>
                        ) : cIdx === 0 ? (
                          <span className="font-mono font-bold text-blue-400">{cell}</span>
                        ) : cIdx === 1 ? (
                          <span className="font-bold text-slate-100">{cell}</span>
                        ) : (
                          <span className="text-slate-300">{cell}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Action Bar for Extracted Cases */}
          {msg.structuredCases && msg.structuredCases.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200">
              <button
                onClick={() => handleApplyToTicket(msg.structuredCases || [])}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-all active:scale-95"
              >
                <FileCheck className="w-3.5 h-3.5" />
                <span>📥 Apply All ({msg.structuredCases.length} Cases) to Ticket #{currentTicketNo}</span>
              </button>

              <button
                onClick={() => handleExportCases(msg.structuredCases || [])}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Export to Excel (.xlsx)</span>
              </button>

              <button
                onClick={() => handleCopyText(cleanText, msg.id)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-semibold flex items-center gap-1 cursor-pointer"
              >
                {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedId === msg.id ? 'Copied!' : 'Copy Table'}</span>
              </button>
            </div>
          )}

          {afterTable && (
            <div className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed mt-2">
              {afterTable}
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed font-normal">
        {cleanText}
      </div>
    );
  };

  return (
    <div
      className={`fixed z-50 bg-white shadow-2xl border border-slate-300 rounded-2xl flex flex-col overflow-hidden transition-all duration-200 ${
        isExpanded
          ? 'inset-4 sm:inset-10'
          : 'bottom-5 right-5 w-[92vw] sm:w-[540px] md:w-[620px] h-[640px] max-h-[85vh]'
      }`}
    >
      {/* Chat Header */}
      <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between shrink-0 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-blue-600 rounded-lg shadow-xs">
            <Sparkles className="w-4 h-4 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-tight">Beacon AI QA Chatbot</h3>
              <span className="px-1.5 py-0.5 text-[10px] font-mono bg-blue-500/20 text-blue-300 rounded border border-blue-400/30">
                Gemini 3.5 Flash
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Active Ticket: <strong className="text-blue-300">#{currentTicketNo}</strong> • {activeTicket?.moduleName || 'Term Loan'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Applied Notice Banner */}
      {appliedNotice && (
        <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2 text-xs font-bold text-emerald-800 flex items-center justify-between">
          <span>{appliedNotice}</span>
          <button onClick={() => setAppliedNotice(null)} className="text-emerald-600 hover:text-emerald-900">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Scrollable Message Thread */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div key={msg.id} className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold shadow-xs ${
                  isUser ? 'bg-blue-600 text-white' : 'bg-slate-900 text-white'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4 text-blue-400" />}
              </div>

              <div
                className={`max-w-[88%] rounded-xl p-3.5 shadow-2xs border ${
                  isUser
                    ? 'bg-blue-600 text-white border-blue-700 rounded-tr-none'
                    : 'bg-white text-slate-900 border-slate-200 rounded-tl-none'
                }`}
              >
                <div className="flex items-center justify-between gap-3 mb-1 text-[10px] opacity-70">
                  <span className="font-bold">{isUser ? (currentUser?.name || 'You') : 'Beacon AI Architect'}</span>
                  <span>{msg.timestamp}</span>
                </div>

                {isUser ? (
                  <div className="text-xs whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                ) : (
                  renderMessageContent(msg)
                )}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-blue-400" />
            </div>
            <div className="bg-white border border-slate-200 rounded-xl rounded-tl-none p-3 shadow-2xs flex items-center gap-2 text-xs text-slate-600">
              <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
              <span>Analyzing requirements &amp; structuring ChatGPT-standard QA test cases...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Preset Quick Actions */}
      <div className="px-4 py-2 bg-white border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto text-[11px] shrink-0">
        <span className="text-slate-400 font-semibold uppercase text-[9px] shrink-0">Quick Prompt:</span>
        <button
          onClick={() => handleSendMessage(SAMPLE_ACCOUNTING_PROMPT)}
          className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-full font-semibold whitespace-nowrap cursor-pointer transition-colors"
        >
          ⚡ Accounting GL Code Master (User Scenarios 1-10)
        </button>
        <button
          onClick={() =>
            handleSendMessage('Abhi k liye sare test cases ke actual result pass consider kr and 2 edge cases bhi add kr')
          }
          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full font-semibold whitespace-nowrap cursor-pointer transition-colors"
        >
          ➕ Add Edge Cases
        </button>
        <button
          onClick={() =>
            handleSendMessage('Validate undo functionality and reversal accounting entries for existing deals')
          }
          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full font-semibold whitespace-nowrap cursor-pointer transition-colors"
        >
          🔍 Undo & Reversal Scenarios
        </button>
      </div>

      {/* Input Form */}
      <div className="p-3 bg-white border-t border-slate-200 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-end gap-2"
        >
          <textarea
            ref={textareaRef}
            rows={2}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Type your scenario description or numbered points in Hindi/Hinglish/English... (Ctrl+Enter to send)"
            className="flex-1 p-2.5 text-xs text-slate-800 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white resize-none"
          />

          <button
            type="submit"
            disabled={!inputMessage.trim() || isLoading}
            className={`p-2.5 rounded-xl font-bold flex items-center justify-center text-white transition-all cursor-pointer ${
              !inputMessage.trim() || isLoading
                ? 'bg-slate-300 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 shadow-md active:scale-95'
            }`}
            title="Send Message"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
        <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5 px-1">
          <span>Supports Hindi, Hinglish, shorthand &amp; bulleted requirements</span>
          <span>Press <strong>Ctrl+Enter</strong> to send</span>
        </div>
      </div>
    </div>
  );
};
