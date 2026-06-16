'use client';

import React, { useState, useEffect, useCallback } from 'react';
import MainLayout from '@/components/Layout/MainLayout';
import DatasetPreviewDrawer from '@/components/Panels/DatasetPreviewDrawer';
import DatasetUploader from '@/components/Datasets/DatasetUploader';
import DatasetList from '@/components/Datasets/DatasetList';
import { useProjectStore } from '@/store/projectStore';
import { toast } from '@/store/notificationStore';
import { 
  graphqlRequest, 
  GET_DATASETS, 
  CREATE_DATASET, 
  TRIGGER_DATASET_PROCESSING,
  DELETE_DATASET
} from '@/lib/graphql/client';
import { 
  Database, 
  AlertTriangle, 
  X, 
  CloudLightning,
  Sparkles
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
      createdAt: '2026-06-01T10:14:00Z',
      updatedAt: '2026-06-01T10:15:30Z'
    },
    {
      id: 'ds_boston',
      name: 'boston_housing_features.csv',
      datasetType: 'CSV',
      status: 'READY',
      numRecords: 506,
      description: 'Boston housing economic tabular dataset containing structural pricing information across categorical and numerical columns.',
      schemaMetadata: {
        columns: [
          { name: 'Age', type: 'numeric' },
          { name: 'Salary', type: 'numeric' },
          { name: 'Target', type: 'categorical' }
        ],
        format: 'CSV'
      },
      createdAt: '2026-06-02T14:22:00Z',
      updatedAt: '2026-06-02T14:23:10Z'
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
      createdAt: '2026-06-03T08:05:00Z',
      updatedAt: '2026-06-03T08:05:15Z'
    },
    {
      id: 'ds_corrupted',
      name: 'mnist_corrupted_validation.zip',
      datasetType: 'IMAGE_ZIP',
      status: 'FAILED',
      numRecords: 0,
      description: 'A zip archive representing parsed MNIST validation files that failed model compilation due to corrupted headers.',
      schemaMetadata: null,
      createdAt: '2026-06-04T11:45:00Z',
      updatedAt: '2026-06-04T11:46:12Z'
    },
    {
      id: 'ds_streaming',
      name: 'active_downstream_telemetry.csv',
      datasetType: 'CSV',
      status: 'PROCESSING',
      numRecords: 0,
      description: 'Incoming live sensor data stream compiling active architecture weights.',
      schemaMetadata: null,
      createdAt: '2026-06-05T13:10:00Z',
      updatedAt: '2026-06-05T13:10:00Z'
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

  // Perform Local Format Validation
  const validateFileFormat = (fileName: string): boolean => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const allowed = ['zip', 'csv', 'npy', 'npz'];
    if (!ext || !allowed.includes(ext)) {
      setValidationError(
        `Validation Error: Unsupported file format "${ext ? '.' + ext : 'unknown'}". Only .csv tabular data, .zip image archives, and .npy/.npz tensor models are allowed.`
      );
      toast.error('Upload Restricted', 'Unsupported format. Only .csv, .zip, .npy, and .npz allowed.');
      setTimeout(() => setValidationError(null), 6000);
      return false;
    }
    setValidationError(null);
    return true;
  };

  // Process File Upload Ingestion
  const processIngest = async (file: File) => {
    if (!validateFileFormat(file.name)) {
      return;
    }

    setUploadFileName(file.name);
    setIsUploading(true);
    setUploadPercent(0);
    toast.info('Upload Started', 'Uploading dataset archive to storage...');

    // Simulates active upload progress bars
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
          { name: 'Age', type: 'numeric' },
          { name: 'Salary', type: 'numeric' },
          { name: 'Target', type: 'categorical' }
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

  const handleCardClick = (dataset: DatasetItem) => {
    setSelectedDataset(dataset);
    setIsDrawerOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (isOnline) {
      try {
        const deleteRes = await graphqlRequest(DELETE_DATASET, { id });
        if (deleteRes && deleteRes.deleteDataset) {
          toast.success('Dataset Deleted', 'The dataset has been deleted from the server.');
        } else {
          toast.error('Deletion Failed', 'Backend returned failure for deleting this dataset.');
        }
      } catch (err: any) {
        console.warn('Backend dataset deletion failed:', err);
        toast.error('Deletion Error', err.message || 'Failed to delete dataset from backend.');
      }
    } else {
      toast.info('Local Delete', 'Dataset removed from sandbox view.');
    }

    setDatasets((prev) => prev.filter((ds) => ds.id !== id));
    if (selectedDataset?.id === id) {
      setSelectedDataset(null);
      setIsDrawerOpen(false);
    }
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
        <DatasetUploader
          onUpload={processIngest}
          isUploading={isUploading}
          uploadPercent={uploadPercent}
          uploadSpeed={uploadSpeed}
          uploadFileName={uploadFileName}
        />

        {/* 2. Workspace Datasets Grid */}
        <DatasetList
          datasets={datasets}
          selectedDatasetId={selectedDataset?.id}
          onSelect={handleCardClick}
          onDelete={handleDelete}
          onSync={loadDatasets}
          isLoading={isLoading}
        />

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
