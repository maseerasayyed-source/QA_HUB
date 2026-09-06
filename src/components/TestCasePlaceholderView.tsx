import React, { useState } from 'react';
import { FileSpreadsheet, Lock, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';

interface TestCasePlaceholderViewProps {
  savedFormat: string | null;
  onOpenFormatInput: () => void;
}

export const TestCasePlaceholderView: React.FC<TestCasePlaceholderViewProps> = ({
  savedFormat,
  onOpenFormatInput,
}) => {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg p-8 shadow-xs text-center space-y-5">
        <div className="w-12 h-12 bg-blue-50 border border-blue-100 rounded-lg flex items-center justify-center mx-auto text-blue-600">
          <FileSpreadsheet className="w-6 h-6" />
        </div>

        <div className="max-w-xl mx-auto space-y-1.5">
          <h2 className="text-base font-bold text-slate-900">
            Test Case Library &amp; Execution Workbench
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            As mandated in your development rules, we are strictly holding the table columns and database schema until you provide your exact test case spreadsheet format.
          </p>
        </div>

        {savedFormat ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-left space-y-2.5 max-w-2xl mx-auto">
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Registered Test Case Format Detected:</span>
            </div>
            <pre className="text-xs font-mono bg-white p-3 rounded border border-emerald-100 text-slate-800 whitespace-pre-line">
              {savedFormat}
            </pre>
            <div className="flex items-center justify-between pt-1 text-xs">
              <span className="text-emerald-700 font-medium">
                Ready to generate PostgreSQL table DDL and interactive editable table!
              </span>
              <button
                onClick={onOpenFormatInput}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 underline cursor-pointer"
              >
                Modify Format
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-left space-y-2.5 max-w-xl mx-auto text-xs text-amber-900">
            <div className="flex items-center gap-2 font-bold">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Awaiting Your Custom Format</span>
            </div>
            <p className="leading-relaxed">
              To ensure 100% adherence to your existing QA processes at Beacon, please provide your exact Excel / Google Sheets columns. We will not add or omit a single column.
            </p>
            <button
              onClick={onOpenFormatInput}
              className="mt-1 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Provide Format Now</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
