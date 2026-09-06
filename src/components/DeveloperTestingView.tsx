import React, { useState, useMemo } from 'react';
import {
  Code2,
  Download,
  Plus,
  Trash2,
  Copy,
  CheckCircle2,
  Wand2,
  Search,
  RotateCcw,
  Sparkles,
  UploadCloud,
} from 'lucide-react';
import {
  DeveloperTestHeaderMeta,
  DeveloperTestItem,
  TicketSummary,
  FileAttachment,
} from '../types';
import { exportDeveloperTestingToExcel, getDeveloperTestingExcelBlob } from '../utils/excelExport';
import { polishObservationText, correctSpelling } from '../utils/textPolisher';
import {
  INITIAL_DEV_TEST_HEADER,
  INITIAL_DEV_TEST_ITEMS,
} from '../data/initialData';
import { ColumnHeader, SortDirection } from './common/ColumnHeader';
import { RowAttachmentsCell } from './common/RowAttachmentsCell';
import { AzureDevopsModal } from './common/AzureDevopsModal';

interface DeveloperTestingViewProps {
  tickets?: TicketSummary[];
}

export const DeveloperTestingView: React.FC<DeveloperTestingViewProps> = ({
  tickets = [],
}) => {
  // Developer Testing Header Meta
  const [header, setHeader] = useState<DeveloperTestHeaderMeta>(INITIAL_DEV_TEST_HEADER);

  // Developer Test Items (row-wise inline editable)
  const [items, setItems] = useState<DeveloperTestItem[]>(INITIAL_DEV_TEST_ITEMS);

  // Sorting state
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  // Column Filters
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({
    serialNo: '',
    scenario: '',
    testData: '',
    expectedResult: '',
    actualResult: '',
    attachments: '',
    status: '',
    remarks: '',
  });

  // UI state
  const [selectedTicketNo, setSelectedTicketNo] = useState<string>(INITIAL_DEV_TEST_HEADER.ticketNo);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);
  const [globalSearch, setGlobalSearch] = useState<string>('');
  const [isAdoModalOpen, setIsAdoModalOpen] = useState<boolean>(false);
  const [adoNotification, setAdoNotification] = useState<string | null>(null);

  // Sync ticket change to Header
  const handleTicketChange = (tNo: string) => {
    setSelectedTicketNo(tNo);
    const found = tickets.find((t) => t.ticketNumber.toLowerCase() === tNo.toLowerCase());
    if (found) {
      setHeader({
        ticketName: found.featureName,
        ticketNo: found.ticketNumber,
        developerName: found.developerAssignee || header.developerName,
        devTestDate: new Date().toISOString().split('T')[0],
        module: found.module || header.module,
      });
    }
  };

  // Inline Cell Update
  const handleCellChange = (id: string, field: keyof DeveloperTestItem, value: any) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return { ...item, [field]: value };
        }
        return item;
      })
    );
  };

  // Add Attachment to a Row
  const handleAddAttachment = (id: string, file: { name: string; url: string; size?: string }) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const current = item.attachments || [];
          const newAtt: FileAttachment = {
            id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            name: file.name,
            url: file.url,
            size: file.size,
            uploadedAt: new Date().toISOString(),
          };
          return {
            ...item,
            attachments: [...current, newAtt],
            screenshotName: file.name,
            screenshotUrl: file.url,
          };
        }
        return item;
      })
    );
  };

  // Remove Attachment from a Row
  const handleRemoveAttachment = (id: string, attachmentId: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const remaining = (item.attachments || []).filter((a) => a.id !== attachmentId);
          return {
            ...item,
            attachments: remaining,
            screenshotName: remaining.length > 0 ? remaining[0].name : '',
            screenshotUrl: remaining.length > 0 ? remaining[0].url : '',
          };
        }
        return item;
      })
    );
  };

  // Insert a new row
  const handleAddRow = () => {
    const nextNum = items.length + 1;
    const newItem: DeveloperTestItem = {
      id: `dt-${Date.now()}`,
      scenarioId: `DEV-0${nextNum}`,
      scenario: '',
      testDescription: '',
      testData: '',
      expectedResult: '',
      actualResult: '',
      status: 'Passed',
      attachments: [],
      remarks: '',
    };
    setItems((prev) => [...prev, newItem]);
  };

  // Duplicate a row
  const handleDuplicateRow = (id: string) => {
    const index = items.findIndex((i) => i.id === id);
    if (index === -1) return;
    const item = items[index];
    const clone: DeveloperTestItem = {
      ...item,
      id: `dt-${Date.now()}`,
      serialNo: `DT-0${items.length + 1}`,
      attachments: item.attachments ? [...item.attachments] : [],
    };
    const next = [...items];
    next.splice(index + 1, 0, clone);
    setItems(next);
  };

  // Delete a row
  const handleDeleteRow = (id: string) => {
    if (items.length <= 1) {
      alert("At least one developer testing item must remain.");
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  // Polish grammar for scenarios & remarks
  const handlePolishAll = () => {
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        scenario: polishObservationText(item.scenario),
        expectedResult: polishObservationText(item.expectedResult),
        actualResult: polishObservationText(item.actualResult),
        remarks: polishObservationText(item.remarks),
      }))
    );
  };

  // Download Developer Testing Excel with rich styling (colors, borders, status badges, links)
  const handleDownloadExcel = async () => {
    try {
      await exportDeveloperTestingToExcel(header, items);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3500);
    } catch (err) {
      console.error(err);
      alert('Failed to export Developer Testing Excel file.');
    }
  };

  // Sort handler
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

  // Filter change
  const handleFilterChange = (key: string, value: string) => {
    setColumnFilters((prev) => ({ ...prev, [key]: value }));
  };

  // Reset filters & sort
  const handleResetFilters = () => {
    setColumnFilters({
      serialNo: '',
      scenario: '',
      testData: '',
      expectedResult: '',
      actualResult: '',
      attachments: '',
      status: '',
      remarks: '',
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
  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        // Global search
        if (globalSearch.trim()) {
          const q = globalSearch.toLowerCase();
          const matches =
            item.serialNo.toLowerCase().includes(q) ||
            item.scenario.toLowerCase().includes(q) ||
            item.testData.toLowerCase().includes(q) ||
            item.expectedResult.toLowerCase().includes(q) ||
            item.actualResult.toLowerCase().includes(q) ||
            item.status.toLowerCase().includes(q) ||
            item.remarks.toLowerCase().includes(q);
          if (!matches) return false;
        }

        // Per-column filters
        if (columnFilters.serialNo.trim()) {
          if (!item.serialNo.toLowerCase().includes(columnFilters.serialNo.toLowerCase().trim())) {
            return false;
          }
        }

        if (columnFilters.scenario.trim()) {
          if (!item.scenario.toLowerCase().includes(columnFilters.scenario.toLowerCase().trim())) {
            return false;
          }
        }

        if (columnFilters.testData.trim()) {
          if (!item.testData.toLowerCase().includes(columnFilters.testData.toLowerCase().trim())) {
            return false;
          }
        }

        if (columnFilters.expectedResult.trim()) {
          if (
            !item.expectedResult
              .toLowerCase()
              .includes(columnFilters.expectedResult.toLowerCase().trim())
          ) {
            return false;
          }
        }

        if (columnFilters.actualResult.trim()) {
          if (
            !item.actualResult
              .toLowerCase()
              .includes(columnFilters.actualResult.toLowerCase().trim())
          ) {
            return false;
          }
        }

        if (columnFilters.attachments.trim()) {
          const attNames = (item.attachments || []).map((a) => a.name.toLowerCase()).join(' ');
          const fallback = (item.screenshotName || '').toLowerCase();
          const target = `${attNames} ${fallback}`;
          if (!target.includes(columnFilters.attachments.toLowerCase().trim())) {
            return false;
          }
        }

        if (columnFilters.status.trim()) {
          if (item.status.toLowerCase() !== columnFilters.status.toLowerCase().trim()) {
            return false;
          }
        }

        if (columnFilters.remarks.trim()) {
          if (!item.remarks.toLowerCase().includes(columnFilters.remarks.toLowerCase().trim())) {
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
        } else if (sortKey === 'scenario') {
          valA = a.scenario;
          valB = b.scenario;
        } else if (sortKey === 'testData') {
          valA = a.testData;
          valB = b.testData;
        } else if (sortKey === 'expectedResult') {
          valA = a.expectedResult;
          valB = b.expectedResult;
        } else if (sortKey === 'actualResult') {
          valA = a.actualResult;
          valB = b.actualResult;
        } else if (sortKey === 'status') {
          valA = a.status;
          valB = b.status;
        } else if (sortKey === 'remarks') {
          valA = a.remarks;
          valB = b.remarks;
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
  }, [items, globalSearch, columnFilters, sortKey, sortDirection]);

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-5">
      {/* Top Header & Export Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <span className="p-2 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">
            <Code2 className="w-5 h-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                Developer Testing Sheet
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                Excel Formatted
              </span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800">
                Scenario Column
              </span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 text-purple-800">
                Multi-File Attach &amp; Ctrl+V
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Unit and developer pre-QA verification logs. Edit scenarios, input data, expected vs actual outputs, attach multiple screenshots/files row-wise, filter/sort every column, and export to Excel (.xlsx).
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            id="polish-all-dev-btn"
            onClick={handlePolishAll}
            className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Wand2 className="w-3.5 h-3.5 text-purple-600" />
            <span>Auto-Polish Text</span>
          </button>

          <button
            id="add-dev-row-btn"
            onClick={handleAddRow}
            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Test Row</span>
          </button>

          <button
            id="download-dev-excel-btn"
            onClick={handleDownloadExcel}
            title="Download formatted Excel with Beacon navy header (#1E3A8A), cell grid borders, and status color badges"
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-md flex items-center gap-2 transition-all shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Formatted Excel (.xlsx)</span>
          </button>

          {/* Attach Directly to Azure DevOps Ticket Button */}
          <button
            id="ado-dev-attach-btn"
            onClick={() => setIsAdoModalOpen(true)}
            title="Attach developer testing logs directly to Azure DevOps Work Item"
            className="px-3.5 py-1.5 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white text-xs font-bold rounded-md flex items-center gap-2 transition-all shadow-xs cursor-pointer"
          >
            <UploadCloud className="w-3.5 h-3.5 text-blue-200" />
            <span>🚀 Attach to Azure DevOps</span>
          </button>
        </div>
      </div>

      {/* Azure DevOps Feedback */}
      {adoNotification && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
          <span>{adoNotification}</span>
        </div>
      )}

      {/* Download Feedback */}
      {downloadSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            Developer Testing Excel file <strong>Developer_Testing_{header.ticketNo}.xlsx</strong> downloaded with <strong>Beacon Corporate Navy header (#1E3A8A)</strong>, cell grid borders, and row attachments!
          </span>
        </div>
      )}

      {/* Developer Testing Excel Header Block (Rows 1-4 in Excel) */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Developer Testing Excel Header Information
            </h2>
          </div>
          <span className="text-[11px] text-slate-400">
            Exported to Top Rows of Developer Testing Excel Sheet
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
              Ticket Number :
            </label>
            <div className="flex items-center gap-1.5">
              <input
                id="dev-header-ticket-input"
                type="text"
                value={header.ticketNo}
                onChange={(e) => handleTicketChange(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-mono font-bold text-blue-700 focus:outline-none focus:border-blue-500 focus:bg-white text-xs"
              />
              {tickets.length > 0 && (
                <select
                  id="dev-header-ticket-select"
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
              id="dev-header-ticket-name"
              type="text"
              value={header.ticketName}
              onChange={(e) => setHeader({ ...header, ticketName: e.target.value })}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-semibold text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white text-xs"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
              Developer Name :
            </label>
            <input
              id="dev-header-dev-name"
              type="text"
              value={header.developerName}
              onChange={(e) => setHeader({ ...header, developerName: e.target.value })}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-semibold text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white text-xs"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
              Module / Subsystem :
            </label>
            <input
              id="dev-header-module"
              type="text"
              value={header.module}
              onChange={(e) => setHeader({ ...header, module: e.target.value })}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-semibold text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white text-xs"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
              Test Date :
            </label>
            <input
              id="dev-header-test-date"
              type="date"
              value={header.devTestDate}
              onChange={(e) => setHeader({ ...header, devTestDate: e.target.value })}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-medium text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white text-xs"
            />
          </div>
        </div>
      </div>

      {/* Filter and Quick Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              id="dev-global-search"
              type="text"
              placeholder="Search scenarios, test data, results, remarks..."
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              id="dev-reset-filters-btn"
              onClick={handleResetFilters}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors"
            >
              <RotateCcw className="w-3 h-3 text-slate-500" />
              <span>Reset Filters &amp; Sort</span>
            </button>
          )}

          <span className="text-xs text-slate-500 font-medium">
            Showing {filteredItems.length} of {items.length} items
          </span>
        </div>
      </div>

      {/* SPREADSHEET TABLE: Developer Testing with Scenario Column & Attachments */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto max-h-[620px]">
          <table className="w-full text-left text-xs border-collapse min-w-[1300px]">
            <thead className="bg-[#1E293B] text-slate-200 uppercase font-semibold text-[11px] tracking-wider sticky top-0 z-20 shadow-xs">
              <tr>
                <th className="p-2.5 w-12 text-center border-r border-slate-700/60">#</th>

                <ColumnHeader
                  id="th-dev-id"
                  title="Test ID"
                  columnKey="serialNo"
                  sortKey={sortKey}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  filterValue={columnFilters.serialNo}
                  onFilterChange={handleFilterChange}
                  className="w-32"
                />

                <ColumnHeader
                  id="th-dev-scenario"
                  title="Scenario"
                  columnKey="scenario"
                  sortKey={sortKey}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  filterValue={columnFilters.scenario}
                  onFilterChange={handleFilterChange}
                  subtitle="✨ Auto-polishes"
                  className="min-w-[280px]"
                />

                <ColumnHeader
                  id="th-dev-testdata"
                  title="Test Data / Input"
                  columnKey="testData"
                  sortKey={sortKey}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  filterValue={columnFilters.testData}
                  onFilterChange={handleFilterChange}
                  className="w-48"
                />

                <ColumnHeader
                  id="th-dev-expected"
                  title="Expected Result"
                  columnKey="expectedResult"
                  sortKey={sortKey}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  filterValue={columnFilters.expectedResult}
                  onFilterChange={handleFilterChange}
                  className="w-56"
                />

                <ColumnHeader
                  id="th-dev-actual"
                  title="Actual Result"
                  columnKey="actualResult"
                  sortKey={sortKey}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  filterValue={columnFilters.actualResult}
                  onFilterChange={handleFilterChange}
                  className="w-56"
                />

                <ColumnHeader
                  id="th-dev-attachments"
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
                  id="th-dev-status"
                  title="Status"
                  columnKey="status"
                  sortKey={sortKey}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  filterValue={columnFilters.status}
                  onFilterChange={handleFilterChange}
                  options={['Passed', 'Passed with Limitations', 'Failed']}
                  className="w-44"
                  align="center"
                />

                <ColumnHeader
                  id="th-dev-remarks"
                  title="Remarks / Notes"
                  columnKey="remarks"
                  sortKey={sortKey}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  filterValue={columnFilters.remarks}
                  onFilterChange={handleFilterChange}
                  className="w-52"
                />

                <th className="p-2.5 w-20 text-center font-semibold">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 text-slate-800">
              {filteredItems.map((item, index) => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                  {/* # */}
                  <td className="p-2 text-center text-slate-400 font-mono text-[11px] border-r border-slate-100 bg-slate-50/40">
                    {index + 1}
                  </td>

                  {/* ID */}
                  <td className="p-1 border-r border-slate-100">
                    <input
                      id={`dev-id-input-${item.id}`}
                      type="text"
                      value={item.scenarioId}
                      onChange={(e) => handleCellChange(item.id, 'scenarioId', e.target.value)}
                      className="w-full px-1.5 py-1 font-mono font-bold text-blue-600 bg-transparent hover:bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 rounded text-xs"
                    />
                  </td>

                  {/* Scenario */}
                  <td className="p-1 border-r border-slate-100">
                    <textarea
                      id={`dev-scenario-textarea-${item.id}`}
                      rows={2}
                      value={item.scenario}
                      onChange={(e) => handleCellChange(item.id, 'scenario', e.target.value)}
                      onBlur={(e) => {
                        const polished = correctSpelling(e.target.value);
                        if (polished !== e.target.value) {
                          handleCellChange(item.id, 'scenario', polished);
                        }
                      }}
                      placeholder="e.g., Loan creation with 5-year tenure covering leap year..."
                      className="w-full px-2 py-1 text-slate-800 bg-transparent hover:bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 rounded text-xs resize-y"
                    />
                  </td>

                  {/* Test Data */}
                  <td className="p-1 border-r border-slate-100">
                    <textarea
                      id={`dev-testdata-textarea-${item.id}`}
                      rows={2}
                      value={item.testData}
                      onChange={(e) => handleCellChange(item.id, 'testData', e.target.value)}
                      placeholder="Principal, rate, frequency..."
                      className="w-full px-1.5 py-1 font-mono text-slate-700 bg-transparent hover:bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 rounded text-[11px] resize-y"
                    />
                  </td>

                  {/* Expected Result */}
                  <td className="p-1 border-r border-slate-100">
                    <textarea
                      id={`dev-expected-textarea-${item.id}`}
                      rows={2}
                      value={item.expectedResult}
                      onChange={(e) => handleCellChange(item.id, 'expectedResult', e.target.value)}
                      placeholder="Expected outcome..."
                      className="w-full px-2 py-1 text-slate-700 bg-transparent hover:bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 rounded text-xs resize-y"
                    />
                  </td>

                  {/* Actual Result */}
                  <td className="p-1 border-r border-slate-100">
                    <textarea
                      id={`dev-actual-textarea-${item.id}`}
                      rows={2}
                      value={item.actualResult}
                      onChange={(e) => handleCellChange(item.id, 'actualResult', e.target.value)}
                      placeholder="Actual output observed during test..."
                      className="w-full px-2 py-1 text-slate-700 bg-transparent hover:bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 rounded text-xs resize-y"
                    />
                  </td>

                  {/* Screen shots / File Attach (Multiple files + Ctrl+V paste support) */}
                  <td className="p-1 border-r border-slate-100">
                    <RowAttachmentsCell
                      id={`dev-attachments-${item.id}`}
                      attachments={item.attachments}
                      fallbackScreenshotName={item.screenshotName}
                      fallbackScreenshotUrl={item.screenshotUrl}
                      onAddAttachment={(file) => handleAddAttachment(item.id, file)}
                      onRemoveAttachment={(attId) => handleRemoveAttachment(item.id, attId)}
                    />
                  </td>

                  {/* Status */}
                  <td className="p-1.5 border-r border-slate-100 text-center">
                    <select
                      id={`dev-status-select-${item.id}`}
                      value={item.status}
                      onChange={(e) => handleCellChange(item.id, 'status', e.target.value)}
                      className={`w-full px-2 py-1 text-xs font-bold rounded border cursor-pointer focus:outline-none ${
                        item.status === 'Passed'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                          : item.status === 'Passed with Limitations'
                          ? 'bg-amber-50 text-amber-700 border-amber-300'
                          : 'bg-red-50 text-red-700 border-red-300'
                      }`}
                    >
                      <option value="Passed">Passed</option>
                      <option value="Passed with Limitations">Passed with Limitations</option>
                      <option value="Failed">Failed</option>
                    </select>
                  </td>

                  {/* Remarks */}
                  <td className="p-1 border-r border-slate-100">
                    <textarea
                      id={`dev-remarks-textarea-${item.id}`}
                      rows={2}
                      value={item.remarks}
                      onChange={(e) => handleCellChange(item.id, 'remarks', e.target.value)}
                      placeholder="Developer notes for QA..."
                      className="w-full px-2 py-1 text-slate-600 bg-transparent hover:bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 rounded text-xs resize-y"
                    />
                  </td>

                  {/* Actions */}
                  <td className="p-1 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        id={`dev-duplicate-btn-${item.id}`}
                        onClick={() => handleDuplicateRow(item.id)}
                        title="Duplicate row"
                        className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        id={`dev-delete-btn-${item.id}`}
                        onClick={() => handleDeleteRow(item.id)}
                        title="Delete row"
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
            id="dev-insert-row-bottom-btn"
            onClick={handleAddRow}
            className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold rounded shadow-2xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-blue-600" />
            <span>+ Insert Developer Test Row</span>
          </button>

          <div className="flex flex-wrap items-center gap-4 text-slate-500">
            <div>
              Total Tests: <strong className="text-slate-800">{items.length}</strong>
            </div>
            <div>
              Passed:{' '}
              <strong className="text-emerald-700">
                {items.filter((i) => i.status === 'Passed').length}
              </strong>
            </div>
            <div>
              Passed with Limitations:{' '}
              <strong className="text-amber-700">
                {items.filter((i) => i.status === 'Passed with Limitations').length}
              </strong>
            </div>
            <div>
              Failed:{' '}
              <strong className="text-red-700">
                {items.filter((i) => i.status === 'Failed').length}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* Cross-Verification QA Advantage Card */}
      <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold text-slate-900">
              Ticket Alignment: Developer Testing vs. QA Test Cases
            </h3>
          </div>
          <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
            Ticket #{header.ticketNo}
          </span>
        </div>
        <p className="text-xs text-slate-700 leading-relaxed">
          Both Developer Testing and QA Observations are unified under ticket #{header.ticketNo}. When exporting to Excel, Developer Testing produces a formatted spreadsheet with header rows matching company QA standards, scenario descriptions, row-wise attachment links, and status tags.
        </p>
      </div>

      {/* Azure DevOps Direct Attachment Modal */}
      <AzureDevopsModal
        isOpen={isAdoModalOpen}
        onClose={() => setIsAdoModalOpen(false)}
        ticketNumber={header.ticketNo}
        taskName={header.featureName}
        getFileBlob={() => getDeveloperTestingExcelBlob(header, items)}
        defaultComment={`Developer Testing Sheet for "${header.featureName}" (Ticket #${header.ticketNo}) executed by ${header.developer}. Total Scenarios: ${items.length} (Passed: ${items.filter((i) => i.status === 'Passed').length}, Failed: ${items.filter((i) => i.status === 'Failed').length}).`}
        onSuccessNotice={(msg) => {
          setAdoNotification(msg);
          setTimeout(() => setAdoNotification(null), 5000);
        }}
      />
    </div>
  );
};
