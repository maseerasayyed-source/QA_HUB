import React, { useState, useRef, useEffect } from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown, Filter, X, Check } from 'lucide-react';

export type SortDirection = 'asc' | 'desc' | null;

export interface ColumnHeaderProps {
  id: string;
  title: string;
  columnKey: string;
  sortKey: string | null;
  sortDirection: SortDirection;
  onSort: (key: string) => void;
  filterValue: string;
  onFilterChange: (key: string, value: string) => void;
  options?: string[]; // Optional distinct choices for fast picking
  className?: string;
  align?: 'left' | 'center' | 'right';
  subtitle?: string;
}

export const ColumnHeader: React.FC<ColumnHeaderProps> = ({
  id,
  title,
  columnKey,
  sortKey,
  sortDirection,
  onSort,
  filterValue,
  onFilterChange,
  options,
  className = '',
  align = 'left',
  subtitle,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isSorted = sortKey === columnKey && sortDirection !== null;
  const isFiltered = Boolean(filterValue && filterValue.trim() !== '');

  // Close popup on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Auto-focus the input
      setTimeout(() => inputRef.current?.focus(), 50);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleToggleSort = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSort(columnKey);
  };

  const handleFilterClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const handleClearFilter = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFilterChange(columnKey, '');
    setIsOpen(false);
  };

  return (
    <th
      id={id}
      className={`p-2.5 text-[11px] font-semibold tracking-wider relative select-none group border-r border-slate-700/60 ${className} ${
        align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left'
      }`}
    >
      <div className={`flex items-center gap-1.5 ${align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-between'}`}>
        {/* Clickable Header Label for Sorting */}
        <div
          onClick={handleToggleSort}
          className="flex items-center gap-1 cursor-pointer hover:text-white transition-colors truncate"
          title={`Click to sort by ${title}`}
        >
          <span className="truncate">{title}</span>
          {subtitle && <span className="text-[9px] text-purple-300 normal-case ml-1 font-normal">{subtitle}</span>}

          {/* Sort Icon */}
          <span className="shrink-0 p-0.5 rounded hover:bg-slate-700/60 transition-colors">
            {isSorted ? (
              sortDirection === 'asc' ? (
                <ArrowUp className="w-3 h-3 text-blue-400 font-bold" />
              ) : (
                <ArrowDown className="w-3 h-3 text-blue-400 font-bold" />
              )
            ) : (
              <ArrowUpDown className="w-3 h-3 text-slate-500 opacity-40 group-hover:opacity-100 transition-opacity" />
            )}
          </span>
        </div>

        {/* Filter Toggle Button */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={handleFilterClick}
            title={isFiltered ? `Filtered by "${filterValue}". Click to edit.` : `Filter by ${title}`}
            className={`p-1 rounded text-[10px] transition-all cursor-pointer ${
              isFiltered
                ? 'bg-blue-500 text-white shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/60 opacity-60 group-hover:opacity-100'
            }`}
          >
            <Filter className="w-2.5 h-2.5" />
          </button>

          {/* Filter Popover Dropdown */}
          {isOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-56 bg-white text-slate-800 rounded-lg shadow-xl border border-slate-200 z-50 p-3 text-xs normal-case font-normal animate-fadeIn">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                <span className="font-bold text-slate-700 text-[11px] flex items-center gap-1">
                  <Filter className="w-3 h-3 text-blue-600" />
                  Filter {title}
                </span>
                {isFiltered && (
                  <button
                    onClick={handleClearFilter}
                    className="text-[10px] text-red-600 hover:underline flex items-center gap-0.5 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                    Reset
                  </button>
                )}
              </div>

              {/* Text Search Input */}
              <div className="relative mb-2">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder={`Search ${title}...`}
                  value={filterValue}
                  onChange={(e) => onFilterChange(columnKey, e.target.value)}
                  className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                {filterValue && (
                  <button
                    onClick={() => onFilterChange(columnKey, '')}
                    className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Quick option presets if available */}
              {options && options.length > 0 && (
                <div className="space-y-1 pt-1">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Select Value:</div>
                  <div className="max-h-28 overflow-y-auto space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        onFilterChange(columnKey, '');
                        setIsOpen(false);
                      }}
                      className={`w-full text-left px-2 py-1 rounded text-[11px] flex items-center justify-between hover:bg-slate-100 cursor-pointer ${
                        !filterValue ? 'font-bold text-blue-600 bg-blue-50' : 'text-slate-600'
                      }`}
                    >
                      <span>(All)</span>
                      {!filterValue && <Check className="w-3 h-3 text-blue-600" />}
                    </button>
                    {options.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          onFilterChange(columnKey, opt);
                          setIsOpen(false);
                        }}
                        className={`w-full text-left px-2 py-1 rounded text-[11px] flex items-center justify-between hover:bg-slate-100 cursor-pointer truncate ${
                          filterValue.toLowerCase() === opt.toLowerCase()
                            ? 'font-bold text-blue-600 bg-blue-50'
                            : 'text-slate-700'
                        }`}
                      >
                        <span className="truncate">{opt}</span>
                        {filterValue.toLowerCase() === opt.toLowerCase() && (
                          <Check className="w-3 h-3 text-blue-600 shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-2 pt-2 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </th>
  );
};
