'use client';

import React from 'react';
import { ShieldAlert, Loader2, AlertCircle } from 'lucide-react';

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

interface DatasetStatusCardProps {
  dataset: DatasetItem | null;
}

export default function DatasetStatusCard({ dataset }: DatasetStatusCardProps) {
  if (!dataset) return null;

  switch (dataset.status) {
    case 'FAILED':
      return (
        <div className="border border-rose-500/20 bg-rose-500/5 p-5 rounded-2xl space-y-4 font-sans">
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
      );

    case 'PROCESSING':
      return (
        <div className="bg-[#1e1f22]/50 border border-[#2b2d31] p-8 rounded-2xl flex flex-col items-center justify-center text-center space-y-4 font-sans">
          <Loader2 className="text-[#8ab4f8] animate-spin" size={28} />
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-white uppercase tracking-wide">Analysing Ingestion Schema</h4>
            <p className="text-[10.5px] text-gray-500 font-semibold max-w-xs leading-relaxed">
              Celery worker is currently mapping datatypes, sampling resolutions, and computing parameter tensors.
            </p>
          </div>
        </div>
      );

    case 'PENDING_UPLOAD':
      return (
        <div className="bg-[#1e1f22]/50 border border-[#2b2d31] p-8 rounded-2xl flex flex-col items-center justify-center text-center space-y-3 font-sans">
          <AlertCircle className="text-[#ffe082]" size={28} />
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-white uppercase tracking-wide">Pending File Upload</h4>
            <p className="text-[10.5px] text-gray-500 font-semibold max-w-xs leading-relaxed">
              This database record is in standby. Complete file ingestion transfers to trigger automated parsing.
            </p>
          </div>
        </div>
      );

    default:
      return null;
  }
}
