import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  AlertOctagon,
  Download,
  Plus,
  Trash2,
  Copy,
  CheckCircle2,
  Clock,
  MinusCircle,
  Paperclip,
  Upload,
  Image,
  Wand2,
  Search,
  Eye,
  X,
  RotateCcw,
  UploadCloud,
} from 'lucide-react';
import { ObservationHeaderMeta, ObservationItem, TicketSummary, FileAttachment } from '../types';
import { exportObservationsToExcel, getObservationsExcelBlob } from '../utils/excelExport';
import { polishObservationText, correctSpelling } from '../utils/textPolisher';
import { INITIAL_OBSERVATION_HEADER, INITIAL_OBSERVATIONS } from '../data/initialData';
import { ColumnHeader, SortDirection } from './common/ColumnHeader';
import { RowAttachmentsCell } from './common/RowAttachmentsCell';
import { AzureDevopsModal } from './common/AzureDevopsModal';

interface ObservationsViewProps {
  tickets?: TicketSummary[];
  initialHeader?: ObservationHeaderMeta;
  initialObservations?: ObservationItem[];
  onUpdateHeader?: (header: ObservationHeaderMeta) => void;
  onUpdateObservations?: (items: ObservationItem[]) => void;
}

export const ObservationsView: React.FC<ObservationsViewProps> = ({
  tickets = [],
  initialHeader = INITIAL_OBSERVATION_HEADER,
  initialObservations = INITIAL_OBSERVATIONS,
  onUpdateHeader,
  onUpdateObservations,
}) => {
  // Observation Sheet Header (Ticket Name, Number, QA Owner, Date)
  const [header, setHeader] = useState<ObservationHeaderMeta>(initialHeader);

  // Observation records (inline-editable)
  const [observations, setObservations] = useState<ObservationItem[]>(initialObservations);

  // Sorting state
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  // Column Filters map
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({
    serialNo: '',
    type: '',
    observationRFE: '',
    attachments: '',
    priority: '',
    status: '',
  });

  // UI state
  const [selectedTicketNo, setSelectedTicketNo] = useState<string>(initialHeader.ticketNo);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);
  const [globalSearch, setGlobalSearch] = useState<string>('');
  const [isAdoModalOpen, setIsAdoModalOpen] = useState<boolean>(false);
  const [adoNotification, setAdoNotification] = useState<string | null>(null);

  // Sync state back to parent if provided
  const updateObservationsState = (items: ObservationItem[]) => {
    setObservations(items);
    onUpdateObservations?.(items);
  };

  // Sync ticket change to Observation Header
  const handleTicketChange = (tNo: string) => {
    setSelectedTicketNo(tNo);
    const found = tickets.find((t) => t.ticketNumber.toLowerCase() === tNo.toLowerCase());
    if (found) {
      const nextHeader: ObservationHeaderMeta = {
        ticketName: found.featureName,
        ticketNo: found.ticketNumber,
        qaOwner: found.qaAssignee || header.qaOwner,
        clientName: found.clientName || header.clientName,
        date: new Date().toISOString().split('T')[0],
      };
      setHeader(nextHeader);
      onUpdateHeader?.(nextHeader);
    }
  };

  // Inline Cell Update
  const handleCellChange = (id: string, field: keyof ObservationItem, value: any) => {
    const updated = observations.map((obs) => {
      if (obs.id === id) {
        return { ...obs, [field]: value };
      }
      return obs;
    });
    updateObservationsState(updated);
  };

  // Add Row Attachment
  const handleAddAttachment = (id: string, file: { name: string; url: string; size?: string }) => {
    const updated = observations.map((obs) => {
      if (obs.id === id) {
        const current = obs.attachments || [];
        const newAtt: FileAttachment = {
          id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          name: file.name,
          url: file.url,
          size: file.size,
          uploadedAt: new Date().toISOString(),
        };
        const nextAttachments = [...current, newAtt];
        return {
          ...obs,
          attachments: nextAttachments,
          screenshotName: file.name,
          screenshotUrl: file.url,
        };
      }
      return obs;
    });
    updateObservationsState(updated);
  };

  // Remove Row Attachment
  const handleRemoveAttachment = (id: string, attachmentId: string) => {
    const updated = observations.map((obs) => {
      if (obs.id === id) {
        const remaining = (obs.attachments || []).filter((a) => a.id !== attachmentId);
        return {
          ...obs,
          attachments: remaining,
          screenshotName: remaining.length > 0 ? remaining[0].name : '',
          screenshotUrl: remaining.length > 0 ? remaining[0].url : '',
        };
      }
      return obs;
    });
    updateObservationsState(updated);
  };

  // Insert a new observation row at bottom
  const handleAddRow = () => {
    const nextNum = observations.length + 1;
    const newObs: ObservationItem = {
      id: `obs-${Date.now()}`,
      serialNo: `OBS-0${nextNum}`,
      ticketId: header.ticketNo,
      ticketName: header.ticketName,
      type: 'Observation',
      observationRFE: '',
      screenshotName: '',
      screenshotUrl: '',
      attachments: [],
      priority: 'High',
      status: 'Pending',
      reportedBy: header.qaOwner,
      createdDate: new Date().toISOString().split('T')[0],
    };
    updateObservationsState([...observations, newObs]);
  };

  // Duplicate an observation row
  const handleDuplicateRow = (id: string) => {
    const index = observations.findIndex((o) => o.id === id);
    if (index === -1) return;
    const item = observations[index];
    const clone: ObservationItem = {
      ...item,
      id: `obs-${Date.now()}`,
      serialNo: `OBS-0${observations.length + 1}`,
      status: 'Pending',
      attachments: item.attachments ? [...item.attachments] : [],
    };
    const next = [...observations];
    next.splice(index + 1, 0, clone);
    updateObservationsState(next);
  };

  // Delete an observation row
  const handleDeleteRow = (id: string) => {
    if (observations.length <= 1) {
      alert("At least one observation record must remain.");
      return;
    }
    updateObservationsState(observations.filter((o) => o.id !== id));
  };

  // Auto-Polish grammar for all observation descriptions
  const handlePolishAllObservations = () => {
    const updated = observations.map((obs) => ({
      ...obs,
      observationRFE: polishObservationText(obs.observationRFE),
    }));
    updateObservationsState(updated);
  };

  // Export to Excel with rich styling (colors, borders, embedded screenshot images)
  const handleDownloadExcel = async () => {
    try {
      await exportObservationsToExcel(header, observations);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3500);
    } catch (err) {
      console.error(err);
      alert('Failed to export Observation Excel file.');
    }
  };

  // Sort Handler
  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortKey(null);
        setSortDirection(null);
      }
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  // Column Filter Change
  const handleFilterChange = (key: string, value: string) => {
    setColumnFilters((prev) => ({ ...prev, [key]: value }));
  };

  // Reset all filters & sorting
  const handleResetFilters = () => {
    setColumnFilters({
      serialNo: '',
      type: '',
      observationRFE: '',
      attachments: '',
      priority: '',
      status: '',
    });
    setGlobalSearch('');
    setSortKey(null);
    setSortDirection(null);
  };

  const hasActiveFilters =
    Boolean(globalSearch.trim()) ||
    Boolean(sortKey) ||
    Object.values(columnFilters).some((v) => typeof v === 'string' && v.trim() !== '');

  // Filter & Sort Pipeline
  const filteredObservations = useMemo(() => {
    return observations
      .filter((obs) => {
        // Global search
        if (globalSearch.trim()) {
          const q = globalSearch.toLowerCase();
          const matchesGlobal =
            obs.serialNo.toLowerCase().includes(q) ||
            obs.type.toLowerCase().includes(q) ||
            obs.observationRFE.toLowerCase().includes(q) ||
            obs.priority.toLowerCase().includes(q) ||
            obs.status.toLowerCase().includes(q);
          if (!matchesGlobal) return false;
        }

        // Per-column filters
        if (columnFilters.serialNo.trim()) {
          if (!obs.serialNo.toLowerCase().includes(columnFilters.serialNo.toLowerCase().trim())) {
            return false;
          }
        }

        if (columnFilters.type.trim()) {
          if (obs.type.toLowerCase() !== columnFilters.type.toLowerCase().trim()) {
            return false;
          }
        }

        if (columnFilters.observationRFE.trim()) {
          if (
            !obs.observationRFE.toLowerCase().includes(columnFilters.observationRFE.toLowerCase().trim())
          ) {
            return false;
          }
        }

        if (columnFilters.attachments.trim()) {
          const attNames = (obs.attachments || []).map((a) => a.name.toLowerCase()).join(' ');
          const fallback = (obs.screenshotName || '').toLowerCase();
          const target = `${attNames} ${fallback}`;
          if (!target.includes(columnFilters.attachments.toLowerCase().trim())) {
            return false;
          }
        }

        if (columnFilters.priority.trim()) {
          if (obs.priority.toLowerCase() !== columnFilters.priority.toLowerCase().trim()) {
            return false;
          }
        }

        if (columnFilters.status.trim()) {
          if (obs.status.toLowerCase() !== columnFilters.status.toLowerCase().trim()) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (!sortKey || !sortDirection) return 0;
        let valA: any = '';
        let valB: any = '';

        if (sortKey === 'serialNo') {
          valA = a.serialNo;
          valB = b.serialNo;
        } else if (sortKey === 'type') {
          valA = a.type;
          valB = b.type;
        } else if (sortKey === 'observationRFE') {
          valA = a.observationRFE;
          valB = b.observationRFE;
        } else if (sortKey === 'priority') {
          valA = a.priority;
          valB = b.priority;
        } else if (sortKey === 'status') {
          valA = a.status;
          valB = b.status;
        } else if (sortKey === 'attachments') {
          valA = (a.attachments?.length || 0) + (a.screenshotName ? 1 : 0);
          valB = (b.attachments?.length || 0) + (b.screenshotName ? 1 : 0);
        }

        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortDirection === 'asc' ? valA - valB : valB - valA;
        }

        const comp = String(valA).localeCompare(String(valB));
        return sortDirection === 'asc' ? comp : -comp;
      });
  }, [observations, globalSearch, columnFilters, sortKey, sortDirection]);

  return (
    <div className="p-6 max-w-[1500px] mx-auto space-y-5">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <span className="p-2 bg-red-50 text-red-600 rounded-lg border border-red-100">
            <AlertOctagon className="w-5 h-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                Observations &amp; RFE Tracker
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-800">
                Excel Formatted
              </span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800">
                Multi-File &amp; Ctrl+V Attach
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Header with Ticket Name &amp; Number. Track Observations vs. RFEs, attach multiple screenshots/files row-wise, set priority &amp; status, and export exact Excel (.xlsx).
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handlePolishAllObservations}
            className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Wand2 className="w-3.5 h-3.5 text-purple-600" />
            <span>Auto-Polish Grammar</span>
          </button>

          <button
            onClick={handleAddRow}
            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Row</span>
          </button>

          {/* Attach Directly to Azure DevOps Ticket Button */}
          <button
            onClick={() => setIsAdoModalOpen(true)}
            title="Attach observations directly to Azure DevOps Work Item"
            className="px-3.5 py-1.5 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white text-xs font-bold rounded-md flex items-center gap-2 transition-all shadow-xs cursor-pointer"
          >
            <UploadCloud className="w-3.5 h-3.5 text-blue-200" />
            <span>🚀 Attach to Azure DevOps</span>
          </button>
        </div>
      </div>

      {/* Azure DevOps Notification Feedback */}
      {adoNotification && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
          <span>{adoNotification}</span>
        </div>
      )}

      {/* Download Confirmation Feedback */}
      {downloadSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            Observation Excel file <strong>Observations_{header.ticketNo}.xlsx</strong> downloaded with <strong>Beacon Corporate Navy header (#1E3A8A)</strong>, cell grid borders, embedded screenshots, and attachment links!
          </span>
        </div>
      )}

      {/* Observation Excel Header Block (Rows 1-4) */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-600"></span>
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Observation Excel Header Information
            </h2>
          </div>
          <span className="text-[11px] text-slate-400">
            Exported to Top Rows of Observation Excel Sheet
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
              Ticket Number :
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={header.ticketNo}
                onChange={(e) => handleTicketChange(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-mono font-bold text-blue-700 focus:outline-none focus:border-blue-500 focus:bg-white text-xs"
              />
              {tickets.length > 0 && (
                <select
                  value={header.ticketNo}
                  onChange={(e) => handleTicketChange(e.target.value)}
                  className="px-2 py-1.5 bg-slate-100 border border-slate-200 rounded text-xs text-slate-700 cursor-pointer"
                >
                  {tickets.map((t) => (
                    <option key={t.id} value={t.ticketNumber}>
                      #{t.ticketNumber}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
              Ticket Name :
            </label>
            <input
              type="text"
              value={header.ticketName}
              onChange={(e) => {
                const next = { ...header, ticketName: e.target.value };
                setHeader(next);
                onUpdateHeader?.(next);
              }}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-semibold text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white text-xs"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
              QA Owner :
            </label>
            <input
              type="text"
              value={header.qaOwner}
              onChange={(e) => {
                const next = { ...header, qaOwner: e.target.value };
                setHeader(next);
                onUpdateHeader?.(next);
              }}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-semibold text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white text-xs"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
              Report Date :
            </label>
            <input
              type="date"
              value={header.date}
              onChange={(e) => {
                const next = { ...header, date: e.target.value };
                setHeader(next);
                onUpdateHeader?.(next);
              }}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-medium text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white text-xs"
            />
          </div>
        </div>
      </div>

      {/* Download Excel Button Placed DIRECTLY Above the Table */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search across all observation fields..."
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors"
            >
              <RotateCcw className="w-3 h-3 text-slate-500" />
              <span>Reset Filters</span>
            </button>
          )}

          {/* Download Formatted Excel (.xlsx) Button Placed Directly Above Table */}
          <button
            onClick={handleDownloadExcel}
            title="Download formatted Excel with Beacon navy header (#1E3A8A), thin borders, and embedded screenshots"
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-md flex items-center gap-2 transition-all shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Formatted Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* SPREADSHEET TABLE: Observations/RFE with Column Sort & Filter */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto max-h-[620px]">
          <table className="w-full text-left text-xs border-collapse min-w-[1100px]">
            <thead className="bg-[#1E293B] text-slate-200 uppercase font-semibold text-[11px] tracking-wider sticky top-0 z-20 shadow-xs">
              <tr>
                <th className="p-2.5 w-12 text-center border-r border-slate-700/60">#</th>

                <ColumnHeader
                  title="Observation / RFE ID"
                  columnKey="serialNo"
                  sortKey={sortKey}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  filterValue={columnFilters.serialNo}
                  onFilterChange={handleFilterChange}
                  className="w-40"
                />

                <ColumnHeader
                  title="Type"
                  columnKey="type"
                  sortKey={sortKey}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  filterValue={columnFilters.type}
                  onFilterChange={handleFilterChange}
                  options={['Observation', 'RFE']}
                  className="w-32"
                />

                <ColumnHeader
                  title="Observations / RFE"
                  columnKey="observationRFE"
                  sortKey={sortKey}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  filterValue={columnFilters.observationRFE}
                  onFilterChange={handleFilterChange}
                  subtitle="✨ Auto-polishes"
                  className="min-w-[340px]"
                />

                <ColumnHeader
                  title="Screen shots / File Attach"
                  columnKey="attachments"
                  sortKey={sortKey}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  filterValue={columnFilters.attachments}
                  onFilterChange={handleFilterChange}
                  subtitle="Multiple / Ctrl+V"
                  className="w-64"
                />

                <ColumnHeader
                  title="Priority"
                  columnKey="priority"
                  sortKey={sortKey}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  filterValue={columnFilters.priority}
                  onFilterChange={handleFilterChange}
                  options={['Critical', 'High', 'Medium', 'Low']}
                  className="w-28"
                  align="center"
                />

                <ColumnHeader
                  title="Status"
                  columnKey="status"
                  sortKey={sortKey}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  filterValue={columnFilters.status}
                  onFilterChange={handleFilterChange}
                  options={['Fixed', 'Pending', 'Not required for this ticket']}
                  className="w-48"
                  align="center"
                />

                <th className="p-2.5 w-20 text-center font-semibold">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 text-slate-800">
              {filteredObservations.map((obs, index) => (
                <tr key={obs.id} className="hover:bg-slate-50/80 transition-colors">
                  {/* # */}
                  <td className="p-2 text-center text-slate-400 font-mono text-[11px] border-r border-slate-100 bg-slate-50/40">
                    {index + 1}
                  </td>

                  {/* ID */}
                  <td className="p-1 border-r border-slate-100">
                    <input
                      type="text"
                      value={obs.serialNo}
                      onChange={(e) => handleCellChange(obs.id, 'serialNo', e.target.value)}
                      className="w-full px-1.5 py-1 font-mono font-bold text-red-600 bg-transparent hover:bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 rounded text-xs"
                    />
                  </td>

                  {/* Type Dropdown (Observation / RFE) */}
                  <td className="p-1.5 border-r border-slate-100">
                    <select
                      value={obs.type || 'Observation'}
                      onChange={(e) => handleCellChange(obs.id, 'type', e.target.value)}
                      className={`w-full px-2 py-1 text-xs font-bold rounded border cursor-pointer focus:outline-none ${
                        obs.type === 'RFE'
                          ? 'bg-purple-50 text-purple-700 border-purple-300'
                          : 'bg-amber-50 text-amber-800 border-amber-300'
                      }`}
                    >
                      <option value="Observation">Observation</option>
                      <option value="RFE">RFE</option>
                    </select>
                  </td>

                  {/* Observations / RFE (Textarea with auto-polish on blur) */}
                  <td className="p-1 border-r border-slate-100 relative group/obsdesc">
                    <textarea
                      rows={2}
                      value={obs.observationRFE}
                      onChange={(e) => handleCellChange(obs.id, 'observationRFE', e.target.value)}
                      onBlur={(e) => {
                        const polished = correctSpelling(e.target.value);
                        if (polished !== e.target.value) {
                          handleCellChange(obs.id, 'observationRFE', polished);
                        }
                      }}
                      placeholder="Describe the observation or RFE requirement..."
                      className="w-full px-2 py-1 text-slate-800 bg-transparent hover:bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 rounded text-xs resize-y"
                    />
                  </td>

                  {/* Screen shots / File Attach (Multiple files + Ctrl+V paste support) */}
                  <td className="p-1 border-r border-slate-100">
                    <RowAttachmentsCell
                      id={`obs-attachments-${obs.id}`}
                      attachments={obs.attachments}
                      fallbackScreenshotName={obs.screenshotName}
                      fallbackScreenshotUrl={obs.screenshotUrl}
                      onAddAttachment={(file) => handleAddAttachment(obs.id, file)}
                      onRemoveAttachment={(attId) => handleRemoveAttachment(obs.id, attId)}
                    />
                  </td>

                  {/* Priority */}
                  <td className="p-1.5 border-r border-slate-100 text-center">
                    <select
                      value={obs.priority}
                      onChange={(e) => handleCellChange(obs.id, 'priority', e.target.value)}
                      className={`w-full px-1.5 py-1 text-xs font-bold rounded border cursor-pointer focus:outline-none ${
                        obs.priority === 'Critical'
                          ? 'bg-red-50 text-red-700 border-red-300'
                          : obs.priority === 'High'
                          ? 'bg-amber-50 text-amber-700 border-amber-300'
                          : obs.priority === 'Medium'
                          ? 'bg-blue-50 text-blue-700 border-blue-300'
                          : 'bg-slate-100 text-slate-700 border-slate-300'
                      }`}
                    >
                      <option value="Critical">Critical</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </td>

                  {/* Status: "Fixed" | "Pending" | "Not required for this ticket" */}
                  <td className="p-1.5 border-r border-slate-100 text-center">
                    <select
                      value={obs.status}
                      onChange={(e) => handleCellChange(obs.id, 'status', e.target.value)}
                      className={`w-full px-2 py-1 text-xs font-bold rounded border cursor-pointer focus:outline-none ${
                        obs.status === 'Fixed'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                          : obs.status === 'Pending'
                          ? 'bg-amber-50 text-amber-700 border-amber-300'
                          : 'bg-slate-100 text-slate-600 border-slate-300'
                      }`}
                    >
                      <option value="Fixed">Fixed</option>
                      <option value="Pending">Pending</option>
                      <option value="Not required for this ticket">
                        Not required for this ticket
                      </option>
                    </select>
                  </td>

                  {/* Actions */}
                  <td className="p-1 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleDuplicateRow(obs.id)}
                        title="Duplicate observation"
                        className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteRow(obs.id)}
                        title="Delete observation"
                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Bottom Toolbar & Summary Statistics */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <button
            onClick={handleAddRow}
            className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold rounded shadow-2xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-blue-600" />
            <span>+ Insert Observation Row</span>
          </button>

          <div className="flex flex-wrap items-center gap-4 text-slate-500">
            <div>
              Total Items: <strong className="text-slate-800">{observations.length}</strong>
            </div>
            <div>
              Observations:{' '}
              <strong className="text-amber-700">
                {observations.filter((o) => (o.type || 'Observation') === 'Observation').length}
              </strong>
            </div>
            <div>
              RFEs:{' '}
              <strong className="text-purple-700">
                {observations.filter((o) => o.type === 'RFE').length}
              </strong>
            </div>
            <div>
              Fixed:{' '}
              <strong className="text-emerald-700">
                {observations.filter((o) => o.status === 'Fixed').length}
              </strong>
            </div>
            <div>
              Pending:{' '}
              <strong className="text-amber-700">
                {observations.filter((o) => o.status === 'Pending').length}
              </strong>
            </div>
            <div>
              Not Required:{' '}
              <strong className="text-slate-600">
                {observations.filter((o) => o.status === 'Not required for this ticket').length}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* Azure DevOps Direct Attachment Modal */}
      <AzureDevopsModal
        isOpen={isAdoModalOpen}
        onClose={() => setIsAdoModalOpen(false)}
        ticketNumber={header.ticketNo}
        taskName={header.ticketName}
        getFileBlob={() => getObservationsExcelBlob(header, observations)}
        defaultComment={`Observation & RFE Log for "${header.ticketName}" (Ticket #${header.ticketNo}) reported by ${header.qaOwner}. Total Records: ${observations.length} (Observations: ${observations.filter((o) => (o.type || 'Observation') === 'Observation').length}, RFEs: ${observations.filter((o) => o.type === 'RFE').length}).`}
        onSuccessNotice={(msg) => {
          setAdoNotification(msg);
          setTimeout(() => setAdoNotification(null), 5000);
        }}
      />
    </div>
  );
};
