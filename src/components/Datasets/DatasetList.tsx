'use client';

import React, { useState } from 'react';
import { Database, Search, Loader2, ChevronRight, CheckCircle2, AlertTriangle, FileText, ImageIcon, FileCode, HelpCircle } from 'lucide-react';

interface DatasetItem {
  id: string;
  name: string;
  datasetType: string;
  status: 'PENDING_UPLOAD' | 'PROCESSING' | 'READY' | 'FAILED' | string;
  numRecords: number;
  description: string | null;
  schemaMetadata: any | null;
  createdAt: string;
  updatedAt: string;
}

interface DatasetListProps {
  datasets: DatasetItem[];
  selectedDatasetId?: string | null;
  onSelect: (dataset: DatasetItem) => void;
  onSync: () => void;
  isLoading: boolean;
}

export default function DatasetList({
  datasets,
  selectedDatasetId,
  onSelect,
  onSync,
  isLoading,
}: DatasetListProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredDatasets = datasets.filter((ds) =>
    ds.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-[#1e1f22]/30 border border-[#2b2d31] rounded-2xl p-6 space-y-4">
      {/* List Header */}
      <div className="flex justify-between items-center border-b border-[#2b2d31] pb-3">
        <h3 className="text-sm font-extrabold text-white uppercase tracking-widest flex items-center gap-2">
          <Database size={14} className="text-[#8ab4f8]" />
          <span>Workspace Index</span>
        </h3>
        <button
          onClick={onSync}
          disabled={isLoading}
          className="text-[10px] font-bold text-[#8ab4f8] hover:text-[#a8c7fa] hover:underline bg-transparent border-none cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
        >
          {isLoading && <Loader2 size={10} className="animate-spin" />}
          <span>Sync Listings</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9aa0a6]" />
        <input
          type="text"
          placeholder="Filter workspace datasets..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-[#141517]/80 border border-[#2b2d31] rounded-xl text-xs text-[#e3e3e3] placeholder-[#9aa0a6] focus:outline-none focus:border-[#8ab4f8] transition-all font-semibold"
        />
      </div>

      {/* Dataset Grid List */}
      <div className="space-y-3">
        {isLoading && datasets.length === 0 ? (
          <div className="text-center text-gray-500 py-16 text-xs font-bold animate-pulse">
            Fetching active models datasets...
          </div>
        ) : filteredDatasets.length === 0 ? (
          <div className="text-center text-gray-500 py-16 text-xs font-bold">
            {datasets.length === 0
              ? 'Workspace dataset repository is empty. Drop files above to populate metadata.'
              : 'No datasets matched the search filter.'}
          </div>
        ) : (
          filteredDatasets.map((dataset) => {
            const isCSV = dataset.datasetType.includes('CSV');
            const isImage = dataset.datasetType.includes('ZIP') || dataset.datasetType.includes('IMAGE');
            const isTensor = dataset.datasetType.includes('TENSOR');
            const isSelected = selectedDatasetId === dataset.id;

            return (
              <div
                key={dataset.id}
                onClick={() => onSelect(dataset)}
                className={`flex items-center justify-between p-4 border rounded-2xl hover:bg-[#1e1f22]/40 transition-all cursor-pointer relative group shadow-sm select-none ${
                  isSelected
                    ? 'border-[#8ab4f8] bg-[#8ab4f8]/5'
                    : 'bg-[#141517]/80 border-[#2b2d31]'
                }`}
              >
                <div className="flex items-center gap-3.5 max-w-[70%]">
                  {/* Format Icons */}
                  <div className={`p-2.5 rounded-xl border text-xs ${
                    isCSV ? 'bg-blue-500/10 text-blue-400 border-blue-900/25' :
                    isImage ? 'bg-purple-500/10 text-purple-400 border-purple-900/25' :
                    'bg-emerald-500/10 text-emerald-400 border-emerald-900/25'
                  }`}>
                    {isCSV && <FileText size={16} />}
                    {isImage && <ImageIcon size={16} />}
                    {isTensor && <FileCode size={16} />}
                    {!isCSV && !isImage && !isTensor && <FileCode size={16} />}
                  </div>

                  <div className="space-y-0.5 truncate">
                    <h4 className="text-xs font-black text-white group-hover:text-[#8ab4f8] transition-colors truncate max-w-[280px]" title={dataset.name}>
                      {dataset.name}
                    </h4>

                    <div className="flex items-center gap-2 text-[9px] text-[#9aa0a6] font-mono tracking-wider font-semibold">
                      <span>{dataset.datasetType}</span>
                      <span>•</span>
                      <span>
                        {dataset.status === 'READY'
                          ? `${dataset.numRecords.toLocaleString()} elements`
                          : dataset.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Status and Details */}
                <div className="flex items-center gap-6">
                  {dataset.status === 'READY' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full border border-[#81c784]/25 bg-[#81c784]/5 text-[#81c784] text-[9px] uppercase font-mono font-extrabold shadow-sm select-none">
                      <CheckCircle2 size={11} />
                      <span>Ready</span>
                    </span>
                  )}

                  {dataset.status === 'PROCESSING' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full border border-[#ffe082]/25 bg-[#ffe082]/5 text-[#ffe082] text-[9px] uppercase font-mono font-extrabold shadow-sm select-none animate-pulse">
                      <Loader2 size={11} className="animate-spin" />
                      <span>Processing</span>
                    </span>
                  )}

                  {dataset.status === 'FAILED' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full border border-rose-500/25 bg-rose-500/5 text-rose-300 text-[9px] uppercase font-mono font-extrabold shadow-sm select-none animate-pulse">
                      <AlertTriangle size={11} className="text-rose-400" />
                      <span>Failed</span>
                    </span>
                  )}

                  {dataset.status === 'PENDING_UPLOAD' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full border border-gray-500/25 bg-gray-500/5 text-gray-400 text-[9px] uppercase font-mono font-extrabold shadow-sm select-none">
                      <HelpCircle size={11} />
                      <span>Standby</span>
                    </span>
                  )}

                  <ChevronRight size={14} className="text-gray-500 group-hover:text-white transition-all transform group-hover:translate-x-0.5" />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
