'use client';

import React, { useState } from 'react';
import { 
  X, 
  Search, 
  FileSpreadsheet, 
  Image as ImageIcon, 
  Binary, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  Calendar, 
  Hash, 
  ShieldAlert,
  Columns,
  Grid
} from 'lucide-react';

interface DatasetPreviewDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  dataset: {
    id: string;
    name: string;
    datasetType: string;
    status: 'PENDING_UPLOAD' | 'PROCESSING' | 'READY' | 'FAILED' | string;
    numRecords: number;
    description: string | null;
    schemaMetadata: any | null;
    createdAt: string;
    updatedAt: string;
  } | null;
}

export default function DatasetPreviewDrawer({ isOpen, onClose, dataset }: DatasetPreviewDrawerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'schema' | 'sample'>('schema');

  if (!isOpen || !dataset) return null;

  const datasetTypeFormatted = (dataset.datasetType || 'RAW').toUpperCase();
  const isCSV = datasetTypeFormatted.includes('CSV');
  const isImage = datasetTypeFormatted.includes('ZIP') || datasetTypeFormatted.includes('IMAGE');
  const isTensor = datasetTypeFormatted.includes('TENSOR') || datasetTypeFormatted.includes('NUMPY') || datasetTypeFormatted.includes('NPY') || datasetTypeFormatted.includes('NPZ');

  // Extract parsed schema metadata
  const meta = dataset.schemaMetadata || {};
  const columns = meta.columns || [];
  
  // Filter columns based on user search query
  const filteredColumns = columns.filter((col: any) => 
    col.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Synthesize realistic mock preview data rows based on CSV headers
  const getMockCSVRows = () => {
    if (columns.length === 0) return [];
    
    const mockTemplates: Record<string, string[]> = {
      id: ['1', '2', '3', '4', '5'],
      label: ['1', '0', '1', '1', '0'],
      class: ['cat', 'dog', 'dog', 'cat', 'bird'],
      score: ['0.942', '0.125', '0.884', '0.731', '0.045'],
      image_path: ['train_01.png', 'train_02.png', 'train_03.png', 'train_04.png', 'train_05.png'],
      age: ['23', '45', '18', '34', '29'],
      income: ['64000', '112000', '48000', '85000', '72000'],
      sentiment: ['positive', 'negative', 'positive', 'positive', 'neutral'],
      text: [
        'Excellent model validation pipeline.',
        'Low hardware compile runs.',
        'Frictionless tensor shape calculations.',
        'Stunning Material design components.',
        'High execution speed on T4 cluster.'
      ]
    };

    const rows = [];
    for (let i = 0; i < 5; i++) {
      const row: Record<string, string> = {};
      columns.forEach((col: any) => {
        const key = col.name.toLowerCase();
        // Check if we have standard mock fields, or synthesize random value based on datatype
        if (mockTemplates[key]) {
          row[col.name] = mockTemplates[key][i];
        } else if (col.type === 'numeric') {
          row[col.name] = Math.round(Math.random() * 1000).toString();
        } else if (col.type === 'datetime') {
          row[col.name] = `2026-05-${20 + i} 14:32:01`;
        } else {
          row[col.name] = `val_${i + 1}`;
        }
      });
      rows.push(row);
    }
    return rows;
  };

  const mockCSVRows = getMockCSVRows();

  // Synthetic image classes for image ZIP previews
  const mockImageGallery = [
    { label: 'cifar10_frog_384.png', class: 'frog', color: 'bg-emerald-950/40 text-emerald-400 border-emerald-800/30' },
    { label: 'cifar10_automobile_02.png', class: 'automobile', color: 'bg-blue-950/40 text-blue-400 border-blue-800/30' },
    { label: 'cifar10_ship_84.png', class: 'ship', color: 'bg-cyan-950/40 text-cyan-400 border-cyan-800/30' },
    { label: 'cifar10_truck_193.png', class: 'truck', color: 'bg-indigo-950/40 text-indigo-400 border-indigo-800/30' },
    { label: 'cifar10_frog_12.png', class: 'frog', color: 'bg-emerald-950/40 text-emerald-400 border-emerald-800/30' },
    { label: 'cifar10_cat_299.png', class: 'cat', color: 'bg-pink-950/40 text-pink-400 border-pink-800/30' },
  ];

  return (
    <div className="fixed inset-y-0 right-0 w-full md:w-[480px] bg-[#141517] border-l border-[#3f4046] shadow-2xl z-50 flex flex-col transition-all duration-300 select-none">
      
      {/* Drawer Header */}
      <div className="px-6 py-4 bg-[#1e1f22] border-b border-[#3f4046] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#8ab4f8]/10 border border-[#8ab4f8]/15 rounded-2xl text-[#8ab4f8]">
            {isCSV && <FileSpreadsheet size={18} />}
            {isImage && <ImageIcon size={18} />}
            {isTensor && <Binary size={18} />}
            {!isCSV && !isImage && !isTensor && <Binary size={18} />}
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide truncate max-w-[280px]" title={dataset.name}>
              {dataset.name}
            </h3>
            <span className="text-[10px] text-[#9aa0a6] font-mono tracking-widest uppercase block mt-0.5">
              {datasetTypeFormatted} • {dataset.numRecords.toLocaleString()} Records
            </span>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-1.5 hover:bg-[#2b2d31] rounded-lg text-[#9aa0a6] hover:text-white transition-all cursor-pointer"
        >
          <X size={16} />
        </button>
      </div>

      {/* Drawer Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {/* Core Description */}
        {dataset.description && (
          <div className="bg-[#1e1f22]/50 border border-[#2b2d31] p-4 rounded-2xl space-y-1">
            <span className="text-[9px] font-extrabold text-gray-500 uppercase tracking-widest block">Description</span>
            <p className="text-xs text-gray-300 font-medium leading-relaxed select-text">{dataset.description}</p>
          </div>
        )}

        {/* 1. Status: FAILED */}
        {dataset.status === 'FAILED' && (
          <div className="border border-rose-500/20 bg-rose-500/5 p-5 rounded-2xl space-y-4">
            <div className="flex items-start gap-3">
              <ShieldAlert className="text-rose-400 shrink-0 mt-0.5" size={18} />
              <div>
                <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wide">Ingestion Parsing Failed</h4>
                <p className="text-[10.5px] text-rose-300 font-semibold leading-relaxed mt-1">
                  The dataset processing loop crashed during deep schema compilation. Verify file formats and column integrity.
                </p>
              </div>
            </div>
            {/* Traceback Monospace Console */}
            <div className="space-y-1.5">
              <span className="text-[8.5px] font-extrabold text-rose-400/80 uppercase tracking-widest block font-mono select-none">Python Exception Trail</span>
              <pre className="p-3 bg-black/40 text-rose-300 border border-rose-950 rounded-xl whitespace-pre-wrap leading-relaxed select-text font-mono text-[9px] max-h-48 overflow-y-auto">
                {`Exception: Ingestion Parser crashed. Header count mismatch.
Traceback (most recent call last):
  File "app/services/dataset_parsers.py", line 16, in parse_csv_metadata
    df_sample = pd.read_csv(filepath, nrows=100)
  File "pandas/io/parsers.py", line 912, in read_csv
    return _read(filepath, kwds)
  File "pandas/io/parsers.py", line 574, in _read
    parser = HTMLParser(dialect, **kwds)
ParserError: Error tokenizing data. C error: Expected 4 fields in line 12, saw 5`}
              </pre>
            </div>
          </div>
        )}

        {/* 2. Status: PROCESSING */}
        {dataset.status === 'PROCESSING' && (
          <div className="bg-[#1e1f22]/50 border border-[#2b2d31] p-8 rounded-2xl flex flex-col items-center justify-center text-center space-y-4">
            <Loader2 className="text-[#8ab4f8] animate-spin" size={28} />
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-white uppercase tracking-wide">Analysing Ingestion Schema</h4>
              <p className="text-[10.5px] text-gray-500 font-semibold max-w-xs leading-relaxed">
                Celery worker is currently mapping datatypes, sampling resolutions, and computing parameter tensors.
              </p>
            </div>
          </div>
        )}

        {/* 3. Status: PENDING_UPLOAD */}
        {dataset.status === 'PENDING_UPLOAD' && (
          <div className="bg-[#1e1f22]/50 border border-[#2b2d31] p-8 rounded-2xl flex flex-col items-center justify-center text-center space-y-3">
            <AlertCircle className="text-[#ffe082]" size={28} />
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-white uppercase tracking-wide">Pending File Upload</h4>
              <p className="text-[10.5px] text-gray-500 font-semibold max-w-xs leading-relaxed">
                This database record is in standby. Complete file ingestion transfers to trigger automated parsing.
              </p>
            </div>
          </div>
        )}

        {/* 4. Status: READY - Format Previews */}
        {dataset.status === 'READY' && (
          <div className="space-y-5">
            
            {/* Format specific previews */}

            {/* A. CSV PREVIEW */}
            {isCSV && (
              <div className="space-y-4">
                
                {/* Visual tabs inside CSV */}
                <div className="flex border-b border-[#2b2d31] text-xs font-bold select-none">
                  <button
                    onClick={() => setActiveSubTab('schema')}
                    className={`flex items-center gap-1.5 pb-2 px-3 border-b-2 transition-all cursor-pointer ${
                      activeSubTab === 'schema'
                        ? 'border-[#8ab4f8] text-[#8ab4f8]'
                        : 'border-transparent text-[#9aa0a6] hover:text-white'
                    }`}
                  >
                    <Columns size={12} />
                    <span>Schema Columns ({columns.length})</span>
                  </button>
                  <button
                    onClick={() => setActiveSubTab('sample')}
                    className={`flex items-center gap-1.5 pb-2 px-3 border-b-2 transition-all cursor-pointer ${
                      activeSubTab === 'sample'
                        ? 'border-[#8ab4f8] text-[#8ab4f8]'
                        : 'border-transparent text-[#9aa0a6] hover:text-white'
                    }`}
                  >
                    <Grid size={12} />
                    <span>Sample Preview</span>
                  </button>
                </div>

                {activeSubTab === 'schema' && (
                  <div className="space-y-3">
                    
                    {/* Columns Search Input (Agreement: yes) */}
                    <div className="relative">
                      <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa0a6]" />
                      <input 
                        type="text"
                        placeholder="Search columns..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 bg-[#101113] border border-[#2b2d31] rounded-xl text-xs text-[#e3e3e3] placeholder-[#9aa0a6] focus:outline-none focus:border-[#8ab4f8] transition-all font-medium"
                      />
                    </div>

                    {/* Column List */}
                    <div className="border border-[#2b2d31] rounded-2xl overflow-hidden divide-y divide-[#2b2d31] bg-[#101113]/30">
                      {filteredColumns.length === 0 ? (
                        <div className="text-center text-gray-500 py-6 text-xs font-semibold">
                          No columns match filter term.
                        </div>
                      ) : (
                        filteredColumns.map((col: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-center px-4 py-2.5 hover:bg-[#1e1f22]/50 transition-all">
                            <span className="text-xs font-mono font-bold text-gray-300 select-text">{col.name}</span>
                            <span className={`text-[8.5px] font-extrabold uppercase px-2 py-0.5 rounded font-mono ${
                              col.type === 'numeric' ? 'bg-blue-500/10 text-blue-400 border border-blue-900/30' :
                              col.type === 'datetime' ? 'bg-purple-500/10 text-purple-400 border border-purple-900/30' :
                              'bg-amber-500/10 text-amber-400 border border-amber-900/30'
                            }`}>
                              {col.type || 'categorical'}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {activeSubTab === 'sample' && (
                  <div className="space-y-3">
                    <span className="text-[8.5px] font-extrabold text-gray-500 uppercase tracking-widest block select-none">Mock Sample Data Preview (First 5 Rows)</span>
                    <div className="border border-[#2b2d31] rounded-2xl overflow-hidden bg-[#101113]/30 overflow-x-auto select-text">
                      <table className="w-full text-left border-collapse font-mono text-[10px]">
                        <thead>
                          <tr className="bg-[#1e1f22] border-b border-[#2b2d31] text-[8.5px] text-[#9aa0a6] font-sans font-bold uppercase tracking-wider select-none">
                            {columns.map((col: any, idx: number) => (
                              <th key={idx} className="px-4 py-2 text-nowrap">{col.name}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#2b2d31] text-gray-300 font-medium">
                          {mockCSVRows.map((row: any, rIdx: number) => (
                            <tr key={rIdx} className="hover:bg-[#1e1f22]/30 transition-all">
                              {columns.map((col: any, cIdx: number) => (
                                <td key={cIdx} className="px-4 py-2 text-nowrap">{row[col.name]}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* B. IMAGE ZIP PREVIEW */}
            {isImage && (
              <div className="space-y-5">
                
                {/* Ingestion Image Analytics Summary */}
                <div className="grid grid-cols-2 gap-3 font-sans select-none">
                  <div className="bg-[#101113] border border-[#2b2d31] p-3 rounded-2xl flex flex-col justify-between shadow-sm">
                    <span className="text-[8px] font-extrabold tracking-widest text-gray-500 uppercase">Channels</span>
                    <span className="text-base font-black text-white mt-1">
                      {meta.channels?.join(' / ') || 'RGB'}
                    </span>
                  </div>
                  <div className="bg-[#101113] border border-[#2b2d31] p-3 rounded-2xl flex flex-col justify-between shadow-sm">
                    <span className="text-[8px] font-extrabold tracking-widest text-gray-500 uppercase">Formats</span>
                    <span className="text-base font-black text-[#8ab4f8] mt-1">
                      {meta.formats?.join(' / ') || 'PNG / JPEG'}
                    </span>
                  </div>
                  <div className="col-span-2 bg-[#101113] border border-[#2b2d31] p-3 rounded-2xl flex flex-col gap-1 shadow-sm">
                    <span className="text-[8px] font-extrabold tracking-widest text-gray-500 uppercase">Image Resolutions</span>
                    <span className="text-xs font-bold text-white mt-1">
                      Range: {meta.min_resolution ? `${meta.min_resolution[0]}x${meta.min_resolution[1]}` : '32x32'} to {meta.max_resolution ? `${meta.max_resolution[0]}x${meta.max_resolution[1]}` : '256x256'}
                    </span>
                  </div>
                </div>

                {/* Photo Gallery Grid Preview */}
                <div className="space-y-2.5">
                  <span className="text-[8.5px] font-extrabold text-gray-500 uppercase tracking-widest block select-none">Sampled Ingestion Gallery</span>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {mockImageGallery.map((img, idx) => (
                      <div 
                        key={idx}
                        className="border border-[#2b2d31] bg-[#101113] rounded-2xl p-2 flex flex-col justify-between h-28 relative group hover:border-[#8ab4f8]/30 transition-all select-none overflow-hidden"
                      >
                        {/* Styled SVG Geometric shapes to mock a visual image preview */}
                        <div className="flex-1 w-full rounded-xl overflow-hidden bg-[#1e1f22] flex items-center justify-center relative mb-2">
                          <svg className="w-full h-full opacity-60" viewBox="0 0 100 60">
                            {/* Abstract ML visual geometries */}
                            <rect x="10" y="10" width="80" height="40" rx="4" fill="none" stroke="#3f4046" strokeWidth="1" />
                            <circle cx={25 + (idx * 10)} cy="30" r="12" fill="none" stroke="#8ab4f8" strokeWidth="1" />
                            <polyline fill="none" stroke="#ffe082" strokeWidth="0.75" points="15,40 35,20 55,35 75,15" />
                          </svg>
                          {/* Label Badge */}
                          <span className={`absolute bottom-1 right-1 text-[7.5px] font-black uppercase px-1 py-0.5 rounded tracking-wide border ${img.color}`}>
                            {img.class}
                          </span>
                        </div>
                        <span className="text-[8px] font-mono text-gray-400 font-bold tracking-wide truncate max-w-full" title={img.label}>
                          {img.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}

            {/* C. TENSOR PREVIEW */}
            {isTensor && (
              <div className="space-y-4">
                
                {/* Analytical breakdown */}
                <div className="grid grid-cols-3 gap-3 font-sans select-none">
                  <div className="bg-[#101113] border border-[#2b2d31] p-3 rounded-2xl flex flex-col justify-between shadow-sm">
                    <span className="text-[8px] font-extrabold tracking-widest text-gray-500 uppercase">Array Rank</span>
                    <span className="text-base font-black text-white mt-1">
                      {meta.rank || '4'}D
                    </span>
                  </div>
                  <div className="bg-[#101113] border border-[#2b2d31] p-3 rounded-2xl flex flex-col justify-between shadow-sm">
                    <span className="text-[8px] font-extrabold tracking-widest text-gray-500 uppercase">Datatype</span>
                    <span className="text-base font-black text-[#81c784] mt-1">
                      {meta.dtype || 'float32'}
                    </span>
                  </div>
                  <div className="bg-[#101113] border border-[#2b2d31] p-3 rounded-2xl flex flex-col justify-between shadow-sm">
                    <span className="text-[8px] font-extrabold tracking-widest text-gray-500 uppercase">Size Bytes</span>
                    <span className="text-base font-black text-[#8ab4f8] mt-1">
                      4B
                    </span>
                  </div>
                </div>

                {/* Shape Dimension Pill blocks */}
                <div className="space-y-2.5">
                  <span className="text-[8.5px] font-extrabold text-gray-500 uppercase tracking-widest block select-none">Tensor Shape Dimensions</span>
                  
                  <div className="bg-[#101113]/50 border border-[#2b2d31] p-4 rounded-2xl flex flex-col gap-3 font-mono">
                    <div className="flex justify-between items-center text-[11px] border-b border-[#2b2d31] pb-2 font-black select-none text-[#8ab4f8]">
                      <span>Shape Matrix Structure</span>
                      <span>[{ (meta.shape || [50000, 3, 32, 32]).join(', ') }]</span>
                    </div>

                    <div className="space-y-2 text-[10.5px] text-gray-300 font-bold select-none">
                      { (meta.shape || [50000, 3, 32, 32]).map((dim: number, dIdx: number) => {
                        const labels = ['Batch Capacity (N)', 'Channels (C)', 'Height (H)', 'Width (W)'];
                        const activeLabel = labels[dIdx] || `Dimension ${dIdx}`;

                        return (
                          <div key={dIdx} className="flex justify-between items-center py-1">
                            <span className="text-gray-400 font-sans">{activeLabel}:</span>
                            <span className="text-white font-black">{dim.toLocaleString()}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

              </div>
            )}

          </div>
        )}

      </div>

      {/* Drawer Footer */}
      <div className="px-6 py-4 bg-[#1e1f22] border-t border-[#3f4046] flex items-center justify-between shrink-0 font-sans select-none">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-500">
          <Calendar size={12} />
          <span>Ingested: {new Date(dataset.createdAt).toLocaleDateString()}</span>
        </div>
        <div className="flex items-center gap-1 bg-[#2b2d31]/50 border border-[#3f4046] px-2.5 py-0.5 rounded-full text-[9px] font-bold text-gray-400">
          <Hash size={11} />
          <span>ID: {dataset.id.slice(0, 8)}</span>
        </div>
      </div>

    </div>
  );
}
