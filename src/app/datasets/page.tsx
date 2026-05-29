'use client';

import React, { useState, useEffect, useCallback } from 'react';
import MainLayout from '@/components/Layout/MainLayout';
import DatasetPreviewDrawer from '@/components/Panels/DatasetPreviewDrawer';
import { useProjectStore } from '@/store/projectStore';
import { toast } from '@/store/notificationStore';
import { 
  graphqlRequest, 
  GET_DATASETS, 
  CREATE_DATASET, 
  TRIGGER_DATASET_PROCESSING 
} from '@/lib/graphql/client';
import { 
  Database, 
  Upload, 
  FileText, 
  CheckCircle2, 
  Loader2, 
  AlertTriangle, 
  X, 
  CloudLightning,
  ChevronRight,
  Sparkles,
  FileCode,
  Image as ImageIcon,
  HelpCircle
} from 'lucide-react';

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

export default function DatasetsPage() {
  const isOnline = useProjectStore((state) => state.isOnline);
  
  // Datasets State
  const [datasets, setDatasets] = useState<DatasetItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Upload Progress State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState('0.0 MB/s');
  const [uploadFileName, setUploadFileName] = useState('');
  
  // Drag and Drop Zone Hover State
  const [isDragging, setIsDragging] = useState(false);

  // Preview Drawer State
  const [selectedDataset, setSelectedDataset] = useState<DatasetItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Default rich mock datasets fallback when FastAPI is disconnected
  const mockDatasets: DatasetItem[] = [
    {
      id: 'ds_cifar10',
      name: 'cifar10_train_images.zip',
      datasetType: 'IMAGE_ZIP',
      status: 'READY',
      numRecords: 50000,
      description: 'Standard CIFAR-10 image classification dataset containing 50,000 training images of size 32x32 mapped into 10 target categories.',
      schemaMetadata: {
        image_count: 50000,
        min_resolution: [32, 32],
        max_resolution: [32, 32],
        formats: ['PNG'],
        channels: ['RGB']
      },
      createdAt: '2026-05-27T10:14:00Z',
      updatedAt: '2026-05-27T10:15:30Z'
    },
    {
      id: 'ds_boston',
      name: 'boston_housing_features.csv',
      datasetType: 'CSV',
      status: 'READY',
      numRecords: 506,
      description: 'Boston housing economic tabular dataset containing structural pricing information across 14 categorical and numerical columns.',
      schemaMetadata: {
        columns: [
          { name: 'CRIM', type: 'numeric' },
          { name: 'ZN', type: 'numeric' },
          { name: 'INDUS', type: 'numeric' },
          { name: 'CHAS', type: 'categorical' },
          { name: 'NOX', type: 'numeric' },
          { name: 'RM', type: 'numeric' },
          { name: 'AGE', type: 'numeric' },
          { name: 'TAX', type: 'numeric' },
          { name: 'MEDV', type: 'numeric' }
        ],
        format: 'CSV'
      },
      createdAt: '2026-05-28T14:22:00Z',
      updatedAt: '2026-05-28T14:23:10Z'
    },
    {
      id: 'ds_imagenet',
      name: 'imagenet_layer_embeddings.npy',
      datasetType: 'TENSOR',
      status: 'READY',
      numRecords: 10000,
      description: 'Pre-computed ResNet-50 embedding tensors extracted for classification validation, containing 10,000 512-dimensional arrays.',
      schemaMetadata: {
        shape: [10000, 512],
        dtype: 'float32',
        rank: 2
      },
      createdAt: '2026-05-29T08:05:00Z',
      updatedAt: '2026-05-29T08:05:15Z'
    },
    {
      id: 'ds_corrupted',
      name: 'mnist_corrupted_validation.zip',
      datasetType: 'IMAGE_ZIP',
      status: 'FAILED',
      numRecords: 0,
      description: 'A zip archive representing parsed MNIST validation files that failed model compilation due to corrupted headers.',
      schemaMetadata: null,
      createdAt: '2026-05-29T11:45:00Z',
      updatedAt: '2026-05-29T11:46:12Z'
    },
    {
      id: 'ds_streaming',
      name: 'active_downstream_telemetry.csv',
      datasetType: 'CSV',
      status: 'PROCESSING',
      numRecords: 0,
      description: 'Incoming live sensor data stream compiling active architecture weights.',
      schemaMetadata: null,
      createdAt: '2026-05-29T13:10:00Z',
      updatedAt: '2026-05-29T13:10:00Z'
    }
  ];

  // Load datasets query
  const loadDatasets = useCallback(async () => {
    setIsLoading(true);
    if (isOnline) {
      try {
        const data = await graphqlRequest(GET_DATASETS);
        if (data && data.datasets) {
          // Parse schemaMetadata if returned as JSON string
          const parsed = data.datasets.map((ds: any) => ({
            ...ds,
            schemaMetadata: typeof ds.schemaMetadata === 'string' 
              ? JSON.parse(ds.schemaMetadata) 
              : ds.schemaMetadata
          }));
          setDatasets(parsed);
          setIsLoading(false);
          return;
        }
      } catch (err) {
        console.warn('FastAPI GraphQL list failed, using mock fallbacks.', err);
      }
    }
    
    // Fallback Mock
    setDatasets(mockDatasets);
    setIsLoading(false);
  }, [isOnline]);

  useEffect(() => {
    loadDatasets();
  }, [loadDatasets]);

  // Handle Drag Over events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  // Perform Local Format Validation (Agreement: yes)
  const validateFileFormat = (fileName: string): boolean => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const allowed = ['zip', 'csv', 'npy', 'npz'];
    if (!ext || !allowed.includes(ext)) {
      setValidationError(
        `Validation Error: Unsupported file format "${ext ? '.' + ext : 'unknown'}". Only .csv tabular data, .zip image archives, and .npy/.npz tensor models are allowed.`
      );
      toast.error('Upload Restricted', 'Unsupported format. Only .csv, .zip, .npy, and .npz allowed.');
      // Auto clear warning after 5s
      setTimeout(() => setValidationError(null), 6000);
      return false;
    }
    setValidationError(null);
    return true;
  };

  // Process File Upload Ingestion
  const processIngest = async (file: File) => {
    if (!validateFileFormat(file.name)) {
      setIsDragging(false);
      return;
    }

    setUploadFileName(file.name);
    setIsUploading(true);
    setUploadPercent(0);
    setIsDragging(false);
    toast.info('Upload Started', 'Uploading dataset archive to storage...');

    // 1. Simulates active upload progress bars
    const interval = setInterval(() => {
      setUploadPercent((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        const step = Math.round(Math.random() * 15 + 8);
        const speed = (Math.random() * 8 + 6).toFixed(1);
        setUploadSpeed(`${speed} MB/s`);
        return Math.min(100, prev + step);
      });
    }, 150);

    // Wait for upload animation to complete
    await new Promise((resolve) => setTimeout(resolve, 1800));

    // Determine type based on extension
    const ext = file.name.split('.').pop()?.toLowerCase() || 'raw';
    let dtype = 'CSV';
    let defaultMeta: any = null;
    let records = 100;

    if (ext === 'zip') {
      dtype = 'IMAGE_ZIP';
      records = 1200;
      defaultMeta = {
        image_count: 1200,
        min_resolution: [128, 128],
        max_resolution: [256, 256],
        formats: ['PNG', 'JPEG'],
        channels: ['RGB']
      };
    } else if (ext === 'npy' || ext === 'npz') {
      dtype = 'TENSOR';
      records = 50000;
      defaultMeta = {
        shape: [50000, 3, 32, 32],
        dtype: 'float32',
        rank: 4
      };
    } else {
      defaultMeta = {
        columns: [
          { name: 'ID', type: 'numeric' },
          { name: 'X_Coord', type: 'numeric' },
          { name: 'Y_Coord', type: 'numeric' },
          { name: 'Label_Class', type: 'categorical' },
          { name: 'Timestamp', type: 'datetime' }
        ],
        format: 'CSV'
      };
    }

    const newId = `ds_${Math.random().toString(36).substring(2, 10)}`;
    const newDatasetItem: DatasetItem = {
      id: newId,
      name: file.name,
      datasetType: dtype,
      status: 'PROCESSING',
      numRecords: 0,
      description: `Uploaded file archive containing raw training elements processed inside MLBuilder on ${new Date().toLocaleDateString()}.`,
      schemaMetadata: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Prepend in PROCESSING state
    setDatasets(prev => [newDatasetItem, ...prev]);
    setIsUploading(false);

    if (isOnline) {
      try {
        const createRes = await graphqlRequest(CREATE_DATASET, {
          name: file.name,
          datasetType: dtype,
          filename: file.name,
          description: `Uploaded dataset file: ${file.name}`
        });

        if (createRes && createRes.createDataset) {
          const apiDataset = createRes.createDataset.dataset;
          const uploadUrl = createRes.createDataset.uploadUrl;

          // Perform actual simulated upload to pre-signed S3 link or FastAPI storage
          await fetch(uploadUrl, {
            method: 'PUT',
            body: file,
            headers: { 'Content-Type': file.type }
          });

          // Trigger Celery Parsing Task on backend
          await graphqlRequest(TRIGGER_DATASET_PROCESSING, { datasetId: apiDataset.id });

          toast.success('Upload Completed', 'File uploaded successfully! Starting background Celery parsing.');

          // Start polling list updates
          setTimeout(() => loadDatasets(), 2500);
          return;
        }
      } catch (err) {
        console.warn('Failed cloud dataset ingest, falling back to local simulation.', err);
        toast.warning('Ingestion Warning', 'FastAPI database sync failed. Using local sandbox fallback...');
      }
    }

    // Local Sandbox Simulation
    setTimeout(() => {
      setDatasets(prev => 
        prev.map(item => 
          item.id === newId 
            ? { ...item, status: 'READY', numRecords: records, schemaMetadata: defaultMeta }
            : item
        )
      );
      toast.success('Dataset Ready', 'Local dataset mock metadata successfully generated.');
    }, 2800);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processIngest(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processIngest(file);
    }
  };

  const handleCardClick = (dataset: DatasetItem) => {
    setSelectedDataset(dataset);
    setIsDrawerOpen(true);
  };

  return (
    <MainLayout>
      <div className="p-8 max-w-5xl mx-auto space-y-8 relative pb-24 select-none">
        
        {/* Connection Failure Boundary Banner */}
        {!isOnline && (
          <div className="bg-[#ffe082]/10 border border-[#ffe082]/25 px-5 py-3 rounded-2xl flex items-center justify-between text-[#ffe082] text-xs font-semibold shadow-sm animate-pulse select-none">
            <div className="flex items-center gap-2.5">
              <CloudLightning size={16} />
              <span>Offline Workspace Fallback: Visual Dataset Ingestion processes are simulated locally.</span>
            </div>
            <button 
              onClick={loadDatasets}
              className="px-3 py-1 bg-[#ffe082]/10 hover:bg-[#ffe082]/20 rounded-lg transition-all border border-[#ffe082]/20 font-bold"
            >
              Recheck Server
            </button>
          </div>
        )}

        {/* Title & Stats */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-white flex items-center gap-3">
              <Database className="text-[#8ab4f8]" size={30} />
              <span>Dataset Repository</span>
            </h1>
            <p className="text-[#9aa0a6] mt-2 text-sm font-semibold max-w-xl">
              Link, visualize, and inspect structured CSV columns, image ZIP archives, and NumPy tensors directly in your visual models.
            </p>
          </div>
          
          <div className="flex items-center gap-3 bg-[#1e1f22]/50 border border-[#2b2d31] px-5 py-3 rounded-2xl shadow-sm">
            <Sparkles size={16} className="text-[#8ab4f8]" />
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-[#9aa0a6]">
              <span>Active Index Sizing</span>
              <span className="block text-sm font-black text-white mt-0.5 tracking-normal lowercase">
                {datasets.length} files parsed
              </span>
            </div>
          </div>
        </div>

        {/* Local validation error notification card */}
        {validationError && (
          <div className="bg-rose-500/10 border border-rose-500/25 px-5 py-3 rounded-2xl flex items-center justify-between text-rose-300 text-xs font-semibold shadow-lg animate-bounce relative">
            <div className="flex items-center gap-2.5">
              <AlertTriangle size={16} className="text-rose-400" />
              <span>{validationError}</span>
            </div>
            <button 
              onClick={() => setValidationError(null)}
              className="p-1 hover:bg-rose-500/20 rounded-lg text-rose-400 hover:text-white transition-all cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* 1. Drag & Drop File Picker upload zone */}
        <div 
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`bg-[#1e1f22]/40 border rounded-2xl p-8 transition-all relative overflow-hidden flex flex-col items-center justify-center min-h-[220px] select-none ${
            isDragging 
              ? 'border-[#8ab4f8] bg-[#8ab4f8]/5 shadow-inner' 
              : 'border-[#3f4046] hover:border-white/10'
          }`}
        >
          <div className="absolute inset-0 dot-grid opacity-10 pointer-events-none"></div>
          
          {isUploading ? (
            /* Upload progress monitor */
            <div className="relative z-10 text-center space-y-5 w-full max-w-xs font-sans">
              <div className="w-12 h-12 rounded-2xl bg-[#8ab4f8]/10 border border-[#8ab4f8]/25 text-[#8ab4f8] flex items-center justify-center mx-auto shadow-inner">
                <Loader2 size={20} className="animate-spin" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-white">
                  <span className="truncate max-w-[180px]">{uploadFileName}</span>
                  <span>{uploadPercent}%</span>
                </div>
                {/* Progress bar track */}
                <div className="w-full h-2 bg-[#2b2d31] rounded-full overflow-hidden border border-[#3f4046]/45">
                  <div 
                    className="h-full bg-gradient-to-r from-[#8ab4f8] to-[#81c784] rounded-full transition-all duration-150"
                    style={{ width: `${uploadPercent}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-[9px] font-extrabold text-gray-500 uppercase tracking-widest font-mono">
                  <span>Speed: {uploadSpeed}</span>
                  <span>Ingesting...</span>
                </div>
              </div>
            </div>
          ) : (
            /* Standard Upload Zone */
            <div className="relative z-10 text-center space-y-4 font-sans select-none">
              <div className="w-12 h-12 rounded-2xl bg-[#8ab4f8]/10 border border-[#8ab4f8]/25 text-[#8ab4f8] flex items-center justify-center mx-auto shadow-inner transition-transform group-hover:scale-105">
                <Upload size={20} />
              </div>
              
              <div className="space-y-1">
                <p className="text-sm font-extrabold text-white">
                  Drag & drop training files here
                </p>
                <p className="text-xs text-[#9aa0a6] font-semibold">
                  ZIP, CSV, NPY, and NPZ formats up to 4GB.
                </p>
              </div>

              <label className="inline-flex items-center justify-center px-5 py-2 bg-[#8ab4f8] hover:bg-[#a8c7fa] text-[#1e1f22] rounded-full text-xs font-extrabold cursor-pointer transition-all shadow-md active:scale-95">
                <span>Select file from computer</span>
                <input 
                  type="file" 
                  onChange={handleFileChange} 
                  accept=".csv,.zip,.npy,.npz"
                  className="hidden" 
                />
              </label>
            </div>
          )}
        </div>

        {/* 2. Workspace Datasets Grid */}
        <div className="bg-[#1e1f22]/30 border border-[#2b2d31] rounded-2xl p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-[#2b2d31] pb-3">
            <h3 className="text-sm font-extrabold text-white uppercase tracking-widest flex items-center gap-2">
              <Database size={14} className="text-[#8ab4f8]" />
              <span>Workspace Index</span>
            </h3>
            <button 
              onClick={loadDatasets}
              disabled={isLoading}
              className="text-[10px] font-bold text-[#8ab4f8] hover:text-[#a8c7fa] hover:underline bg-transparent border-none cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              {isLoading && <Loader2 size={10} className="animate-spin" />}
              <span>Sync Listings</span>
            </button>
          </div>

          <div className="space-y-3">
            {isLoading && datasets.length === 0 ? (
              <div className="text-center text-gray-500 py-16 text-xs font-bold animate-pulse">
                Fetching active models datasets...
              </div>
            ) : datasets.length === 0 ? (
              <div className="text-center text-gray-500 py-16 text-xs font-bold">
                Workspace dataset repository is empty. Drop files above to populate metadata.
              </div>
            ) : (
              datasets.map((dataset) => {
                const isCSV = dataset.datasetType.includes('CSV');
                const isImage = dataset.datasetType.includes('ZIP') || dataset.datasetType.includes('IMAGE');
                const isTensor = dataset.datasetType.includes('TENSOR');

                return (
                  <div 
                    key={dataset.id}
                    onClick={() => handleCardClick(dataset)}
                    className="flex items-center justify-between p-4 bg-[#141517]/80 border border-[#2b2d31] rounded-2xl hover:border-[#8ab4f8]/30 hover:bg-[#1e1f22]/40 transition-all cursor-pointer relative group shadow-sm select-none"
                  >
                    <div className="flex items-center gap-3.5 max-w-[70%]">
                      {/* Format specific icons */}
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

                    {/* Status badge & detail launcher */}
                    <div className="flex items-center gap-6">
                      
                      {/* Status Badges */}
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

                      {/* Detail indicator arrow */}
                      <ChevronRight size={14} className="text-gray-500 group-hover:text-white transition-all transform group-hover:translate-x-0.5" />
                    </div>

                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Dataset Preview Side Drawer overlay */}
        <DatasetPreviewDrawer 
          isOpen={isDrawerOpen}
          onClose={() => {
            setIsDrawerOpen(false);
            setSelectedDataset(null);
          }}
          dataset={selectedDataset}
        />

      </div>
    </MainLayout>
  );
}
