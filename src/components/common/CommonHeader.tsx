import React from 'react';
import { Search, Sparkles, Wand2 } from 'lucide-react';
import { TicketSummary } from '../../types';
import { polishObservationText } from '../../utils/textPolisher';

interface CommonHeaderProps {
  selectedTicketNumber: string;
  tickets: TicketSummary[];
  description: string;
  testingScenarios: string;
  onSelectTicket: (ticketNumber: string) => void;
  onChangeDescription: (value: string) => void;
  onChangeTestingScenarios: (value: string) => void;
  onGenerateAi?: () => void;
  isGenerating?: boolean;
  generateButtonText?: string;
  showGenerateButton?: boolean;
}

export const CommonHeader: React.FC<CommonHeaderProps> = ({
  selectedTicketNumber,
  tickets,
  description,
  testingScenarios,
  onSelectTicket,
  onChangeDescription,
  onChangeTestingScenarios,
  onGenerateAi,
  isGenerating = false,
  generateButtonText = 'Generate AI',
  showGenerateButton = true,
}) => {
  const currentTicket = tickets.find(
    (t) => t.ticketNumber.toLowerCase() === selectedTicketNumber.toLowerCase()
  );

  const handlePolishDescription = () => {
    if (!description.trim()) return;
    const polished = polishObservationText(description);
    onChangeDescription(polished);
  };

  const handlePolishScenarios = () => {
    if (!testingScenarios.trim()) return;
    const polished = polishObservationText(testingScenarios);
    onChangeTestingScenarios(polished);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Ticket ID Searchable Dropdown */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Ticket ID
          </label>
          <div className="relative">
            <select
              value={selectedTicketNumber}
              onChange={(e) => onSelectTicket(e.target.value)}
              className="w-full px-3 py-2 pr-8 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              {tickets.map((t) => (
                <option key={t.id} value={t.ticketNumber}>
                  #{t.ticketNumber} – {t.featureName}
                </option>
              ))}
            </select>
          </div>
          {currentTicket && (
            <p className="text-[11px] text-slate-500 truncate">
              Module: <strong className="text-slate-700">{currentTicket.moduleName}</strong> • Dev:{' '}
              <strong className="text-slate-700">{currentTicket.developer}</strong>
            </p>
          )}
        </div>

        {/* Description Field */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Description
            </label>
            <button
              type="button"
              onClick={handlePolishDescription}
              title="Convert content into simple, clear, professional English"
              className="px-2 py-0.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-[10px] font-bold rounded flex items-center gap-1 cursor-pointer"
            >
              <Wand2 className="w-3 h-3 text-purple-600" />
              <span>AI Polish</span>
            </button>
          </div>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => onChangeDescription(e.target.value)}
            placeholder="Enter or paste ticket description..."
            className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 resize-y"
          />
        </div>

        {/* Testing Scenarios / Points */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Testing Scenarios / Points
            </label>
            <button
              type="button"
              onClick={handlePolishScenarios}
              title="Convert points into simple, clear, professional English"
              className="px-2 py-0.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-[10px] font-bold rounded flex items-center gap-1 cursor-pointer"
            >
              <Wand2 className="w-3 h-3 text-purple-600" />
              <span>AI Polish</span>
            </button>
          </div>
          <textarea
            rows={2}
            value={testingScenarios}
            onChange={(e) => onChangeTestingScenarios(e.target.value)}
            placeholder="Enter or paste testing scenarios / points..."
            className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 resize-y"
          />
        </div>
      </div>

      {/* Generate AI Button */}
      {showGenerateButton && onGenerateAi && (
        <div className="pt-2 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onGenerateAi}
            disabled={isGenerating}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg flex items-center gap-2 cursor-pointer shadow-2xs transition-all"
          >
            <Sparkles className="w-4 h-4 text-blue-200" />
            <span>{isGenerating ? 'Analyzing & Generating...' : generateButtonText}</span>
          </button>
        </div>
      )}
    </div>
  );
};
