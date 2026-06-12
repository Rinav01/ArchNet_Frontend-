'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { X, FileSpreadsheet, Image as ImageIcon, Binary, Calendar, Hash } from 'lucide-react';
import DatasetStatusCard from '@/components/Datasets/DatasetStatusCard';
import DatasetPreview from '@/components/Datasets/DatasetPreview';

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
  const router = useRouter();
  if (!isOpen || !dataset) return null;

  const datasetTypeFormatted = (dataset.datasetType || 'RAW').toUpperCase();
  const isCSV = datasetTypeFormatted.includes('CSV');
  const isImage = datasetTypeFormatted.includes('ZIP') || datasetTypeFormatted.includes('IMAGE');
  const isTensor = datasetTypeFormatted.includes('TENSOR') || datasetTypeFormatted.includes('NUMPY') || datasetTypeFormatted.includes('NPY') || datasetTypeFormatted.includes('NPZ');

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
          className="p-1.5 hover:bg-[#2b2d31] rounded-lg text-[#9aa0a6] hover:text-white transition-all cursor-pointer border-none bg-transparent"
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

        <DatasetStatusCard dataset={dataset} />

        <DatasetPreview dataset={dataset} />

        {dataset.status === 'READY' && (
          <button
            onClick={() => {
              onClose();
              router.push(`/datasets/${dataset.id}/analysis`);
            }}
            className="w-full flex items-center justify-center gap-1.5 py-3 bg-[#8ab4f8] hover:bg-[#a8c7fa] text-[#1e1f22] text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md mt-4"
          >
            <span>Run Dataset Intelligence</span>
          </button>
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
