'use client';

import React, { useState, useRef } from 'react';
import { Upload, FileText, FileArchive, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { toast } from '@/store/notificationStore';

interface DatasetUploaderProps {
  onUpload: (file: File) => void;
  isUploading: boolean;
  uploadPercent: number;
  uploadSpeed: string;
  uploadFileName: string;
}

export default function DatasetUploader({
  onUpload,
  isUploading,
  uploadPercent,
  uploadSpeed,
  uploadFileName,
}: DatasetUploaderProps) {
  const [isDraggingCsv, setIsDraggingCsv] = useState(false);
  const [isDraggingZip, setIsDraggingZip] = useState(false);

  const csvInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);

  const handleDragOverCsv = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingCsv(true);
  };

  const handleDragLeaveCsv = () => {
    setIsDraggingCsv(false);
  };

  const handleDragOverZip = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingZip(true);
  };

  const handleDragLeaveZip = () => {
    setIsDraggingZip(false);
  };

  const validateAndUpload = (file: File, expectedType: 'csv' | 'zip') => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (expectedType === 'csv' && ext !== 'csv') {
      toast.error('Format Error', 'Expected a .csv tabular dataset file.');
      return;
    }
    if (expectedType === 'zip' && ext !== 'zip') {
      toast.error('Format Error', 'Expected a .zip image archive file.');
      return;
    }
    onUpload(file);
  };

  const handleDropCsv = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingCsv(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      validateAndUpload(file, 'csv');
    }
  };

  const handleDropZip = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingZip(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      validateAndUpload(file, 'zip');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, expectedType: 'csv' | 'zip') => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndUpload(file, expectedType);
    }
  };

  return (
    <div className="bg-[#1e1f22]/40 border border-[#3f4046] rounded-2xl p-6 transition-all relative overflow-hidden select-none">
      <div className="absolute inset-0 dot-grid opacity-10 pointer-events-none"></div>

      {isUploading ? (
        /* Upload Progress State Overlay */
        <div className="relative z-10 py-10 flex flex-col items-center justify-center text-center space-y-5 w-full max-w-sm mx-auto font-sans">
          <div className="w-14 h-14 rounded-2xl bg-[#8ab4f8]/10 border border-[#8ab4f8]/25 text-[#8ab4f8] flex items-center justify-center shadow-inner">
            <Loader2 size={24} className="animate-spin text-[#8ab4f8]" />
          </div>
          <div className="space-y-2.5 w-full">
            <div className="flex justify-between items-center text-xs font-bold text-white px-1">
              <span className="truncate max-w-[220px]">{uploadFileName}</span>
              <span className="font-mono">{uploadPercent}%</span>
            </div>
            
            {/* Progress Track */}
            <div className="w-full h-2.5 bg-[#2b2d31] rounded-full overflow-hidden border border-[#3f4046]/45">
              <div 
                className="h-full bg-gradient-to-r from-[#8ab4f8] via-[#c5a3ff] to-[#81c784] rounded-full transition-all duration-150"
                style={{ width: `${uploadPercent}%` }}
              ></div>
            </div>

            <div className="flex justify-between text-[9px] font-extrabold text-gray-500 uppercase tracking-widest font-mono px-1">
              <span>Speed: {uploadSpeed}</span>
              <span>Parsing Schema...</span>
            </div>
          </div>
        </div>
      ) : (
        /* Standard Dual drop-zone Layout */
        <div className="relative z-10 flex flex-col md:flex-row gap-5">
          {/* CSV Drop Zone */}
          <div
            onDragOver={handleDragOverCsv}
            onDragLeave={handleDragLeaveCsv}
            onDrop={handleDropCsv}
            onClick={() => csvInputRef.current?.click()}
            className={`flex-1 border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center min-h-[160px] cursor-pointer transition-all duration-200 ${
              isDraggingCsv
                ? 'border-[#8ab4f8] bg-[#8ab4f8]/5 scale-[1.01]'
                : 'border-[#3f4046] hover:border-[#8ab4f8]/50 hover:bg-[#141517]/40'
            }`}
          >
            <input
              type="file"
              ref={csvInputRef}
              onChange={(e) => handleFileChange(e, 'csv')}
              accept=".csv"
              className="hidden"
            />
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3.5 transition-all ${
              isDraggingCsv ? 'bg-[#8ab4f8]/20 text-[#8ab4f8]' : 'bg-[#2b2d31] text-[#9aa0a6]'
            }`}>
              <FileText size={20} />
            </div>
            <h4 className="text-sm font-extrabold text-white mb-1">+ Drop CSV Here</h4>
            <p className="text-[11px] text-[#9aa0a6] font-semibold max-w-[200px] leading-relaxed">
              Accepts tabular files for linear/dense regressions.
            </p>
          </div>

          {/* ZIP Drop Zone */}
          <div
            onDragOver={handleDragOverZip}
            onDragLeave={handleDragLeaveZip}
            onDrop={handleDropZip}
            onClick={() => zipInputRef.current?.click()}
            className={`flex-1 border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center min-h-[160px] cursor-pointer transition-all duration-200 ${
              isDraggingZip
                ? 'border-[#c5a3ff] bg-[#c5a3ff]/5 scale-[1.01]'
                : 'border-[#3f4046] hover:border-[#c5a3ff]/50 hover:bg-[#141517]/40'
            }`}
          >
            <input
              type="file"
              ref={zipInputRef}
              onChange={(e) => handleFileChange(e, 'zip')}
              accept=".zip"
              className="hidden"
            />
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3.5 transition-all ${
              isDraggingZip ? 'bg-[#c5a3ff]/20 text-[#c5a3ff]' : 'bg-[#2b2d31] text-[#9aa0a6]'
            }`}>
              <FileArchive size={20} />
            </div>
            <h4 className="text-sm font-extrabold text-white mb-1">+ Drop ZIP Here</h4>
            <p className="text-[11px] text-[#9aa0a6] font-semibold max-w-[200px] leading-relaxed">
              Accepts image sets for CNN computer vision.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
