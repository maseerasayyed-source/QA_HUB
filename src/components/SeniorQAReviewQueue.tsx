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
  AttachedDocOrImage,
  DeveloperTestItem,
} from '../types';
import {
  aiReviewTestCases,
  reviewTestCasesComprehensive,
  DetailedAiQaReviewResult,
  checkIsDuplicate,
} from '../utils/aiGenerator';
import { parseUploadedDocOrImage } from '../utils/fileParser';
import { CommonHeader } from './common/CommonHeader';
import { polishObservationText } from '../utils/textPolisher';
import {
  FileSpreadsheet,
  FileText,
  UploadCloud,
  Paperclip,
  Plus,
  Trash2,
  AlertCircle,
  HelpCircle,
  CheckCircle,
  FileCheck,
} from 'lucide-react';

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

  // Reviewer Attached Files for Comprehensive AI Review
  const [reviewerFiles, setReviewerFiles] = useState<AttachedDocOrImage[]>([]);
  const [isParsingReviewFiles, setIsParsingReviewFiles] = useState<boolean>(false);
  const [isReviewingWithAi, setIsReviewingWithAi] = useState<boolean>(false);
  const [comprehensiveReviewResult, setComprehensiveReviewResult] = useState<DetailedAiQaReviewResult | null>(null);

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

  // Reviewer File Upload (Excel, Word, Text, Screenshots)
  const handleReviewFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setIsParsingReviewFiles(true);
    const files = Array.from(e.target.files);
    const parsedList: AttachedDocOrImage[] = [];
    for (const f of files) {
      try {
        const parsed = await parseUploadedDocOrImage(f);
        parsedList.push(parsed);
      } catch (err) {
        console.error('File parsing error:', err);
      }
    }
    setReviewerFiles((prev) => [...prev, ...parsedList]);
    setIsParsingReviewFiles(false);
    setNotification(`📎 Attached ${parsedList.length} review document(s)! Click "✨ AI Review Test Cases" to analyze.`);
    setTimeout(() => setNotification(null), 4000);
    e.target.value = '';
  };

  const handleRemoveReviewFile = (id: string) => {
    setReviewerFiles((prev) => prev.filter((f) => f.id !== id));
  };

  // Run Comprehensive AI Review on Test Cases using Attached Files & Requirements
  const handleRunComprehensiveAiReview = () => {
    if (!activeItem) return;
    setIsReviewingWithAi(true);

    setTimeout(() => {
      // Combine files from activeItem header and reviewer's uploaded files
      const combinedDocs = [
        ...(activeItem.header.attachedDocs || []),
        ...reviewerFiles,
      ];
      const combinedFields = activeItem.header.screenFields || [];

      const result = reviewTestCasesComprehensive({
        ticket: activeItem.ticket,
        testCases: activeItem.testCases,
        attachedFiles: combinedDocs,
        reviewerNotes: reviewerPoints,
        screenFields: combinedFields,
      });

      setComprehensiveReviewResult(result);
      setIsReviewingWithAi(false);
      setNotification(`✨ Comprehensive AI Review complete! Identified what is required and what should be added.`);
      setTimeout(() => setNotification(null), 5000);
    }, 400);
  };

  // Add recommended cases without duplicates
  const handleAddRecommendedCasesToSuite = () => {
    if (!activeItem || !comprehensiveReviewResult) return;
    const recs = comprehensiveReviewResult.recommendedTestCasesToAdd;
    if (recs.length === 0) {
      setNotification('No new recommendations to add.');
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    // Duplicate check before adding
    const nonDuplicates: TestCaseItem[] = [];
    let skipped = 0;
    for (const r of recs) {
      const dup = checkIsDuplicate(r.testScenario + ' ' + r.testCases, activeItem.testCases);
      if (dup.isDup) {
        skipped++;
      } else {
        nonDuplicates.push(r);
      }
    }

    if (nonDuplicates.length === 0) {
      setNotification('⚠️ All recommended scenarios are already covered in the table! Duplicates prevented.');
      setTimeout(() => setNotification(null), 5000);
      return;
    }

    const updated = [...activeItem.testCases, ...nonDuplicates];
    onUpdateTestCases?.(activeItem.ticket.ticketNumber, updated);

    // Refresh review
    setComprehensiveReviewResult((prev) =>
      prev
        ? {
            ...prev,
            recommendedTestCasesToAdd: [],
            healthRating: 'Good',
            overallScore: Math.min(100, prev.overallScore + 20),
          }
        : null
    );

    setNotification(`✅ Added ${nonDuplicates.length} recommended test cases to ticket #${activeItem.ticket.ticketNumber}!${skipped > 0 ? ` (${skipped} duplicates skipped)` : ''}`);
    setTimeout(() => setNotification(null), 5000);
  };

  // Approve Action - Record Reviewer Name in reviewDoneBy
  const handleApprove = () => {
    if (!activeItem) return;
    const nowStr = new Date().toLocaleDateString();
    const authorName = currentUser?.name || 'Ashwini Poke (Senior QA)';

    const updatedHeader: TestCaseHeaderMeta = {
      ...activeItem.header,
      reviewStatus: 'Approved',
      approvedBy: authorName,
      approvedAt: nowStr,
      reviewDoneBy: authorName,
      reviewDoneAt: nowStr,
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

    setNotification(`🎉 Approved test cases for Ticket #${activeItem.ticket.ticketNumber}! Reviewer: ${authorName}`);
    setTimeout(() => setNotification(null), 5000);
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
            mode="qa"
            selectedTicketNumber={activeItem.ticket.ticketNumber}
            tickets={tickets}
            developerName={activeItem.ticket.developer || activeItem.header.developer || 'Kunal Joshi'}
            qaAssigneeName={activeItem.ticket.qaAssignee || activeItem.header.taskDoneBy || 'Maseera Sayyed'}
            reviewDoneBy={activeItem.header.reviewDoneBy || activeItem.header.approvedBy}
            reviewDoneAt={activeItem.header.reviewDoneAt || activeItem.header.approvedAt}
            reviewStatus={activeItem.header.reviewStatus}
            description={activeItem.header.description || activeItem.ticket.description || activeItem.ticket.featureName}
            testingScenarios={activeItem.header.testingScenarios || activeItem.ticket.testingScenarios || ''}
            attachedDocs={activeItem.header.attachedDocs || []}
            onUpdateAttachedDocs={(docs) => {
              const updatedHeader = { ...activeItem.header, attachedDocs: docs };
              onUpdateHeader?.(activeItem.ticket.ticketNumber, updatedHeader);
            }}
            screenFields={activeItem.header.screenFields || []}
            onUpdateScreenFields={(fields) => {
              const updatedHeader = { ...activeItem.header, screenFields: fields };
              onUpdateHeader?.(activeItem.ticket.ticketNumber, updatedHeader);
            }}
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

          {/* AI TEST CASE REVIEW ENGINE (ATTACH EXCEL / WORD / SCREENSHOTS & GET DETAILED AUDIT) */}
          <div className="bg-gradient-to-r from-purple-50/80 via-indigo-50/70 to-blue-50/80 border border-purple-200 rounded-xl p-4 space-y-4 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-purple-100">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-purple-600 text-white rounded-lg shadow-2xs">
                  <Sparkles className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    AI Test Case Review &amp; Gap Analysis Engine
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Attach Excel (.xlsx/.xls) or Word (.docx/.doc) requirements or enter reviewer notes. Click &quot;Review Test Cases&quot; to inspect what is required vs what should be added.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <label className="px-3 py-1.5 bg-white hover:bg-purple-50 text-purple-700 border border-purple-300 font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs">
                  <Paperclip className="w-3.5 h-3.5 text-purple-600" />
                  <span>{isParsingReviewFiles ? 'Parsing File...' : 'Attach Excel / Word File'}</span>
                  <input
                    type="file"
                    multiple
                    accept=".xlsx,.xls,.docx,.doc,.txt,.csv,.png,.jpg,.jpeg"
                    onChange={handleReviewFileUpload}
                    className="hidden"
                  />
                </label>

                <button
                  onClick={handleRunComprehensiveAiReview}
                  disabled={isReviewingWithAi}
                  className="px-4 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                  <span>{isReviewingWithAi ? 'Analyzing Suite...' : '✨ Review Test Cases'}</span>
                </button>
              </div>
            </div>

            {/* Attached Reviewer Documents Chip List */}
            {reviewerFiles.length > 0 && (
              <div className="space-y-1.5 bg-white/70 p-2.5 rounded-lg border border-purple-100">
                <div className="text-[11px] font-bold text-purple-900 flex items-center gap-1">
                  <FileCheck className="w-3.5 h-3.5 text-purple-600" />
                  <span>Attached Reference Documents for Review ({reviewerFiles.length}):</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {reviewerFiles.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 border border-purple-200 rounded-md text-[11px] text-purple-900"
                    >
                      {doc.type === 'excel' ? (
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      ) : (
                        <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      )}
                      <span className="font-semibold max-w-[200px] truncate">{doc.name}</span>
                      {doc.detectedFields && doc.detectedFields.length > 0 && (
                        <span className="px-1.5 py-0.2 bg-purple-200 text-purple-800 rounded-full text-[9px] font-bold">
                          {doc.detectedFields.length} fields
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveReviewFile(doc.id)}
                        className="ml-1 text-slate-400 hover:text-red-600 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reviewer Testing Scenarios / Notes Box */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="font-bold text-purple-900 flex items-center gap-1">
                  <span>Reviewer Notes &amp; Specific Testing Scenarios to inspect:</span>
                </label>
                <button
                  type="button"
                  onClick={() => setReviewerPoints(polishObservationText(reviewerPoints))}
                  className="px-2 py-0.5 bg-purple-100 hover:bg-purple-200 text-purple-900 border border-purple-300 font-bold text-[10px] rounded cursor-pointer"
                >
                  AI Polish Notes
                </button>
              </div>

              <textarea
                rows={2}
                value={reviewerPoints}
                onChange={(e) => setReviewerPoints(e.target.value)}
                placeholder="Optionally paste specific review points (e.g. Check negative validation on deal amount, verify leap year calculations, ensure user role restriction)..."
                className="w-full p-2.5 bg-white border border-purple-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>

            {/* Comprehensive AI Review Output Card */}
            {comprehensiveReviewResult && (
              <div className="p-4 bg-white border border-purple-200 rounded-xl space-y-4 shadow-xs animate-fadeIn">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3 border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        comprehensiveReviewResult.healthRating === 'Excellent'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : comprehensiveReviewResult.healthRating === 'Good'
                          ? 'bg-blue-100 text-blue-800 border border-blue-300'
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}
                    >
                      Audit Health: {comprehensiveReviewResult.healthRating} ({comprehensiveReviewResult.overallScore}%)
                    </span>
                    <span className="text-xs text-slate-500">
                      Evaluated {activeItem.testCases.length} submitted test cases against ticket requirements &amp; attached references.
                    </span>
                  </div>

                  {comprehensiveReviewResult.recommendedTestCasesToAdd.length > 0 && (
                    <button
                      onClick={handleAddRecommendedCasesToSuite}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>
                        Add Missing Scenarios to Table (+{comprehensiveReviewResult.recommendedTestCasesToAdd.length} Cases)
                      </span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* What is Required (Audit Criteria) */}
                  <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2">
                    <div className="flex items-center gap-1.5 font-bold text-blue-950 text-xs">
                      <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>📋 Kya Kya Required Hai (Mandatory QA Requirements):</span>
                    </div>
                    <ul className="space-y-1 text-[11px] text-blue-900 list-disc pl-4">
                      {comprehensiveReviewResult.whatIsRequired.map((req, idx) => (
                        <li key={idx} className="leading-relaxed font-medium">
                          {req}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* What Should Be Added (Actionable Gaps) */}
                  <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-amber-950 text-xs">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>⚡ Kya Add Hona Chahiye (Recommended Additions &amp; Gaps):</span>
                      </div>
                      <span className="px-2 py-0.5 bg-amber-200 text-amber-900 rounded-full font-bold text-[10px]">
                        {comprehensiveReviewResult.whatShouldBeAdded.length} Recommendations
                      </span>
                    </div>
                    {comprehensiveReviewResult.whatShouldBeAdded.length === 0 ? (
                      <p className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" />
                        All required scenarios are already covered! No missing gaps identified.
                      </p>
                    ) : (
                      <ul className="space-y-1 text-[11px] text-amber-900 list-disc pl-4">
                        {comprehensiveReviewResult.whatShouldBeAdded.map((gap, idx) => (
                          <li key={idx} className="leading-relaxed font-medium">
                            {gap}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                {/* Duplicate Rows Warning Box if Any Duplicate Detected */}
                {comprehensiveReviewResult.duplicateOrRedundantCases && comprehensiveReviewResult.duplicateOrRedundantCases.length > 0 && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs space-y-1">
                    <div className="font-bold text-red-900 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      <span>⚠️ Duplicate Rows / Redundancies Detected in Test Cases:</span>
                    </div>
                    <ul className="list-disc pl-4 space-y-0.5 text-red-800 text-[11px]">
                      {comprehensiveReviewResult.duplicateOrRedundantCases.map((d, i) => (
                        <li key={i}>
                          <strong>{d.testCaseIdA}</strong> &amp; <strong>{d.testCaseIdB}</strong>: {d.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Covered Requirements & Field-Specific Validations */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  {/* Covered Scenarios */}
                  <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-lg">
                    <div className="font-bold text-emerald-950 text-xs mb-1.5 flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Already Covered Scenarios:</span>
                    </div>
                    <ul className="list-disc pl-4 space-y-1 text-[11px] text-emerald-900">
                      {comprehensiveReviewResult.coveredRequirements.map((cov, i) => (
                        <li key={i}>{cov}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Field Validations */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <div className="font-bold text-slate-800 text-xs mb-1.5 flex items-center gap-1">
                      <FileCheck2 className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Screen Fields &amp; Validation Checks:</span>
                    </div>
                    {comprehensiveReviewResult.fieldSpecificValidations.length === 0 ? (
                      <p className="text-[11px] text-slate-500">
                        No specific screen fields declared. Add fields or attach screenshots in the header to get field-level validations.
                      </p>
                    ) : (
                      <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                        {comprehensiveReviewResult.fieldSpecificValidations.map((fv, i) => (
                          <div key={i} className="text-[11px] text-slate-700 bg-white p-1.5 rounded border border-slate-200">
                            <span className="font-bold text-purple-900">{fv.fieldName}: </span>
                            <span className="text-slate-600">{fv.recommendedValidations.join('; ')}</span>
                          </div>
                        ))}
                      </div>
                    )}
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
