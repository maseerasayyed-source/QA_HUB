import React, { useState } from 'react';
import { FolderTree, Plus, Search, Filter, Layers } from 'lucide-react';
import { BeaconModule } from '../types';

interface ModulesViewProps {
  modules: BeaconModule[];
  onAddModule: (newModule: BeaconModule) => void;
}

export const ModulesView: React.FC<ModulesViewProps> = ({
  modules,
  onAddModule,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  // New module form state
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newCategory, setNewCategory] = useState<'Lending' | 'Investments' | 'Treasury' | 'Accounting' | 'Core'>('Lending');
  const [newDesc, setNewDesc] = useState('');

  const filteredModules = modules.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCategory === 'all' || m.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newCode.trim()) return;

    const newMod: BeaconModule = {
      id: `mod-${Date.now()}`,
      name: newName.trim(),
      code: newCode.trim().toUpperCase(),
      category: newCategory,
      description: newDesc.trim() || 'Custom Beacon financial submodule',
      activeTicketsCount: 0,
    };

    onAddModule(newMod);
    setNewName('');
    setNewCode('');
    setNewDesc('');
    setShowAddModal(false);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-blue-50 text-blue-600 rounded-md border border-blue-100">
              <FolderTree className="w-4 h-4" />
            </span>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Beacon Financial Modules</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Dynamic module registry for Beacon. Add new lending products or treasury instruments anytime.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-md flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Custom Module</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search module name, code (e.g. WCDL, NCD)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-100 border-none rounded-md py-1.5 pl-8 pr-4 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-800"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          {['all', 'Lending', 'Investments', 'Treasury', 'Accounting', 'Core'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat === 'all' ? 'All Categories' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {filteredModules.map((mod) => (
          <div
            key={mod.id}
            className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                  {mod.code}
                </span>
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                  {mod.category}
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">{mod.name}</h3>
              <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{mod.description}</p>
            </div>

            <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">Active Tickets</span>
              <span className="font-semibold text-slate-800">{mod.activeTicketsCount} in QA</span>
            </div>
          </div>
        ))}
      </div>

      {/* Add Module Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-5 shadow-xl border border-slate-200 space-y-3">
            <h2 className="text-sm font-bold text-slate-900">Add New Beacon Module</h2>

            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Module Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bank Guarantee (BG) or Reverse Repo"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Module Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BG"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-md uppercase font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-md"
                  >
                    <option value="Lending">Lending</option>
                    <option value="Investments">Investments</option>
                    <option value="Treasury">Treasury</option>
                    <option value="Accounting">Accounting</option>
                    <option value="Core">Core</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description / Business Scope</label>
                <textarea
                  rows={3}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Explain financial instruments or workflow covered..."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-md"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold cursor-pointer"
                >
                  Save Module
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
