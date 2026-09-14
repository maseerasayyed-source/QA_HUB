import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MessageSquare,
  Sparkles,
  Send,
  Check,
  Eye,
  Edit2,
  X,
  FileCheck2,
  RotateCcw,
  ListFilter,
} from 'lucide-react';
import {
  TicketSummary,
  TestCaseHeaderMeta,
  TestCaseItem,
  UserProfile,
  ReviewComment,
  TestCaseReviewStatus,
} from '../types';
import { aiReviewTestCases } from '../utils/aiGenerator';
import { CommonHeader } from './common/CommonHeader';
import { polishObservationText } from '../utils/textPolisher';
import { DeveloperTestItem } from '../types';

interface SeniorQAReviewQueueProps {
  tickets: TicketSummary[];
  testCasesMap: Record<string, TestCaseItem[]>;
  testCaseHeadersMap: Record<string, TestCaseHeaderMeta>;
  devTestingMap?: Record<string, DeveloperTestItem[]>;
  currentUser?: UserProfile;
  onUpdateHeader?: (ticketNo: string, header: TestCaseHeaderMeta) => void;
  onUpdateTestCases?: (ticketNo: string, cases: TestCaseItem[]) => void;
  onOpenTestCasesForTicket?: (ticketNo: string) => void;
}

export const SeniorQAReviewQueue: React.FC<SeniorQAReviewQueueProps> = ({
  tickets,
  testCasesMap,
  testCaseHeadersMap,
  currentUser,
  onUpdateHeader,
  onUpdateTestCases,
  onOpenTestCasesForTicket,
}) => {
  // Active reviewing ticket ID
  const [selectedTicketNo, setSelectedTicketNo] = useState<string | null>(null);

  // Reviewer Testing Points
  const [reviewerPoints, setReviewerPoints] = useState<string>('');
  const [aiCoverageReport, setAiCoverageReport] = useState<{
    covered: string[];
    missing: string[];
    partiallyCovered: string[];
    duplicates: string[];
    missingPositive: string[];
    missingNegativeValidation: string[];
    missingEdgeCases: string[];
    mismatches: string[];
  } | null>(null);

  // New Comment Input
  const [commentText, setCommentText] = useState<string>('');
  const [notification, setNotification] = useState<string | null>(null);

  // Status Filter
  const [queueFilter, setQueueFilter] = useState<'pending' | 'all' | 'approved' | 'changes'>('pending');

  // Build review queue items
  const queueItems = useMemo(() => {
    return tickets.map((t) => {
      const h = testCaseHeadersMap[t.ticketNumber] || {
        ticketNo: t.ticketNumber,
        clientName: t.clientName || 'Treasury Master',
        sha: t.shaCommit || 'SHA-1: 4710b619ea012cba75ee657d',
        taskName: t.featureName,
        taskDoneBy: t.qaAssignee || 'Maseera Sayyed',
        signOffBy: t.signOffBy || 'Ashwini Poke',
        reviewStatus: 'Review Pending' as TestCaseReviewStatus,
        version: '1.0',
      };

      const cases = testCasesMap[t.ticketNumber] || [];

      return {
        ticket: t,
        header: h,
        testCases: cases,
        status: h.reviewStatus || 'Review Pending',
      };
    });
  }, [tickets, testCaseHeadersMap, testCasesMap]);

  // Filtered Items
  const filteredQueue = useMemo(() => {
    return queueItems.filter((q) => {
      if (queueFilter === 'pending') {
        return q.status === 'Review Pending' || q.status === 'In Review';
      }
      if (queueFilter === 'approved') {
        return q.status === 'Approved';
      }
      if (queueFilter === 'changes') {
        return q.status === 'Changes Required';
      }
      return true;
    });
  }, [queueItems, queueFilter]);

  // Selected Active Item
  const activeItem = useMemo(() => {
    if (!selectedTicketNo) return null;
    return queueItems.find((q) => q.ticket.ticketNumber.toLowerCase() === selectedTicketNo.toLowerCase()) || null;
  }, [queueItems, selectedTicketNo]);

  // AI Coverage Check Action
  const handleRunAiCoverageCheck = () => {
    if (!activeItem) return;
    const cases = activeItem.testCases;
    const pointsNorm = reviewerPoints.toLowerCase();

    const covered: string[] = [];
    const missing: string[] = [];
    const partiallyCovered: string[] = [];
    const duplicates: string[] = [];
    const missingPositive: string[] = [];
    const missingNegativeValidation: string[] = [];
    const missingEdgeCases: string[] = [];
    const mismatches: string[] = [];

    // Analyze reviewer points
    if (reviewerPoints.trim()) {
      const lines = reviewerPoints.split('\n').filter((l) => l.trim().length > 0);
      lines.forEach((line) => {
        const lineLower = line.toLowerCase();
        const matchedCase = cases.find((c) =>
          c.testScenario.toLowerCase().includes(lineLower) ||
          c.testCases.toLowerCase().includes(lineLower)
        );
        if (matchedCase) {
          covered.push(`"${line.trim()}" (Covered in ${matchedCase.testCaseId})`);
        } else {
          missing.push(`"${line.trim()}" is missing from test cases.`);
        }
      });
    } else {
      covered.push('Core ticket requirement workflow covered.');
    }

    // Check negative / validation
    const hasNegative = cases.some((c) =>
      c.testScenario.toLowerCase().includes('invalid') ||
      c.testScenario.toLowerCase().includes('restrict') ||
      c.testScenario.toLowerCase().includes('error') ||
      Boolean(c.validationScenario)
    );
    if (!hasNegative) {
      missingNegativeValidation.push('Validation scenarios for invalid input restrictions are missing.');
    } else {
      covered.push('Validation scenarios for invalid inputs are included.');
    }

    // Check edge / boundary
    const hasEdge = cases.some((c) =>
      c.testScenario.toLowerCase().includes('boundary') ||
      c.testScenario.toLowerCase().includes('limit') ||
      c.testScenario.toLowerCase().includes('max')
    );
    if (!hasEdge) {
      missingEdgeCases.push('Boundary / edge case scenarios (e.g. max limits, special characters) are missing.');
    } else {
      covered.push('Boundary and edge case scenarios covered.');
    }

    setAiCoverageReport({
      covered,
      missing,
      partiallyCovered,
      duplicates,
      missingPositive,
      missingNegativeValidation,
      missingEdgeCases,
      mismatches,
    });

    setNotification('✨ AI Coverage Check completed! Review identified covered and missing scenarios below.');
    setTimeout(() => setNotification(null), 4000);
  };

  // Open Ticket Review
  const handleOpenReview = (tNo: string) => {
    setSelectedTicketNo(tNo);
    const target = queueItems.find((q) => q.ticket.ticketNumber.toLowerCase() === tNo.toLowerCase());
    if (target) {
      // Mark Status as "In Review" (Edit Lock for QA)
      const updatedHeader: TestCaseHeaderMeta = {
        ...target.header,
        reviewStatus: 'In Review',
        isBeingReviewed: true,
      };
      onUpdateHeader?.(tNo, updatedHeader);
    }
  };

  // Add Comment Action
  const handleAddComment = () => {
    if (!commentText.trim() || !activeItem) return;
    const authorName = currentUser?.name || 'Ashwini Poke (Senior QA)';
    const newComment: ReviewComment = {
      id: `comment-${Date.now()}`,
      author: authorName,
      authorEmail: currentUser?.email || 'ashwinipoke@quantumphinance.com',
      role: currentUser?.role || 'Senior QA',
      text: commentText.trim(),
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const existingComments = activeItem.header.comments || [];
    const updatedHeader: TestCaseHeaderMeta = {
      ...activeItem.header,
      comments: [...existingComments, newComment],
    };

    onUpdateHeader?.(activeItem.ticket.ticketNumber, updatedHeader);
    setCommentText('');
    setNotification('Comment added to review notes!');
    setTimeout(() => setNotification(null), 3000);
  };

  // Send Back Action
  const handleSendBack = () => {
    if (!activeItem) return;
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const authorName = currentUser?.name || 'Ashwini Poke (Senior QA)';

    let comments = activeItem.header.comments || [];
    if (commentText.trim()) {
      comments = [
        ...comments,
        {
          id: `comment-${Date.now()}`,
          author: authorName,
          authorEmail: currentUser?.email || 'ashwinipoke@quantumphinance.com',
          role: currentUser?.role || 'Senior QA',
          text: commentText.trim(),
          createdAt: nowStr,
        },
      ];
      setCommentText('');
    }

    const updatedHeader: TestCaseHeaderMeta = {
      ...activeItem.header,
      reviewStatus: 'Changes Required',
      isBeingReviewed: false,
      comments: comments,
    };

    onUpdateHeader?.(activeItem.ticket.ticketNumber, updatedHeader);
    setNotification(`Sent back ticket #${activeItem.ticket.ticketNumber} to ${activeItem.header.taskDoneBy}. Status set to "Changes Required".`);
    setTimeout(() => setNotification(null), 4000);
  };

  // Approve Action
  const handleApprove = () => {
    if (!activeItem) return;
    const nowStr = new Date().toLocaleDateString();
    const authorName = currentUser?.name || 'Ashwini Poke (Senior QA)';

    const updatedHeader: TestCaseHeaderMeta = {
      ...activeItem.header,
      reviewStatus: 'Approved',
      approvedBy: authorName,
      approvedAt: nowStr,
      approvedVersion: activeItem.header.version || '1.0',
      isBeingReviewed: false,
    };

    // Set test cases review status to Approved
    const updatedCases = activeItem.testCases.map((tc) => ({
      ...tc,
      reviewStatus: 'Approved' as TestCaseReviewStatus,
    }));

    onUpdateHeader?.(activeItem.ticket.ticketNumber, updatedHeader);
    onUpdateTestCases?.(activeItem.ticket.ticketNumber, updatedCases);

    setNotification(`🎉 Approved test cases for Ticket #${activeItem.ticket.ticketNumber} (v${updatedHeader.version})!`);
    setTimeout(() => setNotification(null), 4000);
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <span className="p-2 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100">
            <ShieldCheck className="w-5 h-5" />
          </span>
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">
              Senior QA Review Queue &amp; Approval Center
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Review submitted test cases against Azure DevOps tickets with AI assistance, comment, send back, or grant final sign-off.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setQueueFilter('pending')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors cursor-pointer ${
              queueFilter === 'pending'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Review Pending ({queueItems.filter((q) => q.status === 'Review Pending' || q.status === 'In Review').length})
          </button>
          <button
            onClick={() => setQueueFilter('changes')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors cursor-pointer ${
              queueFilter === 'changes'
                ? 'bg-red-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Changes Required ({queueItems.filter((q) => q.status === 'Changes Required').length})
          </button>
          <button
            onClick={() => setQueueFilter('approved')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors cursor-pointer ${
              queueFilter === 'approved'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Approved ({queueItems.filter((q) => q.status === 'Approved').length})
          </button>
          <button
            onClick={() => setQueueFilter('all')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors cursor-pointer ${
              queueFilter === 'all'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All ({queueItems.length})
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {notification && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-center gap-2 animate-fadeIn shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* MAIN REVIEW QUEUE TABLE */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 font-bold text-xs text-slate-800 flex items-center justify-between">
          <span>Submitted Test Cases Review Queue</span>
          <span className="text-slate-400 font-normal">Showing {filteredQueue.length} tickets</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-900 text-slate-200 uppercase font-semibold text-[11px]">
              <tr>
                <th className="p-3 border-r border-slate-800">Ticket ID</th>
                <th className="p-3 border-r border-slate-800">Assigned QA</th>
                <th className="p-3 border-r border-slate-800 text-center">Test Cases</th>
                <th className="p-3 border-r border-slate-800 text-center">Status</th>
                <th className="p-3 text-center">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 text-slate-800 font-medium">
              {filteredQueue.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400 text-xs">
                    No test cases submitted matching filter "{queueFilter}".
                  </td>
                </tr>
              ) : (
                filteredQueue.map((item) => (
                  <tr key={item.ticket.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="p-3 font-mono font-bold text-blue-700">
                      #{item.ticket.ticketNumber} – {item.ticket.featureName}
                    </td>
                    <td className="p-3 text-slate-800 font-bold">{item.header.taskDoneBy}</td>
                    <td className="p-3 text-center">
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-800 rounded-full font-mono font-bold">
                        {item.testCases.length} Cases
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          item.status === 'Approved'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : item.status === 'In Review'
                            ? 'bg-purple-100 text-purple-800 border border-purple-300'
                            : item.status === 'Changes Required'
                            ? 'bg-red-100 text-red-800 border border-red-300'
                            : 'bg-blue-100 text-blue-800 border border-blue-300'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleOpenReview(item.ticket.ticketNumber)}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded shadow-2xs cursor-pointer"
                      >
                        Start Senior QA Review
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ACTIVE REVIEW PANEL */}
      {activeItem && (
        <div className="bg-white border-2 border-blue-300 rounded-2xl p-5 shadow-lg space-y-5 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
              <h2 className="text-base font-bold text-slate-900">
                Reviewing Ticket #{activeItem.ticket.ticketNumber}: {activeItem.ticket.featureName}
              </h2>
            </div>
            <button
              onClick={() => setSelectedTicketNo(null)}
              className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* COMMON MODULE HEADER IN REVIEW */}
          <CommonHeader
            selectedTicketNumber={activeItem.ticket.ticketNumber}
            tickets={tickets}
            description={activeItem.header.description || activeItem.ticket.description || activeItem.ticket.featureName}
            testingScenarios={activeItem.header.testingScenarios || activeItem.ticket.testingScenarios || ''}
            onSelectTicket={(tNo) => handleOpenReview(tNo)}
            onChangeDescription={(val) => {
              const updatedHeader = { ...activeItem.header, description: val };
              onUpdateHeader?.(activeItem.ticket.ticketNumber, updatedHeader);
            }}
            onChangeTestingScenarios={(val) => {
              const updatedHeader = { ...activeItem.header, testingScenarios: val };
              onUpdateHeader?.(activeItem.ticket.ticketNumber, updatedHeader);
            }}
            showGenerateButton={false}
          />

          {/* REVIEWER TESTING SCENARIOS / REVIEW POINTS & AI COVERAGE CHECK */}
          <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 border border-purple-200 rounded-xl p-4 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <label className="font-bold text-purple-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span>Testing Scenarios / Review Points (Reviewer Input)</span>
              </label>
              <button
                type="button"
                onClick={() => setReviewerPoints(polishObservationText(reviewerPoints))}
                className="px-2 py-0.5 bg-purple-100 hover:bg-purple-200 text-purple-900 border border-purple-300 font-bold text-[10px] rounded cursor-pointer"
              >
                AI Polish
              </button>
            </div>

            <textarea
              rows={2}
              value={reviewerPoints}
              onChange={(e) => setReviewerPoints(e.target.value)}
              placeholder="Paste review points (e.g. Check negative scenarios, validation scenarios, UI behavior, save/submit behavior)..."
              className="w-full p-2.5 bg-white border border-purple-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
            />

            <div className="flex justify-end">
              <button
                onClick={handleRunAiCoverageCheck}
                className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Sparkles className="w-4 h-4 text-purple-200" />
                <span>AI Coverage Check</span>
              </button>
            </div>

            {/* AI Coverage Report Results */}
            {aiCoverageReport && (
              <div className="p-3 bg-white border border-purple-200 rounded-lg space-y-2 mt-3 animate-fadeIn">
                <div className="font-bold text-slate-900 border-b pb-1">AI Coverage Analysis Results:</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded">
                    <div className="font-bold text-emerald-900 mb-1">Covered Scenarios:</div>
                    <ul className="list-disc pl-4 space-y-0.5 text-emerald-800 text-[11px]">
                      {aiCoverageReport.covered.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded">
                    <div className="font-bold text-amber-900 mb-1">Missing / Gap Scenarios:</div>
                    <ul className="list-disc pl-4 space-y-0.5 text-amber-800 text-[11px]">
                      {aiCoverageReport.missing.concat(aiCoverageReport.missingNegativeValidation, aiCoverageReport.missingEdgeCases).map((m, i) => (
                        <li key={i}>{m}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* EDITABLE TEST CASES IN REVIEW */}
          <div className="space-y-3">
            <div className="font-bold text-xs text-slate-800">
              Submitted Test Cases Matrix ({activeItem.testCases.length} cases):
            </div>

            <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-[350px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-800 text-slate-200 font-semibold text-[11px]">
                  <tr>
                    <th className="p-2.5 w-24 border-r border-slate-700">ID</th>
                    <th className="p-2.5 border-r border-slate-700 min-w-[220px]">Scenario</th>
                    <th className="p-2.5 border-r border-slate-700 min-w-[240px]">Test Steps</th>
                    <th className="p-2.5 border-r border-slate-700 min-w-[220px]">Expected Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-800">
                  {activeItem.testCases.map((tc) => (
                    <tr key={tc.id} className="hover:bg-slate-50">
                      <td className="p-2.5 font-mono font-bold text-blue-700 border-r border-slate-100">
                        {tc.testCaseId}
                      </td>
                      <td className="p-2 border-r border-slate-100">
                        <textarea
                          rows={2}
                          value={tc.testScenario}
                          onChange={(e) => {
                            const updated = activeItem.testCases.map((item) =>
                              item.id === tc.id ? { ...item, testScenario: e.target.value } : item
                            );
                            onUpdateTestCases?.(activeItem.ticket.ticketNumber, updated);
                          }}
                          className="w-full p-1 border border-slate-200 rounded text-xs"
                        />
                      </td>
                      <td className="p-2 border-r border-slate-100">
                        <textarea
                          rows={2}
                          value={tc.testCases}
                          onChange={(e) => {
                            const updated = activeItem.testCases.map((item) =>
                              item.id === tc.id ? { ...item, testCases: e.target.value } : item
                            );
                            onUpdateTestCases?.(activeItem.ticket.ticketNumber, updated);
                          }}
                          className="w-full p-1 border border-slate-200 rounded text-xs"
                        />
                      </td>
                      <td className="p-2 border-r border-slate-100">
                        <textarea
                          rows={2}
                          value={tc.expectedResult}
                          onChange={(e) => {
                            const updated = activeItem.testCases.map((item) =>
                              item.id === tc.id ? { ...item, expectedResult: e.target.value } : item
                            );
                            onUpdateTestCases?.(activeItem.ticket.ticketNumber, updated);
                          }}
                          className="w-full p-1 border border-slate-200 rounded text-xs"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* COMMENTS & DECISION ACTIONS */}
          <div className="pt-3 border-t border-slate-200 space-y-3">
            <div className="space-y-1 text-xs">
              <label className="font-bold text-slate-800 flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-blue-600" />
                <span>Senior QA Review Comments &amp; Notes:</span>
              </label>
              <textarea
                rows={2}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Enter feedback or change requests for QA..."
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                onClick={handleAddComment}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-bold text-xs rounded cursor-pointer"
              >
                + Add Comment
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSendBack}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg shadow-2xs cursor-pointer flex items-center gap-1.5"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Send Back (Changes Required)</span>
                </button>

                <button
                  onClick={handleApprove}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-2xs cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Approve Test Cases</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
