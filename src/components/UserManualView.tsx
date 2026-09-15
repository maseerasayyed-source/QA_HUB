import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  FileText,
  Download,
  Sparkles,
  Upload,
  Plus,
  Trash2,
  Image as ImageIcon,
  Edit3,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Eye,
  BookOpen,
  ChevronRight,
  FileSpreadsheet,
  Paperclip,
  X,
  ArrowUpRight,
  Printer,
  Layers,
  ArrowDownToLine,
  FileCheck,
} from 'lucide-react';
import {
  UserManualDoc,
  ManualStep,
  TicketSummary,
  TestCaseItem,
  UserProfile,
  BeaconModule,
  AttachedExcelTestCase,
} from '../types';
import { exportUserManualToDocx } from '../utils/docxExport';
import { generateUserManualFromTicket, createBlankUserManual } from '../utils/userManualHelper';

interface UserManualViewProps {
  tickets: TicketSummary[];
  testCasesMap: Record<string, TestCaseItem[]>;
  modules: BeaconModule[];
  currentUser: UserProfile;
  userManuals: UserManualDoc[];
  onSaveManuals: (manuals: UserManualDoc[]) => void;
}

export const UserManualView: React.FC<UserManualViewProps> = ({
  tickets,
  testCasesMap,
  modules,
  currentUser,
  userManuals,
  onSaveManuals,
}) => {
  // Selected ticket number or custom manual ID
  const [selectedTicketNo, setSelectedTicketNo] = useState<string>(
    tickets[0]?.ticketNumber || ''
  );

  // Active User Manual object
  const [currentManual, setCurrentManual] = useState<UserManualDoc | null>(() => {
    if (userManuals.length > 0) return userManuals[0];
    if (tickets.length > 0) {
      return generateUserManualFromTicket(
        tickets[0],
        testCasesMap[tickets[0].ticketNumber] || [],
        currentUser.name,
        currentUser.email
      );
    }
    return createBlankUserManual(currentUser.name, currentUser.email);
  });

  const [activeTabMode, setActiveTabMode] = useState<'editor' | 'preview'>('editor');
  const [isAiGenerating, setIsAiGenerating] = useState<boolean>(false);
  const [isExportingWord, setIsExportingWord] = useState<boolean>(false);
  const [saveSuccessBanner, setSaveSuccessBanner] = useState<string>('');

  // Target step index for screenshot upload
  const [targetStepIndexForUpload, setTargetStepIndexForUpload] = useState<number | null>(null);
  const screenshotInputRef = useRef<HTMLInputElement | null>(null);

  // Excel file upload input ref
  const excelInputRef = useRef<HTMLInputElement | null>(null);

  // Active Ticket
  const activeTicket = tickets.find(
    (t) => t.ticketNumber.toLowerCase() === selectedTicketNo.toLowerCase()
  );

  // Handle Switch Ticket or Manual
  const handleSelectTicket = (tNo: string) => {
    setSelectedTicketNo(tNo);
    const existing = userManuals.find((m) => m.ticketNumber === tNo || m.id === tNo);
    if (existing) {
      setCurrentManual(existing);
    } else {
      const ticketObj = tickets.find((t) => t.ticketNumber === tNo);
      if (ticketObj) {
        const generated = generateUserManualFromTicket(
          ticketObj,
          testCasesMap[tNo] || [],
          currentUser.name,
          currentUser.email
        );
        setCurrentManual(generated);
      }
    }
  };

  // Create brand new manual from scratch
  const handleCreateNewManual = () => {
    const blank = createBlankUserManual(currentUser.name, currentUser.email);
    setSelectedTicketNo(blank.id);
    setCurrentManual(blank);
    setActiveTabMode('editor');
    setSaveSuccessBanner('New User Manual draft created! You can now add scenarios, attach an Excel file, and add screenshots.');
    setTimeout(() => setSaveSuccessBanner(''), 4500);
  };

  // AI Auto-Generate or Enhance User Manual
  const handleAiGenerate = () => {
    if (!currentManual) return;
    setIsAiGenerating(true);
    setTimeout(() => {
      let updated: UserManualDoc;
      if (activeTicket) {
        const cases = testCasesMap[activeTicket.ticketNumber] || [];
        updated = generateUserManualFromTicket(
          activeTicket,
          cases,
          currentUser.name,
          currentUser.email,
          currentManual.clientName || 'Treasury Master'
        );
        // Preserve any uploaded excel test cases if previously attached
        if (currentManual.attachedTestCases && currentManual.attachedTestCases.length > 0) {
          updated.attachedTestCases = currentManual.attachedTestCases;
          updated.attachedExcelFileName = currentManual.attachedExcelFileName;
        }
      } else {
        // Enhance existing manual
        updated = {
          ...currentManual,
          overview: `Standard Operating Procedure (SOP) and operational guide for '${currentManual.title}'. This document provides step-by-step instructions for operations teams and QA verifiers, covering workflow requirements, UI validation, and expected system outcomes in ${currentManual.moduleName}.`,
          workflowSteps: currentManual.workflowSteps.map((step, idx) => ({
            ...step,
            expectedScreenBehavior: step.expectedScreenBehavior || 'System validates transaction parameters and commits record without validation errors.',
          })),
        };
      }

      setCurrentManual(updated);
      setIsAiGenerating(false);
      setSaveSuccessBanner('AI has synthesized and enhanced the User Manual with structured scenarios!');
      setTimeout(() => setSaveSuccessBanner(''), 4000);
    }, 600);
  };

  // Save manual to persistent store
  const handleSaveCurrentManual = () => {
    if (!currentManual) return;
    const updated: UserManualDoc = {
      ...currentManual,
      updatedAt: new Date().toLocaleDateString('en-GB'),
    };
    const idx = userManuals.findIndex(
      (m) => m.id === updated.id || (m.ticketNumber && m.ticketNumber === updated.ticketNumber)
    );
    let newList: UserManualDoc[];
    if (idx >= 0) {
      newList = [...userManuals];
      newList[idx] = updated;
    } else {
      newList = [updated, ...userManuals];
    }
    onSaveManuals(newList);
    setCurrentManual(updated);
    setSaveSuccessBanner('User Manual saved to storage successfully!');
    setTimeout(() => setSaveSuccessBanner(''), 3500);
  };

  // Export to Word (.docx)
  const handleDownloadWord = async () => {
    if (!currentManual) return;
    try {
      setIsExportingWord(true);
      await exportUserManualToDocx(currentManual);
      setSaveSuccessBanner('Microsoft Word (.docx) generated & downloaded successfully!');
      setTimeout(() => setSaveSuccessBanner(''), 3500);
    } catch (e) {
      console.error('Failed to export Word document', e);
      alert('Failed to generate Word document. Please verify step screenshots and try again.');
    } finally {
      setIsExportingWord(false);
    }
  };

  // ==========================================
  // EXCEL ATTACHMENT & PARSING LOGIC (.xlsx, .xls, .csv)
  // ==========================================
  const handleTriggerExcelUpload = () => {
    if (excelInputRef.current) {
      excelInputRef.current.value = '';
      excelInputRef.current.click();
    }
  };

  const handleExcelFileUploaded = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentManual) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const binaryStr = event.target?.result;
        if (!binaryStr) return;

        const workbook = XLSX.read(binaryStr, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (rawJson.length === 0) {
          alert('Uploaded Excel file appears to be empty or has no data rows.');
          return;
        }

        // Map columns intelligently
        const parsedTestCases: AttachedExcelTestCase[] = rawJson.map((row, index) => {
          const keys = Object.keys(row);

          const findKey = (candidates: string[]) => {
            return keys.find((k) =>
              candidates.some((c) => k.toLowerCase().trim().includes(c.toLowerCase()))
            );
          };

          const idKey = findKey(['test case id', 'tc id', 'id', 'case id', 'tc#', 'test id']);
          const scenarioKey = findKey(['test scenario', 'scenario', 'summary', 'feature', 'title', 'test name']);
          const stepsKey = findKey(['test steps', 'steps', 'description', 'test case steps', 'details', 'action']);
          const expectedKey = findKey(['expected result', 'expected', 'expected behavior', 'expected output']);
          const actualKey = findKey(['actual result', 'actual', 'observed']);
          const statusKey = findKey(['status', 'result', 'execution status', 'state']);

          const tcId = idKey && row[idKey] ? String(row[idKey]).trim() : `TC-${String(index + 1).padStart(2, '0')}`;
          const scenario = scenarioKey && row[scenarioKey] ? String(row[scenarioKey]).trim() : `Test Scenario ${index + 1}`;
          const descriptionOrSteps = stepsKey && row[stepsKey] ? String(row[stepsKey]).trim() : '';
          const expectedResult = expectedKey && row[expectedKey] ? String(row[expectedKey]).trim() : 'System responds as expected without error.';
          const actualResult = actualKey && row[actualKey] ? String(row[actualKey]).trim() : undefined;
          const status = statusKey && row[statusKey] ? String(row[statusKey]).trim() : 'Passed';

          return {
            id: `excel-tc-${Date.now()}-${index}`,
            testCaseId: tcId,
            scenario,
            descriptionOrSteps,
            expectedResult,
            actualResult,
            status,
          };
        });

        const updated: UserManualDoc = {
          ...currentManual,
          attachedExcelFileName: file.name,
          attachedTestCases: parsedTestCases,
          attachedTestCasesSummary: `Attached QA Test Cases from '${file.name}' with ${parsedTestCases.length} test scenarios covering functional validations and expected outputs.`,
        };

        setCurrentManual(updated);
        setSaveSuccessBanner(`Attached '${file.name}' successfully! Extracted ${parsedTestCases.length} test cases.`);
        setTimeout(() => setSaveSuccessBanner(''), 5000);
      } catch (err) {
        console.error('Failed to parse Excel file', err);
        alert('Could not parse this spreadsheet. Please ensure it is a valid .xlsx, .xls or .csv file.');
      }
    };

    reader.readAsBinaryString(file);
  };

  // Convert attached Excel Test Cases into Step-by-Step User Manual Walkthrough
  const handleConvertExcelCasesToSteps = () => {
    if (!currentManual || !currentManual.attachedTestCases || currentManual.attachedTestCases.length === 0) return;

    const newSteps: ManualStep[] = currentManual.attachedTestCases.map((tc, idx) => ({
      stepNumber: idx + 1,
      actionTitle: `${tc.testCaseId}: ${tc.scenario}`,
      actionDescription: tc.descriptionOrSteps || `Execute operational steps for ${tc.scenario}.`,
      expectedScreenBehavior: tc.expectedResult || 'System performs action and updates status successfully.',
      screenshotCaption: `UI verification for ${tc.testCaseId}`,
    }));

    setCurrentManual({
      ...currentManual,
      workflowSteps: newSteps,
    });
    setSaveSuccessBanner(`Converted ${newSteps.length} test cases directly into User Manual Workflow Steps!`);
    setTimeout(() => setSaveSuccessBanner(''), 4500);
  };

  // Remove attached Excel file
  const handleRemoveExcelAttachment = () => {
    if (!currentManual) return;
    setCurrentManual({
      ...currentManual,
      attachedExcelFileName: undefined,
      attachedTestCases: [],
      attachedTestCasesSummary: undefined,
    });
    setSaveSuccessBanner('Excel attachment removed.');
    setTimeout(() => setSaveSuccessBanner(''), 3000);
  };

  // ==========================================
  // SCENARIO & TEST CASE BUILDER (MANUAL INPUT)
  // ==========================================
  const handleAddCustomTestCase = () => {
    if (!currentManual) return;
    const currentList = currentManual.attachedTestCases || [];
    const newIdx = currentList.length + 1;
    const newCase: AttachedExcelTestCase = {
      id: `custom-tc-${Date.now()}`,
      testCaseId: `TC-${String(newIdx).padStart(2, '0')}`,
      scenario: 'New Functional Scenario',
      descriptionOrSteps: '1. Navigate to screen\n2. Input required parameters\n3. Click Submit',
      expectedResult: 'Record successfully processed with status banner.',
      status: 'Passed',
    };
    setCurrentManual({
      ...currentManual,
      attachedTestCases: [...currentList, newCase],
    });
  };

  const handleUpdateTestCase = (index: number, field: keyof AttachedExcelTestCase, val: string) => {
    if (!currentManual || !currentManual.attachedTestCases) return;
    const updatedList = [...currentManual.attachedTestCases];
    updatedList[index] = { ...updatedList[index], [field]: val };
    setCurrentManual({
      ...currentManual,
      attachedTestCases: updatedList,
    });
  };

  const handleRemoveTestCase = (index: number) => {
    if (!currentManual || !currentManual.attachedTestCases) return;
    const updatedList = currentManual.attachedTestCases.filter((_, i) => i !== index);
    setCurrentManual({
      ...currentManual,
      attachedTestCases: updatedList,
    });
  };

  // ==========================================
  // WORKFLOW STEPS & SCREENSHOT UPLOADS
  // ==========================================
  const handleAddStep = () => {
    if (!currentManual) return;
    const nextStepNum = currentManual.workflowSteps.length + 1;
    const newStep: ManualStep = {
      stepNumber: nextStepNum,
      actionTitle: `Step ${nextStepNum}: Action Title`,
      actionDescription: 'Describe the user action required on this screen...',
      expectedScreenBehavior: 'Specify how the interface responds and updates...',
      screenshotCaption: `UI View for Step ${nextStepNum}`,
    };
    setCurrentManual({
      ...currentManual,
      workflowSteps: [...currentManual.workflowSteps, newStep],
    });
  };

  const handleRemoveStep = (index: number) => {
    if (!currentManual) return;
    const updated = currentManual.workflowSteps
      .filter((_, i) => i !== index)
      .map((s, idx) => ({ ...s, stepNumber: idx + 1 }));
    setCurrentManual({
      ...currentManual,
      workflowSteps: updated,
    });
  };

  const handleUpdateStep = (index: number, field: keyof ManualStep, val: any) => {
    if (!currentManual) return;
    const updated = [...currentManual.workflowSteps];
    updated[index] = { ...updated[index], [field]: val };
    setCurrentManual({
      ...currentManual,
      workflowSteps: updated,
    });
  };

  // Trigger Screenshot Upload for a specific step
  const handleTriggerScreenshotUpload = (stepIndex: number) => {
    setTargetStepIndexForUpload(stepIndex);
    if (screenshotInputRef.current) {
      screenshotInputRef.current.value = '';
      screenshotInputRef.current.click();
    }
  };

  const handleScreenshotUploaded = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || targetStepIndexForUpload === null || !currentManual) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        const updatedSteps = [...currentManual.workflowSteps];
        updatedSteps[targetStepIndexForUpload] = {
          ...updatedSteps[targetStepIndexForUpload],
          screenshotUrl: dataUrl,
          screenshotCaption:
            updatedSteps[targetStepIndexForUpload].screenshotCaption ||
            `Figure ${targetStepIndexForUpload + 1}: ${file.name.replace(/\.[^/.]+$/, '')}`,
        };
        setCurrentManual({
          ...currentManual,
          workflowSteps: updatedSteps,
        });
        setSaveSuccessBanner('Screenshot attached to step successfully!');
        setTimeout(() => setSaveSuccessBanner(''), 3000);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveScreenshot = (stepIndex: number) => {
    if (!currentManual) return;
    const updatedSteps = [...currentManual.workflowSteps];
    updatedSteps[stepIndex] = {
      ...updatedSteps[stepIndex],
      screenshotUrl: undefined,
    };
    setCurrentManual({
      ...currentManual,
      workflowSteps: updatedSteps,
    });
  };

  // ==========================================
  // PREREQUISITES & FAQS
  // ==========================================
  const handleAddPrerequisite = () => {
    if (!currentManual) return;
    setCurrentManual({
      ...currentManual,
      prerequisites: [...currentManual.prerequisites, 'User role permission and system access prerequisite...'],
    });
  };

  const handleUpdatePrerequisite = (index: number, val: string) => {
    if (!currentManual) return;
    const updated = [...currentManual.prerequisites];
    updated[index] = val;
    setCurrentManual({
      ...currentManual,
      prerequisites: updated,
    });
  };

  const handleRemovePrerequisite = (index: number) => {
    if (!currentManual) return;
    setCurrentManual({
      ...currentManual,
      prerequisites: currentManual.prerequisites.filter((_, i) => i !== index),
    });
  };

  const handleAddFaq = () => {
    if (!currentManual) return;
    setCurrentManual({
      ...currentManual,
      faqOrTroubleshooting: [
        ...currentManual.faqOrTroubleshooting,
        { question: 'What should I do if this step fails?', answer: 'Check input format and verify operational authorization.' },
      ],
    });
  };

  const handleUpdateFaq = (index: number, field: 'question' | 'answer', val: string) => {
    if (!currentManual) return;
    const updated = [...currentManual.faqOrTroubleshooting];
    updated[index] = { ...updated[index], [field]: val };
    setCurrentManual({
      ...currentManual,
      faqOrTroubleshooting: updated,
    });
  };

  const handleRemoveFaq = (index: number) => {
    if (!currentManual) return;
    setCurrentManual({
      ...currentManual,
      faqOrTroubleshooting: currentManual.faqOrTroubleshooting.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
      {/* Hidden File Input for Step Screenshots */}
      <input
        type="file"
        ref={screenshotInputRef}
        onChange={handleScreenshotUploaded}
        accept="image/*"
        className="hidden"
      />

      {/* Hidden File Input for Excel Test Cases Attachment */}
      <input
        type="file"
        ref={excelInputRef}
        onChange={handleExcelFileUploaded}
        accept=".xlsx, .xls, .csv"
        className="hidden"
      />

      {/* Top Header Banner */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">
                User Manual Generator &amp; Word Export
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Create user manuals with test case Excel attachments, scenarios, step-by-step screenshots &amp; export to Word (.docx).
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* View Mode Toggle: Editor vs Live Preview */}
          <div className="bg-slate-100 p-1 rounded-lg flex items-center border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setActiveTabMode('editor')}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTabMode === 'editor'
                  ? 'bg-white text-blue-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Editor Mode</span>
            </button>
            <button
              onClick={() => setActiveTabMode('preview')}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTabMode === 'preview'
                  ? 'bg-white text-blue-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview Document</span>
            </button>
          </div>

          {/* AI Auto-Generate */}
          <button
            onClick={handleAiGenerate}
            disabled={isAiGenerating || !currentManual}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            title="AI generates structured steps, overview, and FAQ"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isAiGenerating ? 'animate-spin' : ''}`} />
            <span>{isAiGenerating ? 'Generating...' : 'AI Enhance'}</span>
          </button>

          {/* Save Manual */}
          <button
            onClick={handleSaveCurrentManual}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-xs shadow-xs transition-colors cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Save Manual</span>
          </button>

          {/* Download Word Document */}
          <button
            onClick={handleDownloadWord}
            disabled={isExportingWord || !currentManual}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <Download className={`w-3.5 h-3.5 ${isExportingWord ? 'animate-bounce' : ''}`} />
            <span>{isExportingWord ? 'Exporting...' : 'Download Word (.docx)'}</span>
          </button>
        </div>
      </header>

      {/* Success Notification Banner */}
      {saveSuccessBanner && (
        <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-2 text-xs font-semibold text-emerald-800 flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveSuccessBanner}</span>
          </div>
          <button
            onClick={() => setSaveSuccessBanner('')}
            className="text-emerald-700 hover:text-emerald-900 font-bold text-xs cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Tickets & Manuals Selector */}
        <div className="w-72 bg-white border-r border-slate-200 flex flex-col shrink-0">
          <div className="p-3 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Manuals &amp; Tickets
            </span>
            <button
              onClick={handleCreateNewManual}
              className="flex items-center gap-1 px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-xs font-bold cursor-pointer transition-colors"
              title="Create a new User Manual from scratch"
            >
              <Plus className="w-3 h-3" />
              <span>New</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {tickets.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="font-semibold text-slate-600">No Tickets Created</p>
                <p className="mt-1 text-[11px]">Click '+ New' above to write a custom manual.</p>
              </div>
            ) : (
              tickets.map((t) => {
                const isSelected = t.ticketNumber === selectedTicketNo;
                const hasSaved = userManuals.some((m) => m.ticketNumber === t.ticketNumber);
                const tcCount = (testCasesMap[t.ticketNumber] || []).length;

                return (
                  <button
                    key={t.id}
                    onClick={() => handleSelectTicket(t.ticketNumber)}
                    className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50/80 border-blue-500 shadow-2xs'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-blue-700 font-mono">
                        #{t.ticketNumber}
                      </span>
                      <div className="flex items-center gap-1">
                        {hasSaved && (
                          <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded">
                            Saved
                          </span>
                        )}
                        <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded">
                          {tcCount} TCs
                        </span>
                      </div>
                    </div>
                    <div className="text-xs font-bold text-slate-900 truncate">
                      {t.featureName}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate mt-0.5">
                      {t.moduleName} • {t.clientName || 'Treasury Master'}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Center Canvas: Editor or Preview */}
        <div className="flex-1 overflow-y-auto p-6">
          {!currentManual ? (
            <div className="max-w-xl mx-auto my-12 text-center p-8 bg-white border border-slate-200 rounded-2xl shadow-2xs">
              <BookOpen className="w-12 h-12 text-blue-500 mx-auto mb-3 opacity-80" />
              <h3 className="text-base font-bold text-slate-900">Select or Create a User Manual</h3>
              <p className="text-xs text-slate-500 mt-1">
                Choose a ticket from the left panel or click '+ New' to start writing.
              </p>
            </div>
          ) : activeTabMode === 'editor' ? (
            /* =======================================================
               EDITOR MODE
               ======================================================= */
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Card 1: Document Metadata & Information */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Manual Information &amp; Header
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                    {currentManual.ticketNumber || 'CUSTOM'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="md:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">
                      Manual / Feature Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={currentManual.title}
                      onChange={(e) => setCurrentManual({ ...currentManual, title: e.target.value })}
                      placeholder="e.g. End-User Operational Manual: FX Spot Deal Management"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Target Module <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={currentManual.moduleName}
                      onChange={(e) => setCurrentManual({ ...currentManual, moduleName: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                    >
                      {modules.map((m) => (
                        <option key={m.id} value={m.name}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Ticket / Reference ID
                    </label>
                    <input
                      type="text"
                      value={currentManual.ticketNumber}
                      onChange={(e) => setCurrentManual({ ...currentManual, ticketNumber: e.target.value })}
                      placeholder="e.g. TM-1049"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Prepared By (Author)
                    </label>
                    <input
                      type="text"
                      value={currentManual.authorName}
                      onChange={(e) => setCurrentManual({ ...currentManual, authorName: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Author Email
                    </label>
                    <input
                      type="text"
                      value={currentManual.authorEmail}
                      onChange={(e) => setCurrentManual({ ...currentManual, authorEmail: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Client / System Name
                    </label>
                    <input
                      type="text"
                      value={currentManual.clientName}
                      onChange={(e) => setCurrentManual({ ...currentManual, clientName: e.target.value })}
                      placeholder="e.g. Treasury Master"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Document Version
                    </label>
                    <input
                      type="text"
                      value={currentManual.version}
                      onChange={(e) => setCurrentManual({ ...currentManual, version: e.target.value })}
                      placeholder="1.0"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Card 2: Feature Overview & Description */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Feature Overview &amp; Description
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Executive Overview &amp; Purpose
                    </label>
                    <textarea
                      rows={4}
                      value={currentManual.overview}
                      onChange={(e) => setCurrentManual({ ...currentManual, overview: e.target.value })}
                      placeholder="Describe the feature's business objective, who should use it, and what operational problem it solves..."
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 leading-relaxed focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  {/* Prerequisites list */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-700">
                        Prerequisites &amp; Access Requirements ({currentManual.prerequisites?.length || 0})
                      </label>
                      <button
                        onClick={handleAddPrerequisite}
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" /> Add Prerequisite
                      </button>
                    </div>
                    <div className="space-y-2">
                      {(currentManual.prerequisites || []).map((prereq, pIdx) => (
                        <div key={pIdx} className="flex items-center gap-2">
                          <span className="text-slate-400 text-xs font-mono">•</span>
                          <input
                            type="text"
                            value={prereq}
                            onChange={(e) => handleUpdatePrerequisite(pIdx, e.target.value)}
                            className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                          />
                          <button
                            onClick={() => handleRemovePrerequisite(pIdx)}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-md transition-colors cursor-pointer"
                            title="Remove prerequisite"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 3: ATTACH TEST CASES EXCEL FILE (.xlsx, .xls, .csv) */}
              <div className="bg-white rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50/20 p-6 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                    <div>
                      <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                        Attach Test Cases Excel File (.xlsx, .xls, .csv)
                      </span>
                      <p className="text-[11px] text-emerald-700 font-medium">
                        Upload your QA spreadsheet to automatically import Test Scenarios, Steps, Descriptions &amp; Expected Results.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleTriggerExcelUpload}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Excel File</span>
                  </button>
                </div>

                {/* Upload Status / Action Box */}
                {currentManual.attachedExcelFileName ? (
                  <div className="bg-white border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                        <FileCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 font-mono">
                            {currentManual.attachedExcelFileName}
                          </span>
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold">
                            {currentManual.attachedTestCases?.length || 0} Test Cases Extracted
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Test cases will be included in the verification table of the exported Word document.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={handleConvertExcelCasesToSteps}
                        className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg border border-blue-200 transition-colors cursor-pointer"
                        title="Import all extracted Excel test cases into Step-by-Step UI walkthrough"
                      >
                        Convert to Manual Steps
                      </button>
                      <button
                        onClick={handleTriggerExcelUpload}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                        title="Replace attached file"
                      >
                        Replace
                      </button>
                      <button
                        onClick={handleRemoveExcelAttachment}
                        className="p-1.5 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                        title="Remove attached Excel file"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={handleTriggerExcelUpload}
                    className="border border-dashed border-slate-300 rounded-xl p-6 text-center hover:bg-emerald-50/50 hover:border-emerald-400 transition-all cursor-pointer"
                  >
                    <Upload className="w-8 h-8 mx-auto text-emerald-600 mb-2 opacity-70" />
                    <p className="text-xs font-bold text-slate-800">
                      Click here to attach a Test Cases Excel File (.xlsx, .csv)
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Columns recognized: Test Case ID, Test Scenario, Steps / Description, Expected Result, Status
                    </p>
                  </div>
                )}
              </div>

              {/* Card 4: SCENARIOS & TEST CASES VERIFICATION MATRIX (ADD / EDIT) */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Test Scenarios &amp; Verification Matrix ({currentManual.attachedTestCases?.length || 0})
                    </span>
                  </div>
                  <button
                    onClick={handleAddCustomTestCase}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Custom Scenario</span>
                  </button>
                </div>

                {(!currentManual.attachedTestCases || currentManual.attachedTestCases.length === 0) ? (
                  <div className="p-6 text-center bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500">
                    <p className="font-semibold text-slate-700">No test cases attached yet</p>
                    <p className="mt-1 text-[11px]">
                      Upload an Excel spreadsheet above or click 'Add Custom Scenario' to specify verification items.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {currentManual.attachedTestCases.map((tc, tcIdx) => (
                      <div
                        key={tc.id || tcIdx}
                        className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 space-y-3 hover:border-slate-300 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 flex-1">
                            <input
                              type="text"
                              value={tc.testCaseId}
                              onChange={(e) => handleUpdateTestCase(tcIdx, 'testCaseId', e.target.value)}
                              placeholder="TC-01"
                              className="w-24 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-blue-700 focus:outline-none"
                            />
                            <input
                              type="text"
                              value={tc.scenario}
                              onChange={(e) => handleUpdateTestCase(tcIdx, 'scenario', e.target.value)}
                              placeholder="Scenario title / summary"
                              className="flex-1 px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:outline-none"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <select
                              value={tc.status || 'Passed'}
                              onChange={(e) => handleUpdateTestCase(tcIdx, 'status', e.target.value)}
                              className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
                            >
                              <option value="Passed">Passed</option>
                              <option value="In Progress">In Progress</option>
                              <option value="Pending">Pending</option>
                              <option value="Failed">Failed</option>
                            </select>
                            <button
                              onClick={() => handleRemoveTestCase(tcIdx)}
                              className="p-1.5 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                              title="Delete scenario"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                          <div>
                            <label className="block font-semibold text-slate-600 mb-1">
                              Steps / Action Description
                            </label>
                            <textarea
                              rows={2}
                              value={tc.descriptionOrSteps}
                              onChange={(e) => handleUpdateTestCase(tcIdx, 'descriptionOrSteps', e.target.value)}
                              placeholder="1. Navigate to screen... 2. Click Submit..."
                              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block font-semibold text-slate-600 mb-1">
                              Expected Screen Result / Output
                            </label>
                            <textarea
                              rows={2}
                              value={tc.expectedResult}
                              onChange={(e) => handleUpdateTestCase(tcIdx, 'expectedResult', e.target.value)}
                              placeholder="System verifies input and displays success..."
                              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Card 5: STEP-BY-STEP UI WALKTHROUGH & SCREENSHOTS */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-blue-600" />
                    <div>
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Step-by-Step UI Walkthrough &amp; Screenshots ({currentManual.workflowSteps.length})
                      </span>
                      <p className="text-[11px] text-slate-500">
                        Add numbered visual steps with screenshots that will be embedded into the Word manual.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleAddStep}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Step Walkthrough</span>
                  </button>
                </div>

                <div className="space-y-6">
                  {currentManual.workflowSteps.map((step, sIdx) => (
                    <div
                      key={sIdx}
                      className="border border-slate-200 rounded-2xl p-5 bg-slate-50/50 space-y-4 shadow-2xs"
                    >
                      <div className="flex items-center justify-between gap-2 border-b border-slate-200/60 pb-3">
                        <div className="flex items-center gap-2 flex-1">
                          <span className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                            {step.stepNumber}
                          </span>
                          <input
                            type="text"
                            value={step.actionTitle}
                            onChange={(e) => handleUpdateStep(sIdx, 'actionTitle', e.target.value)}
                            placeholder={`Step ${sIdx + 1}: Action Title`}
                            className="flex-1 font-bold text-sm text-slate-900 bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>
                        <button
                          onClick={() => handleRemoveStep(sIdx)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-md transition-colors cursor-pointer"
                          title="Delete this step"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">
                            User Action / Scenario Description <span className="text-red-500">*</span>
                          </label>
                          <textarea
                            rows={3}
                            value={step.actionDescription}
                            onChange={(e) => handleUpdateStep(sIdx, 'actionDescription', e.target.value)}
                            placeholder="Explain the precise action the operator needs to take..."
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-slate-700 mb-1">
                            Expected Screen Behavior / Result
                          </label>
                          <textarea
                            rows={3}
                            value={step.expectedScreenBehavior}
                            onChange={(e) => handleUpdateStep(sIdx, 'expectedScreenBehavior', e.target.value)}
                            placeholder="How the interface responds, modal opens, confirmation banners..."
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Screenshot Upload for this Step */}
                      <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                            <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                            <span>UI Screenshot / Screen Capture</span>
                          </label>
                          <button
                            onClick={() => handleTriggerScreenshotUpload(sIdx)}
                            className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                          >
                            <Upload className="w-3 h-3" />
                            <span>{step.screenshotUrl ? 'Replace Screenshot' : 'Upload Screenshot'}</span>
                          </button>
                        </div>

                        {step.screenshotUrl ? (
                          <div className="space-y-2">
                            <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-slate-100 max-h-60 flex items-center justify-center group">
                              <img
                                src={step.screenshotUrl}
                                alt={step.screenshotCaption || 'Step Screenshot'}
                                className="max-h-60 w-auto object-contain"
                              />
                              <button
                                onClick={() => handleRemoveScreenshot(sIdx)}
                                className="absolute top-2 right-2 p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-md shadow-md cursor-pointer transition-colors"
                                title="Delete screenshot"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                            <input
                              type="text"
                              value={step.screenshotCaption || ''}
                              onChange={(e) => handleUpdateStep(sIdx, 'screenshotCaption', e.target.value)}
                              placeholder="Screenshot caption (e.g. Figure 1: FX Spot Deal Entry Modal)"
                              className="w-full px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 italic focus:bg-white focus:outline-none"
                            />
                          </div>
                        ) : (
                          <div
                            onClick={() => handleTriggerScreenshotUpload(sIdx)}
                            className="border border-dashed border-slate-300 rounded-lg p-4 text-center hover:bg-blue-50/50 hover:border-blue-400 transition-colors cursor-pointer"
                          >
                            <Upload className="w-5 h-5 mx-auto text-slate-400 mb-1" />
                            <p className="text-xs text-slate-600 font-semibold">
                              Click or Drag image here to attach UI Screenshot
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5">PNG, JPG, WebP supported</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card 6: Troubleshooting & FAQs */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-purple-600" />
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Troubleshooting &amp; Frequently Asked Questions ({currentManual.faqOrTroubleshooting?.length || 0})
                    </span>
                  </div>
                  <button
                    onClick={handleAddFaq}
                    className="flex items-center gap-1 text-xs font-bold text-purple-600 hover:text-purple-800 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add FAQ</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {(currentManual.faqOrTroubleshooting || []).map((faq, fIdx) => (
                    <div key={fIdx} className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="text"
                          value={faq.question}
                          onChange={(e) => handleUpdateFaq(fIdx, 'question', e.target.value)}
                          placeholder="Question (e.g. What if the deal does not authorize?)"
                          className="flex-1 px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:outline-none"
                        />
                        <button
                          onClick={() => handleRemoveFaq(fIdx)}
                          className="p-1 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <textarea
                        rows={2}
                        value={faq.answer}
                        onChange={(e) => handleUpdateFaq(fIdx, 'answer', e.target.value)}
                        placeholder="Resolution or guidance..."
                        className="w-full px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Sticky Action Bar */}
              <div className="sticky bottom-4 bg-slate-900 text-white rounded-2xl p-4 shadow-xl flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold">Ready to produce your User Manual?</p>
                  <p className="text-[11px] text-slate-400">
                    Preview the rendered document layout or download the Microsoft Word file.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTabMode('preview')}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Preview Document
                  </button>
                  <button
                    onClick={handleDownloadWord}
                    disabled={isExportingWord}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold rounded-xl text-xs shadow-md transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Word (.docx)</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* =======================================================
               PREVIEW DOCUMENT MODE (WORD / SOP LAYOUT)
               ======================================================= */
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Document Actions Bar */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Viewing Formatted Preview
                  </span>
                  <span className="text-[11px] bg-blue-100 text-blue-800 font-mono font-bold px-2 py-0.5 rounded">
                    v{currentManual.version}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTabMode('editor')}
                    className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Back to Editor</span>
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print / PDF</span>
                  </button>
                  <button
                    onClick={handleDownloadWord}
                    disabled={isExportingWord}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Word (.docx)</span>
                  </button>
                </div>
              </div>

              {/* Formatted Word Paper Sheet */}
              <div className="bg-white rounded-2xl border border-slate-300 p-8 sm:p-12 shadow-sm space-y-8 font-sans">
                {/* Header Band */}
                <div className="border-b-2 border-blue-900 pb-4 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-extrabold uppercase tracking-widest text-blue-800">
                      Standard Operating Procedure • User Manual
                    </div>
                    <h1 className="text-2xl font-extrabold text-slate-900 mt-1">
                      {currentManual.title}
                    </h1>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Module: <strong className="text-slate-700">{currentManual.moduleName}</strong> | System: <strong className="text-slate-700">{currentManual.clientName}</strong>
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-bold px-2.5 py-1 bg-slate-100 text-slate-800 rounded border border-slate-200">
                      Doc v{currentManual.version}
                    </span>
                  </div>
                </div>

                {/* Metadata Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                  <div className="grid grid-cols-4 bg-slate-50 border-b border-slate-200 divide-x divide-slate-200 font-semibold text-slate-600">
                    <div className="p-2.5">Ticket / Reference</div>
                    <div className="p-2.5 text-slate-900 font-mono font-bold">{currentManual.ticketNumber || 'N/A'}</div>
                    <div className="p-2.5">Target Module</div>
                    <div className="p-2.5 text-slate-900 font-bold">{currentManual.moduleName}</div>
                  </div>
                  <div className="grid grid-cols-4 divide-x divide-slate-200 font-semibold text-slate-600">
                    <div className="p-2.5 bg-slate-50">Prepared By</div>
                    <div className="p-2.5 text-slate-900">{currentManual.authorName} ({currentManual.authorEmail})</div>
                    <div className="p-2.5 bg-slate-50">Release Date</div>
                    <div className="p-2.5 text-slate-900">{currentManual.updatedAt || new Date().toLocaleDateString()}</div>
                  </div>
                </div>

                {/* Section 1: Executive Overview */}
                <div className="space-y-2">
                  <h2 className="text-sm font-extrabold text-blue-900 uppercase tracking-wider border-b border-slate-100 pb-1">
                    1. Executive Overview &amp; Purpose
                  </h2>
                  <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-line">
                    {currentManual.overview}
                  </p>
                </div>

                {/* Section 2: Prerequisites */}
                <div className="space-y-2">
                  <h2 className="text-sm font-extrabold text-blue-900 uppercase tracking-wider border-b border-slate-100 pb-1">
                    2. Prerequisites &amp; System Permissions
                  </h2>
                  <ul className="list-disc list-inside text-xs text-slate-800 space-y-1 pl-1">
                    {(currentManual.prerequisites || []).map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                </div>

                {/* Section 3: Step-by-Step UI Walkthrough with Screenshots */}
                <div className="space-y-4">
                  <h2 className="text-sm font-extrabold text-blue-900 uppercase tracking-wider border-b border-slate-100 pb-1">
                    3. Step-by-Step Operational Workflow &amp; UI Walkthrough
                  </h2>

                  <div className="space-y-6">
                    {currentManual.workflowSteps.map((step) => (
                      <div key={step.stepNumber} className="space-y-2.5 border-l-2 border-blue-500 pl-4 py-1">
                        <h3 className="text-xs font-bold text-slate-900">
                          Step {step.stepNumber}: {step.actionTitle}
                        </h3>
                        <p className="text-xs text-slate-700">
                          <strong className="text-slate-900">Action:</strong> {step.actionDescription}
                        </p>

                        {/* Expected Screen Result Box */}
                        {step.expectedScreenBehavior && (
                          <div className="bg-blue-50/70 border-l-2 border-blue-600 p-2.5 rounded-r-lg text-xs text-blue-900">
                            <strong>Expected Screen Response:</strong> {step.expectedScreenBehavior}
                          </div>
                        )}

                        {/* Screenshot */}
                        {step.screenshotUrl ? (
                          <div className="mt-2 space-y-1">
                            <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50 p-2">
                              <img
                                src={step.screenshotUrl}
                                alt={step.screenshotCaption || 'Step Visual'}
                                className="max-h-72 mx-auto object-contain rounded"
                              />
                            </div>
                            <p className="text-[10px] text-center italic text-slate-500">
                              {step.screenshotCaption || `Figure ${step.stepNumber}: Operational View`}
                            </p>
                          </div>
                        ) : (
                          <p className="text-[10px] text-slate-400 italic">
                            [UI Screen reference for Step {step.stepNumber}]
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Section 4: Attached Test Coverage & Verification Matrix */}
                {currentManual.attachedTestCases && currentManual.attachedTestCases.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                      <h2 className="text-sm font-extrabold text-blue-900 uppercase tracking-wider">
                        4. Associated QA Test Coverage &amp; Verification Matrix
                      </h2>
                      {currentManual.attachedExcelFileName && (
                        <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold">
                          From: {currentManual.attachedExcelFileName}
                        </span>
                      )}
                    </div>

                    <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-blue-900 text-white font-bold text-[11px]">
                            <th className="p-2.5 w-20">Test ID</th>
                            <th className="p-2.5 w-1/4">Scenario</th>
                            <th className="p-2.5">Steps / Action Description</th>
                            <th className="p-2.5 w-1/4">Expected Result</th>
                            <th className="p-2.5 w-20 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {currentManual.attachedTestCases.map((tc, idx) => (
                            <tr key={tc.id || idx} className="hover:bg-slate-50">
                              <td className="p-2.5 font-mono font-bold text-blue-700">{tc.testCaseId}</td>
                              <td className="p-2.5 font-semibold text-slate-900">{tc.scenario}</td>
                              <td className="p-2.5 text-slate-700 whitespace-pre-line">{tc.descriptionOrSteps}</td>
                              <td className="p-2.5 text-slate-700">{tc.expectedResult}</td>
                              <td className="p-2.5 text-center">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                  {tc.status || 'Passed'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Section 5: Troubleshooting & FAQs */}
                {(currentManual.faqOrTroubleshooting || []).length > 0 && (
                  <div className="space-y-3">
                    <h2 className="text-sm font-extrabold text-blue-900 uppercase tracking-wider border-b border-slate-100 pb-1">
                      {currentManual.attachedTestCases && currentManual.attachedTestCases.length > 0 ? '5' : '4'}. Troubleshooting &amp; Operational FAQs
                    </h2>
                    <div className="space-y-3 text-xs">
                      {currentManual.faqOrTroubleshooting.map((faq, i) => (
                        <div key={i} className="space-y-0.5">
                          <p className="font-bold text-blue-900">Q{i + 1}: {faq.question}</p>
                          <p className="text-slate-700 pl-4">A: {faq.answer}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Document Footer Sign-off */}
                <div className="border-t border-slate-200 pt-6 text-[10px] text-slate-400 flex items-center justify-between">
                  <span>Beacon QA Platform • Confidential Standard Operating Manual</span>
                  <span>Generated for: {currentManual.clientName}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
