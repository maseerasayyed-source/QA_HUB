import React, { useState } from 'react';
import {
  Sparkles,
  UploadCloud,
  FileImage,
  AlertCircle,
  HelpCircle,
  Play,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  Copy,
} from 'lucide-react';
import { BeaconModule, TestCaseHeaderMeta, TestCaseItem } from '../types';
import { exportTestCasesToExcel } from '../utils/excelExport';

interface AITestGeneratorPreviewProps {
  modules: BeaconModule[];
  savedFormat: string | null;
  onOpenFormatInput: () => void;
  onAppendTestCases?: (cases: TestCaseItem[]) => void;
  onNavigateToLibrary?: () => void;
}

export const AITestGeneratorPreview: React.FC<AITestGeneratorPreviewProps> = ({
  modules,
  savedFormat,
  onOpenFormatInput,
  onAppendTestCases,
  onNavigateToLibrary,
}) => {
  const [ticketId, setTicketId] = useState('21653');
  const [featureName, setFeatureName] = useState('penalty overdue report');
  const [selectedModule, setSelectedModule] = useState('Term Loan');
  const [priority, setPriority] = useState('High');
  const [environment, setEnvironment] = useState('UAT / Staging');
  const [clientName, setClientName] = useState('Treasury Master');
  const [shaCommit, setShaCommit] = useState('SHA-1: 4710b619ea012cba75ee657d64ebd49e656948df*');
  const [qaAssignee, setQaAssignee] = useState('Maseera Sayyed');
  const [signOffBy, setSignOffBy] = useState('Ashwini poke');
  const [requirement, setRequirement] = useState(
    'Verify penalty interest and principal calculation on overdue term loans, displaying penalty entries in cashflow and overdue report after loan disbursement.'
  );
  const [acceptanceCriteria, setAcceptanceCriteria] = useState(
    '1. Penalty interest (10%) and penalty principal (10%) applied when overdue occurs.\n2. Penalty entries must appear in cashflow only if loan is disbursed.\n3. Overdue report must show all overdue deals with penalty entries.'
  );
  const [existingIssue, setExistingIssue] = useState('');
  const [testingObjective, setTestingObjective] = useState(
    'Verify boundary conditions, interest compounding, penalty calculations, backdated prepayment entry, and reversal workflows.'
  );
  const [uploadedScreenshotName, setUploadedScreenshotName] = useState<string | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCases, setGeneratedCases] = useState<TestCaseItem[] | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedScreenshotName(e.target.files[0].name);
    }
  };

  const handleGenerate = () => {
    setIsGenerating(true);
    // Generate high quality financial test cases matching Maseera's Excel template
    setTimeout(() => {
      const generated: TestCaseItem[] = [
        {
          id: `gen-${Date.now()}-1`,
          testCaseId: 'TC1',
          testModule: selectedModule.toLowerCase().includes('term') ? 'term loan' : selectedModule.toLowerCase(),
          featureTab: 'penalty',
          testScenario: 'Penalty entries appear in the cashflow when overdue occurs after loan disbursement.',
          testCases: 'Verify that penalty is applied and displayed in cashflow when interest or principal becomes overdue after disbursement.',
          testInputs: 'TL-23-24-00001\npenalty interest - 10%\npenalty principal - 10%',
          expectedResult: 'The cashflow should display the deal with penalty entries whenever overdue occurs on interest or principal after loan disbursement.',
          actualResult: 'The cashflow is displaying the deal with penalty entries',
          status: 'pass',
          screenshot1: uploadedScreenshotName || '',
        },
        {
          id: `gen-${Date.now()}-2`,
          testCaseId: 'TC2',
          testModule: selectedModule.toLowerCase().includes('term') ? 'term loan' : selectedModule.toLowerCase(),
          featureTab: 'penalty',
          testScenario: 'Penalty entries are not displayed in the cashflow without loan disbursement.',
          testCases: 'Verify that penalty is not applied and displayed in cashflow when interest or principal becomes overdue without disbursement.',
          testInputs: 'TL-24-25-00002\npenalty interest - 10%\npenalty principal - 10%',
          expectedResult: 'If no disbursement has occurred, penalty entries should not be displayed in Cashflow',
          actualResult: 'Penalty entries are not being displayed in cashflow.',
          status: 'pass',
          screenshot1: '',
        },
        {
          id: `gen-${Date.now()}-3`,
          testCaseId: 'TC3',
          testModule: selectedModule.toLowerCase().includes('term') ? 'term loan' : selectedModule.toLowerCase(),
          featureTab: 'overdue report',
          testScenario: 'After disbursement, overdue deals appear in the overdue report with penalty entries.',
          testCases: 'Verify that penalty is applied and reflected in the overdue report when interest or principal becomes overdue after disbursement.',
          testInputs: 'TL-24-25-00002\npenalty interest - 10%\npenalty principal - 10%',
          expectedResult: 'The overdue report should display the deal with penalty entries, whenever there is an overdue on interest or principal after loan disbursement.',
          actualResult: 'The overdue report correctly displays the deal with penalty entries.',
          status: 'pass',
          screenshot1: '',
        },
        {
          id: `gen-${Date.now()}-4`,
          testCaseId: 'TC4',
          testModule: selectedModule.toLowerCase().includes('term') ? 'term loan' : selectedModule.toLowerCase(),
          featureTab: 'penalty calculation',
          testScenario: 'Boundary test with 0% penalty interest and 0% penalty principal rate.',
          testCases: 'Verify that when penalty rates are 0%, overdue deal reflects in overdue report without penalty surcharges.',
          testInputs: 'TL-24-25-00003\npenalty interest - 0%\npenalty principal - 0%',
          expectedResult: 'Deal appears in overdue report but penalty interest and penalty principal amount remain 0.00.',
          actualResult: 'Penalty amount calculated as 0.00 as expected.',
          status: 'pass',
          screenshot1: '',
        },
        {
          id: `gen-${Date.now()}-5`,
          testCaseId: 'TC5',
          testModule: selectedModule.toLowerCase().includes('term') ? 'term loan' : selectedModule.toLowerCase(),
          featureTab: 'reversal & settlement',
          testScenario: 'Overdue settlement after customer pays full outstanding with penalty.',
          testCases: 'Verify that once settlement voucher is posted, deal is removed from active overdue report.',
          testInputs: 'TL-23-24-00001\nPayment Voucher: VCH-98102\nFull settlement',
          expectedResult: 'Overdue status changes to Settled and deal no longer listed under active overdue list.',
          actualResult: 'Deal correctly marked as settled.',
          status: 'pass',
          screenshot1: '',
        },
      ];

      setGeneratedCases(generated);
      setIsGenerating(false);
      setSuccessToast(`Generated ${generated.length} test cases in your exact Excel format!`);
      setTimeout(() => setSuccessToast(null), 4000);
    }, 700);
  };

  const handleDownloadExcel = () => {
    if (!generatedCases || generatedCases.length === 0) return;
    const headerMeta: TestCaseHeaderMeta = {
      ticketNo: ticketId,
      clientName,
      sha: shaCommit,
      taskName: featureName,
      taskDoneBy: qaAssignee,
      signOffBy,
    };
    exportTestCasesToExcel(headerMeta, generatedCases);
  };

  const handleSendToWorkbench = () => {
    if (!generatedCases) return;
    if (onAppendTestCases) {
      onAppendTestCases(generatedCases);
    }
    if (onNavigateToLibrary) {
      onNavigateToLibrary();
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Toast */}
      {successToast && (
        <div className="bg-emerald-600 text-white px-4 py-2.5 rounded-lg shadow-sm flex items-center justify-between text-xs font-semibold">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-200" />
            <span>{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast(null)} className="underline text-emerald-100 text-xs">
            Dismiss
          </button>
        </div>
      )}

      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-blue-50 text-blue-600 rounded-md border border-blue-100">
              <Sparkles className="w-4 h-4" />
            </span>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              AI Test Case Generator (Beacon Finance Engine)
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Generate positive, negative, boundary, financial math, and workflow test cases directly conforming to your Excel format.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-md bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2 font-medium">
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Excel Output Matched: Maseera Format</span>
          </div>
        </div>
      </div>

      {/* Input Options Card */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4">
        <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
          Test Case Generation &amp; Excel Metadata Parameters
        </h2>

        {/* Row 1: Ticket Info */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Ticket No</label>
            <input
              type="text"
              value={ticketId}
              onChange={(e) => setTicketId(e.target.value)}
              className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded focus:ring-2 focus:ring-blue-500/20 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Client Name</label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Task Name</label>
            <input
              type="text"
              value={featureName}
              onChange={(e) => setFeatureName(e.target.value)}
              className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Beacon Module</label>
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded focus:ring-2 focus:ring-blue-500/20 font-medium"
            >
              {modules.map((m) => (
                <option key={m.id} value={m.name}>
                  {m.name} ({m.category})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: QA details & SHA */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">SHA / Commit</label>
            <input
              type="text"
              value={shaCommit}
              onChange={(e) => setShaCommit(e.target.value)}
              className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded focus:ring-2 focus:ring-blue-500/20 font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Task Done By (QA)</label>
            <input
              type="text"
              value={qaAssignee}
              onChange={(e) => setQaAssignee(e.target.value)}
              className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Sign off By (Peer/Lead)</label>
            <input
              type="text"
              value={signOffBy}
              onChange={(e) => setSignOffBy(e.target.value)}
              className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        {/* Requirements & AC */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Requirement / Feature Description
          </label>
          <textarea
            rows={2}
            value={requirement}
            onChange={(e) => setRequirement(e.target.value)}
            className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded focus:ring-2 focus:ring-blue-500/20"
          ></textarea>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Acceptance Criteria (AC)
          </label>
          <textarea
            rows={2}
            value={acceptanceCriteria}
            onChange={(e) => setAcceptanceCriteria(e.target.value)}
            className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded focus:ring-2 focus:ring-blue-500/20"
          ></textarea>
        </div>

        {/* Action Bar */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
          <div className="text-[11px] text-slate-500">
            Generates 100% compliant test cases adhering to your Excel columns: TestCase_ID, Test Module, feature tab, Test Scenario, Test Cases, Inputs, Expected &amp; Actual Result.
          </div>
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded flex items-center gap-2 cursor-pointer transition-colors shadow-xs"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Generating Test Cases...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Generate Test Cases (AI Engine)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* GENERATED TEST CASES PREVIEW & EXCEL DOWNLOAD CARD */}
      {generatedCases && (
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <h2 className="text-sm font-bold text-slate-900">
                  Generated Test Cases ({generatedCases.length} Scenarios)
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Ready to download directly as an Excel spreadsheet or transfer to your Test Case Library.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSendToWorkbench}
                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded flex items-center gap-1.5 border border-blue-200 cursor-pointer transition-colors"
              >
                <span>Add to Workbench</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={handleDownloadExcel}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Excel (.xlsx)</span>
              </button>
            </div>
          </div>

          {/* Table Preview styled with Excel Peach Headers */}
          <div className="border border-slate-300 rounded overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#F8CBAD] text-slate-900 border-b-2 border-slate-400 text-[11px] font-bold">
                  <th className="p-2 border-r border-slate-300 w-16 text-center">TestCase_ID</th>
                  <th className="p-2 border-r border-slate-300 w-24">Test Module</th>
                  <th className="p-2 border-r border-slate-300 w-28">feature tab /flow report</th>
                  <th className="p-2 border-r border-slate-300 min-w-[200px]">Test Scenario</th>
                  <th className="p-2 border-r border-slate-300 min-w-[220px]">Test Cases</th>
                  <th className="p-2 border-r border-slate-300 min-w-[160px]">Test Inputs</th>
                  <th className="p-2 border-r border-slate-300 min-w-[200px]">Expected Result</th>
                  <th className="p-2 border-r border-slate-300 w-16 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800">
                {generatedCases.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 align-top">
                    <td className="p-2 border-r border-slate-200 font-mono font-bold text-center text-blue-600 bg-slate-50/50">
                      {c.testCaseId}
                    </td>
                    <td className="p-2 border-r border-slate-200">{c.testModule}</td>
                    <td className="p-2 border-r border-slate-200">{c.featureTab}</td>
                    <td className="p-2 border-r border-slate-200 leading-relaxed font-medium text-slate-900">
                      {c.testScenario}
                    </td>
                    <td className="p-2 border-r border-slate-200 leading-relaxed">{c.testCases}</td>
                    <td className="p-2 border-r border-slate-200 font-mono text-[11px] whitespace-pre-line bg-slate-50/30">
                      {c.testInputs}
                    </td>
                    <td className="p-2 border-r border-slate-200 leading-relaxed">{c.expectedResult}</td>
                    <td className="p-2 border-r border-slate-200 text-center">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
