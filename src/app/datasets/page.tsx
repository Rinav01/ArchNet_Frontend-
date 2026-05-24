'use client';

import React, { useState } from 'react';
import MainLayout from '@/components/Layout/MainLayout';
import { Database, Upload, FileText, CheckCircle2, ShieldAlert } from 'lucide-react';

interface MockDataset {
  name: string;
  size: string;
  format: string;
  uploadedAt: string;
  status: 'active' | 'processing';
}

export default function DatasetsPage() {
  const [datasets, setDatasets] = useState<MockDataset[]>([
    { name: 'cifar10_train.bin', size: '162.4 MB', format: 'Binary', uploadedAt: '1h ago', status: 'active' },
    { name: 'mnist_digits_test.idx', size: '11.8 MB', format: 'IDX', uploadedAt: '1d ago', status: 'active' },
    { name: 'wikitext2_raw.txt', size: '4.8 MB', format: 'Text', uploadedAt: '3d ago', status: 'active' },
  ]);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadStatus(`Uploading ${file.name}...`);

    setTimeout(() => {
      setDatasets(prev => [
        {
          name: file.name,
          size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
          format: file.name.split('.').pop()?.toUpperCase() || 'RAW',
          uploadedAt: 'Just now',
          status: 'active',
        },
        ...prev,
      ]);
      setIsUploading(false);
      setUploadStatus(null);
    }, 1500);
  };

  return (
    <MainLayout>
      <div className="p-8 max-w-5xl mx-auto space-y-8 relative pb-16">
        
        {/* Title */}
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <Database className="text-purple-500" size={32} />
            <span>Dataset Repository</span>
          </h1>
          <p className="text-gray-400 mt-2 text-sm font-medium">
            Upload, inspect, and link structured training data directly into your tensor layers.
          </p>
        </div>

        {/* Upload Box Zone */}
        <div className="glass-panel border-white/5 border rounded-2xl p-8 relative overflow-hidden flex flex-col items-center justify-center min-h-[220px]">
          <div className="absolute inset-0 dot-grid opacity-15 pointer-events-none"></div>
          
          <div className="relative z-10 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-600/10 border border-purple-500/25 text-purple-400 flex items-center justify-center mx-auto shadow-inner">
              <Upload size={22} className={isUploading ? 'animate-bounce' : ''} />
            </div>
            
            <div className="space-y-1">
              <p className="text-sm font-bold text-white">
                {uploadStatus || 'Drag & drop training files here'}
              </p>
              <p className="text-xs text-gray-500 font-medium">
                Supports ZIP, TAR, CSV, TFRecord, and raw IDX formats up to 4GB.
              </p>
            </div>

            <label className="inline-flex items-center justify-center px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-extrabold cursor-pointer border border-purple-500/25 transition-all shadow-lg shadow-purple-600/10">
              <span>Choose Local File</span>
              <input 
                type="file" 
                onChange={handleFileUpload} 
                className="hidden" 
                disabled={isUploading}
              />
            </label>
          </div>
        </div>

        {/* Dataset Table list */}
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <h3 className="text-lg font-bold text-white border-b border-white/5 pb-3">
            Active Workspace Datasets
          </h3>

          <div className="space-y-3">
            {datasets.map((dataset, idx) => (
              <div 
                key={idx} 
                className="flex items-center justify-between p-4 bg-[#11121d] border border-white/5 rounded-2xl hover:border-purple-500/15 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-purple-600/10 border border-purple-500/15 rounded-xl text-purple-400">
                    <FileText size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">{dataset.name}</h4>
                    <span className="text-[10px] text-gray-500 font-mono tracking-wider uppercase mt-0.5 block">
                      {dataset.format} | {dataset.size}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <span className="text-xs text-gray-500 font-medium">Uploaded {dataset.uploadedAt}</span>
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-emerald-500/15 bg-emerald-500/5 text-emerald-400 text-[10px] uppercase font-bold tracking-wider">
                    <CheckCircle2 size={12} />
                    Ready
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </MainLayout>
  );
}
