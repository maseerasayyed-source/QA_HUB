import React, { useState, useEffect } from 'react';
import {
  X,
  ExternalLink,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Key,
  Building,
  FolderGit2,
  Ticket,
  Copy,
  Download,
  Info,
  ShieldCheck,
} from 'lucide-react';
import {
  loadSavedAdoConfig,
  saveAdoConfig,
  attachFileToAzureWorkItem,
  extractWorkItemId,
  AttachFileResult,
} from '../../utils/azureDevopsService';

interface AzureDevopsModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticketNumber: string;
  taskName: string;
  getFileBlob: () => Promise<{ blob: Blob; fileName: string }>;
  defaultComment?: string;
  onSuccessNotice?: (msg: string) => void;
}

export const AzureDevopsModal: React.FC<AzureDevopsModalProps> = ({
  isOpen,
  onClose,
  ticketNumber,
  taskName,
  getFileBlob,
  defaultComment,
  onSuccessNotice,
}) => {
  const [org, setOrg] = useState('quantumphinance');
  const [project, setProject] = useState('Beacon');
  const [workItemId, setWorkItemId] = useState('');
  const [pat, setPat] = useState('');
  const [comment, setComment] = useState('');
  const [rememberConfig, setRememberConfig] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AttachFileResult | null>(null);
  const [copiedComment, setCopiedComment] = useState(false);

  // Initialize from saved config and current ticket
  useEffect(() => {
    if (isOpen) {
      const saved = loadSavedAdoConfig();
      if (saved.organization) setOrg(saved.organization);
      if (saved.project) setProject(saved.project);
      if (saved.personalAccessToken) setPat(saved.personalAccessToken);

      const parsedId = extractWorkItemId(ticketNumber);
      setWorkItemId(parsedId);
      setComment(
        defaultComment ||
          `QA Test Execution & Case Matrix for "${taskName}" exported from Beacon QA Hub.`
      );
      setResult(null);
    }
  }, [isOpen, ticketNumber, taskName, defaultComment]);

  if (!isOpen) return null;

  const directTicketUrl =
    org && project && workItemId
      ? `https://dev.azure.com/${encodeURIComponent(org.trim())}/${encodeURIComponent(
          project.trim()
        )}/_workitems/edit/${encodeURIComponent(workItemId.trim())}`
      : null;

  const handleDirectAttach = async () => {
    if (!org.trim() || !project.trim() || !workItemId.trim()) {
      setResult({
        success: false,
        message: 'Please fill Organization, Project, and Ticket / Work Item ID.',
      });
      return;
    }

    if (rememberConfig) {
      saveAdoConfig({
        organization: org.trim(),
        project: project.trim(),
        personalAccessToken: pat.trim(),
      });
    }

    setIsLoading(true);
    setResult(null);

    try {
      // 1. Generate Excel Blob
      const { blob, fileName } = await getFileBlob();

      // 2. Upload to Azure DevOps
      const res = await attachFileToAzureWorkItem({
        organization: org,
        project,
        workItemId,
        pat,
        fileBlob: blob,
        fileName,
        comment,
      });

      setResult(res);
      if (res.success) {
        onSuccessNotice?.(`Successfully attached ${fileName} to Azure DevOps Ticket #${workItemId}!`);
      }
    } catch (e: any) {
      setResult({
        success: false,
        message: 'Failed to process attachment.',
        errorDetail: e?.message || String(e),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadAndOpen = async () => {
    try {
      const { blob, fileName } = await getFileBlob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      if (directTicketUrl) {
        window.open(directTicketUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopyComment = () => {
    navigator.clipboard.writeText(comment);
    setCopiedComment(true);
    setTimeout(() => setCopiedComment(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 text-white p-4.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <UploadCloud className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                <span>Attach Directly to Azure DevOps Ticket</span>
                <span className="px-2 py-0.5 bg-blue-500/30 text-blue-100 text-xs rounded-full font-mono font-normal">
                  #{workItemId || ticketNumber}
                </span>
              </h2>
              <p className="text-xs text-blue-200/80">
                Direct Work Item Attachment &amp; Zero Double-Work Workflow
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Result Alert Banner */}
          {result && (
            <div
              className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                result.success
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-amber-50 border-amber-300 text-amber-900'
              }`}
            >
              {result.success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div className="text-xs space-y-1">
                <div className="font-bold">{result.message}</div>
                {result.workItemUrl && (
                  <div>
                    <a
                      href={result.workItemUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:underline"
                    >
                      <span>Open Work Item in Azure DevOps</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
                {result.errorDetail && (
                  <div className="text-[11px] text-slate-600 font-mono bg-white/70 p-2 rounded border border-slate-200 mt-1 max-h-24 overflow-y-auto">
                    {result.errorDetail}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Form Fields */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Organization */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-slate-500" />
                  <span>Azure DevOps Org</span>
                </label>
                <input
                  type="text"
                  value={org}
                  onChange={(e) => setOrg(e.target.value)}
                  placeholder="e.g. quantumphinance"
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              {/* Project */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <FolderGit2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>Project Name</span>
                </label>
                <input
                  type="text"
                  value={project}
                  onChange={(e) => setProject(e.target.value)}
                  placeholder="e.g. Beacon"
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>
            </div>

            {/* Work Item ID */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Ticket className="w-3.5 h-3.5 text-blue-600" />
                  <span>Ticket / Work Item ID</span>
                </span>
                {directTicketUrl && (
                  <a
                    href={directTicketUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <span>Verify Ticket Link</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </label>
              <input
                type="text"
                value={workItemId}
                onChange={(e) => setWorkItemId(e.target.value)}
                placeholder="21653"
                className="w-full px-3 py-1.5 text-xs font-mono font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>

            {/* Personal Access Token (PAT) */}
            <div className="space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-amber-600" />
                  <span>Personal Access Token (PAT)</span>
                </label>
                <span className="text-[10px] text-slate-500 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  <span>Saved locally in your browser</span>
                </span>
              </div>
              <input
                type="password"
                value={pat}
                onChange={(e) => setPat(e.target.value)}
                placeholder="Paste Azure DevOps PAT (Scopes: Work Items Read & Write)"
                className="w-full px-3 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-1">
                <Info className="w-3 h-3 text-blue-500 shrink-0" />
                <span>
                  In Azure DevOps: User Settings &gt; Personal Access Tokens &gt; New Token (Scope:
                  Work Items Read &amp; Write).
                </span>
              </p>
            </div>

            {/* Attachment Comment */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">
                  Attachment Comment / Sign-off Note
                </label>
                <button
                  type="button"
                  onClick={handleCopyComment}
                  className="text-[11px] text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedComment ? 'Copied!' : 'Copy Comment'}</span>
                </button>
              </div>
              <textarea
                rows={2}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white resize-none"
              />
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberConfig}
              onChange={(e) => setRememberConfig(e.target.checked)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span>Remember Org, Project &amp; PAT for future tickets</span>
          </label>

          <div className="flex items-center gap-2">
            {/* Fallback 1-click Download & Open */}
            <button
              type="button"
              onClick={handleDownloadAndOpen}
              title="Downloads formatted Excel and opens the Azure DevOps ticket in new tab"
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Download &amp; Open Ticket</span>
            </button>

            {/* Direct 1-Click Azure DevOps Attach */}
            <button
              type="button"
              disabled={isLoading || !pat.trim()}
              onClick={handleDirectAttach}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <UploadCloud className="w-4 h-4" />
              <span>{isLoading ? 'Attaching to Ticket...' : 'Directly Attach to Ticket'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
