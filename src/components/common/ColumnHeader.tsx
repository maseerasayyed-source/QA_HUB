import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown, Filter, Search, X, Check } from 'lucide-react';

export type SortDirection = 'asc' | 'desc' | null;

export interface ColumnHeaderProps {
  id?: string;
  title?: string;
  label?: string;
  columnKey?: string;
  sortKey?: string | null;
  currentSortKey?: string | null;
  sortDirection?: SortDirection;
  onSort?: ((key: string, direction: SortDirection) => void) | ((key: string) => void);
  // Pattern A props (single string filter + options)
  filterValue?: string;
  options?: string[];
  // Pattern B props (multi-select array filter + inline searchTerm)
  filterOptions?: string[];
  selectedFilters?: string[];
  searchTerm?: string;
  onSearchChange?: (term: string) => void;
  // Shared filter callback supporting both (key, value) and (values[])
  onFilterChange?: ((key: string, value: string) => void) | ((values: string[]) => void);
  className?: string;
  align?: 'left' | 'center' | 'right';
  subtitle?: string;
  placeholder?: string;
}

export const ColumnHeader: React.FC<ColumnHeaderProps> = ({
  id,
  title,
  label,
  columnKey,
  sortKey = null,
  currentSortKey,
  sortDirection = null,
  onSort,
  filterValue = '',
  options,
  filterOptions,
  selectedFilters,
  searchTerm,
  onSearchChange,
  onFilterChange,
  className = '',
  align = 'left',
  subtitle,
  placeholder,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [optionSearch, setOptionSearch] = useState<string>('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Resolve header display title (supports both `title` and `label`)
  const displayTitle = title || label || columnKey || sortKey || '';

  // Resolve column identifier and active sort key
  const colId = columnKey || sortKey || '';
  const activeSortKey = columnKey ? sortKey : (currentSortKey !== undefined ? currentSortKey : null);

  // Determine whether Pattern B (multi-select array + searchTerm) is used
  const isMultiSelectMode = Array.isArray(selectedFilters) || typeof onSearchChange === 'function';

  // Effective inline search value
  const effectiveSearchValue = isMultiSelectMode ? (searchTerm || '') : (filterValue || '');

  // Effective options list
  const rawOptions = options || filterOptions || [];

  const isSorted = Boolean(colId && activeSortKey === colId && sortDirection !== null);
  const isFiltered = isMultiSelectMode
    ? Boolean((selectedFilters && selectedFilters.length > 0) || (searchTerm && searchTerm.trim() !== ''))
    : Boolean(filterValue && filterValue.trim() !== '');

  // Filter options inside popover based on optionSearch
  const visibleOptions = useMemo(() => {
    const unique = Array.from(
      new Set(rawOptions.filter((o) => o !== undefined && o !== null && String(o).trim() !== ''))
    );
    if (!optionSearch.trim()) return unique;
    const q = optionSearch.toLowerCase().trim();
    return unique.filter((opt) => String(opt).toLowerCase().includes(q));
  }, [rawOptions, optionSearch]);

  // Close popup on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const computeNextSort = (): SortDirection => {
    if (activeSortKey !== colId) return 'asc';
    if (sortDirection === 'asc') return 'desc';
    if (sortDirection === 'desc') return null;
    return 'asc';
  };

  const handleToggleSort = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onSort || !colId) return;
    const nextDir = computeNextSort();
    (onSort as (k: string, d: SortDirection) => void)(colId, nextDir);
  };

  const handleSortExplicit = (dir: SortDirection) => {
    if (!onSort || !colId) return;
    (onSort as (k: string, d: SortDirection) => void)(colId, dir);
  };

  const handleSearchInput = (val: string) => {
    if (onSearchChange) {
      onSearchChange(val);
    } else if (onFilterChange && !Array.isArray(selectedFilters)) {
      (onFilterChange as (k: string, v: string) => void)(colId, val);
    }
  };

  const handleToggleOption = (opt: string) => {
    if (!onFilterChange) return;
    if (Array.isArray(selectedFilters)) {
      const exists = selectedFilters.includes(opt);
      const next = exists ? selectedFilters.filter((item) => item !== opt) : [...selectedFilters, opt];
      (onFilterChange as (vals: string[]) => void)(next);
    } else {
      const nextVal = filterValue.toLowerCase() === opt.toLowerCase() ? '' : opt;
      (onFilterChange as (k: string, v: string) => void)(colId, nextVal);
      setIsOpen(false);
    }
  };

  const handleSelectAllOptions = () => {
    if (!onFilterChange) return;
    if (Array.isArray(selectedFilters)) {
      (onFilterChange as (vals: string[]) => void)([]);
    } else {
      (onFilterChange as (k: string, v: string) => void)(colId, '');
      setIsOpen(false);
    }
  };

  const handleClearAll = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (onSearchChange) {
      onSearchChange('');
    }
    if (onFilterChange) {
      if (Array.isArray(selectedFilters)) {
        (onFilterChange as (vals: string[]) => void)([]);
      } else {
        (onFilterChange as (k: string, v: string) => void)(colId, '');
      }
    }
    setOptionSearch('');
  };

  const handleFilterClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const hasFilterSupport = Boolean(onFilterChange || onSearchChange);

  return (
    <th
      id={id}
      className={`p-2 text-[11px] font-semibold tracking-wider relative select-none group border-r border-slate-700/60 align-top ${className} ${
        align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left'
      }`}
    >
      <div className="flex flex-col gap-1.5 min-w-[90px]">
        {/* Top Row: Visible Column Header Name + Sort + Filter Dropdown Trigger */}
        <div
          className={`flex items-center gap-1 ${
            align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-between'
          }`}
        >
          {/* Clickable Header Title for Sorting */}
          <div
            onClick={handleToggleSort}
            className="flex items-center gap-1 cursor-pointer text-white hover:text-blue-200 transition-colors min-w-0"
            title={`Click to sort by ${displayTitle}`}
          >
            <span className="font-bold text-[11px] text-white leading-snug whitespace-nowrap">
              {displayTitle}
            </span>
            {subtitle && (
              <span className="text-[9px] text-purple-300 normal-case ml-0.5 font-normal whitespace-nowrap">
                {subtitle}
              </span>
            )}

            {/* Sort Icon */}
            {onSort && (
              <span className="shrink-0 p-0.5 rounded hover:bg-slate-700/60 transition-colors">
                {isSorted ? (
                  sortDirection === 'asc' ? (
                    <ArrowUp className="w-3 h-3 text-blue-400 font-bold" />
                  ) : (
                    <ArrowDown className="w-3 h-3 text-blue-400 font-bold" />
                  )
                ) : (
                  <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-60 group-hover:opacity-100 transition-opacity" />
                )}
              </span>
            )}
          </div>

          {/* Filter Dropdown Button */}
          {hasFilterSupport && (
            <div className="relative shrink-0" ref={dropdownRef}>
              <button
                type="button"
                onClick={handleFilterClick}
                title={
                  isFiltered
                    ? `Active filter on ${displayTitle}. Click for filter options.`
                    : `Filter & Search options for ${displayTitle}`
                }
                className={`p-1 rounded text-[10px] transition-all cursor-pointer flex items-center gap-0.5 ${
                  isFiltered
                    ? 'bg-blue-500 text-white shadow-xs ring-1 ring-blue-300'
                    : 'text-slate-200 hover:text-white hover:bg-slate-700/70 opacity-85 group-hover:opacity-100'
                }`}
              >
                <Filter className="w-2.5 h-2.5" />
                {Array.isArray(selectedFilters) && selectedFilters.length > 0 && (
                  <span className="text-[9px] font-bold px-0.5">{selectedFilters.length}</span>
                )}
              </button>

              {/* Filter Popover Dropdown */}
              {isOpen && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className={`absolute ${
                    align === 'right' ? 'right-0' : 'left-0'
                  } top-full mt-1.5 w-64 bg-white text-slate-800 rounded-xl shadow-2xl border border-slate-200 z-50 p-3 text-xs normal-case font-normal animate-fadeIn`}
                >
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                    <span className="font-bold text-slate-800 text-[11px] flex items-center gap-1.5 truncate">
                      <Filter className="w-3 h-3 text-blue-600 shrink-0" />
                      <span className="truncate">Filter: {displayTitle}</span>
                    </span>
                    {(isFiltered || isSorted) && (
                      <button
                        type="button"
                        onClick={(e) => {
                          handleClearAll(e);
                          setIsOpen(false);
                        }}
                        className="text-[10px] text-red-600 hover:underline flex items-center gap-0.5 cursor-pointer font-semibold shrink-0"
                      >
                        <X className="w-3 h-3" />
                        Reset
                      </button>
                    )}
                  </div>

                  {/* Quick Sort Actions in Dropdown */}
                  {onSort && (
                    <div className="grid grid-cols-2 gap-1.5 mb-2.5 pb-2 border-b border-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          handleSortExplicit('asc');
                          setIsOpen(false);
                        }}
                        className={`px-2 py-1 rounded text-[10px] font-semibold flex items-center justify-center gap-1 border cursor-pointer transition-colors ${
                          isSorted && sortDirection === 'asc'
                            ? 'bg-blue-50 text-blue-700 border-blue-300'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        <ArrowUp className="w-2.5 h-2.5" />
                        <span>Sort A → Z</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleSortExplicit('desc');
                          setIsOpen(false);
                        }}
                        className={`px-2 py-1 rounded text-[10px] font-semibold flex items-center justify-center gap-1 border cursor-pointer transition-colors ${
                          isSorted && sortDirection === 'desc'
                            ? 'bg-blue-50 text-blue-700 border-blue-300'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        <ArrowDown className="w-2.5 h-2.5" />
                        <span>Sort Z → A</span>
                      </button>
                    </div>
                  )}

                  {/* Search Filter Input inside Popover */}
                  <div className="mb-2">
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">
                      Search Filter
                    </label>
                    <div className="relative">
                      <Search className="w-3 h-3 text-slate-400 absolute left-2 top-2" />
                      <input
                        ref={inputRef}
                        type="text"
                        placeholder={`Search ${displayTitle}...`}
                        value={effectiveSearchValue}
                        onChange={(e) => handleSearchInput(e.target.value)}
                        className="w-full pl-6 pr-6 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800"
                      />
                      {effectiveSearchValue && (
                        <button
                          type="button"
                          onClick={() => handleSearchInput('')}
                          className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Distinct Option Values Picker */}
                  {rawOptions.length > 0 && (
                    <div className="space-y-1.5 pt-1 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-500 uppercase font-semibold">
                          Filter by Value ({visibleOptions.length})
                        </span>
                      </div>
                      {rawOptions.length > 5 && (
                        <input
                          type="text"
                          placeholder="Find in values..."
                          value={optionSearch}
                          onChange={(e) => setOptionSearch(e.target.value)}
                          className="w-full px-2 py-1 text-[11px] bg-slate-50 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800"
                        />
                      )}
                      <div className="max-h-36 overflow-y-auto space-y-0.5 pr-0.5">
                        <button
                          type="button"
                          onClick={handleSelectAllOptions}
                          className={`w-full text-left px-2 py-1 rounded text-[11px] flex items-center justify-between hover:bg-slate-100 cursor-pointer ${
                            (Array.isArray(selectedFilters) ? selectedFilters.length === 0 : !filterValue)
                              ? 'font-bold text-blue-600 bg-blue-50/80'
                              : 'text-slate-600'
                          }`}
                        >
                          <span>(Select All)</span>
                          {(Array.isArray(selectedFilters) ? selectedFilters.length === 0 : !filterValue) && (
                            <Check className="w-3 h-3 text-blue-600" />
                          )}
                        </button>
                        {visibleOptions.map((opt) => {
                          const optStr = String(opt);
                          const isSelected = Array.isArray(selectedFilters)
                            ? selectedFilters.includes(optStr)
                            : filterValue.toLowerCase() === optStr.toLowerCase();
                          return (
                            <button
                              key={optStr}
                              type="button"
                              onClick={() => handleToggleOption(optStr)}
                              className={`w-full text-left px-2 py-1 rounded text-[11px] flex items-center justify-between hover:bg-slate-100 cursor-pointer truncate ${
                                isSelected ? 'font-bold text-blue-600 bg-blue-50/80' : 'text-slate-700'
                              }`}
                            >
                              <span className="truncate">{optStr}</span>
                              {isSelected && <Check className="w-3 h-3 text-blue-600 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => handleClearAll()}
                      className="text-[11px] text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[11px] font-semibold cursor-pointer shadow-2xs"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Second Row: Inline Quick Search & Filter Box directly inside Column Header */}
        {hasFilterSupport && (
          <div className="relative w-full" onClick={(e) => e.stopPropagation()}>
            <Search className="w-2.5 h-2.5 text-slate-400 absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={effectiveSearchValue}
              onChange={(e) => handleSearchInput(e.target.value)}
              placeholder={placeholder || `Search...`}
              className={`w-full pl-5 pr-4 py-0.5 text-[10px] font-normal normal-case rounded border transition-colors focus:outline-none ${
                effectiveSearchValue.trim() !== ''
                  ? 'bg-blue-950/90 text-white border-blue-400 placeholder-blue-300 ring-1 ring-blue-400/50'
                  : 'bg-slate-800/80 text-slate-100 border-slate-600/80 placeholder-slate-400 focus:bg-slate-800 focus:border-blue-400'
              }`}
            />
            {effectiveSearchValue.trim() !== '' && (
              <button
                type="button"
                onClick={() => handleSearchInput('')}
                title="Clear column search"
                className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </th>
  );
};


