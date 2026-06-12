'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/Layout/MainLayout';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  AreaChart,
  Area,
  Cell
} from 'recharts';
import { 
  Database, 
  ArrowLeft, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle, 
  HelpCircle, 
  FileSpreadsheet, 
  Image as ImageIcon, 
  FileText,
  Info
} from 'lucide-react';

interface DatasetDetail {
  id: string;
  name: string;
  type: 'IMAGE' | 'CSV' | 'TEXT';
  numRecords: number;
  description: string;
}

export default function DatasetAnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [datasetId, setDatasetId] = useState<string>('');
  const [isMounted, setIsMounted] = useState(false);
  const [activeDataset, setActiveDataset] = useState<DatasetDetail | null>(null);

  useEffect(() => {
    setIsMounted(true);
    params.then(p => {
      setDatasetId(p.id);
      
      // Select mock metadata based on parameter ID
      if (p.id.includes('boston') || p.id.includes('csv') || p.id.includes('ds_boston')) {
        setActiveDataset({
          id: p.id,
          name: 'boston_housing_features.csv',
          type: 'CSV',
          numRecords: 506,
          description: 'Structural pricing features including tax ratios, age of occupants, and crime rates across Boston neighborhoods.'
        });
      } else if (p.id.includes('text') || p.id.includes('sentence')) {
        setActiveDataset({
          id: p.id,
          name: 'imdb_movie_reviews.txt',
          type: 'TEXT',
          numRecords: 25000,
          description: 'A benchmark natural language dataset containing 25,000 highly polar movie reviews for sentiment classifier training.'
        });
      } else {
        // Default to CIFAR10 Image ZIP
        setActiveDataset({
          id: p.id,
          name: 'cifar10_train_images.zip',
          type: 'IMAGE',
          numRecords: 50000,
          description: 'Benchmark classification corpus split into 10 target visual categories (planes, cars, birds, cats, deer, dogs, frogs, horses, ships, trucks).'
        });
      }
    });
  }, [params]);

  if (!isMounted || !activeDataset) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[400px] text-gray-500">
          <span className="text-xs font-semibold">Loading Dataset Metrics...</span>
        </div>
      </MainLayout>
    );
  }

  // --- DATASET MOCK STATISTICS ---

  // Image Datasets statistics
  const imageClassData = [
    { name: 'Airplane', count: 5000 },
    { name: 'Automobile', count: 5000 },
    { name: 'Bird', count: 4980 },
    { name: 'Cat', count: 5020 },
    { name: 'Deer', count: 5000 },
    { name: 'Dog', count: 5000 },
    { name: 'Frog', count: 5010 },
    { name: 'Horse', count: 4990 },
    { name: 'Ship', count: 5000 },
    { name: 'Truck', count: 5000 },
  ];

  const imageResolutionData = [
    { x: 32, y: 32, z: 45000 },
    { x: 28, y: 28, z: 3000 },
    { x: 64, y: 64, z: 2000 },
  ];

  const imageSamples = [
    { label: 'Airplane', url: '✈️', color: 'bg-[#8ab4f8]/10 text-[#8ab4f8] border-[#8ab4f8]/20' },
    { label: 'Automobile', url: '🚗', color: 'bg-[#80cbc4]/10 text-[#80cbc4] border-[#80cbc4]/20' },
    { label: 'Bird', url: '🐦', color: 'bg-[#ffe082]/10 text-[#ffe082] border-[#ffe082]/20' },
    { label: 'Cat', url: '🐱', color: 'bg-[#c5a3ff]/10 text-[#c5a3ff] border-[#c5a3ff]/20' },
    { label: 'Deer', url: '🦌', color: 'bg-[#f28b82]/10 text-[#f28b82] border-[#f28b82]/20' },
    { label: 'Dog', url: '🐶', color: 'bg-[#8ab4f8]/10 text-[#8ab4f8] border-[#8ab4f8]/20' },
    { label: 'Frog', url: '🐸', color: 'bg-[#80cbc4]/10 text-[#80cbc4] border-[#80cbc4]/20' },
    { label: 'Horse', url: '🐴', color: 'bg-[#ffe082]/10 text-[#ffe082] border-[#ffe082]/20' },
  ];

  // CSV Datasets statistics
  const csvMissingData = [
    { column: 'CRIM', missing: 0 },
    { column: 'ZN', missing: 12 },
    { column: 'INDUS', missing: 0 },
    { column: 'CHAS', missing: 4 },
    { column: 'NOX', missing: 0 },
    { column: 'RM', missing: 2 },
    { column: 'AGE', missing: 15 },
    { column: 'TAX', missing: 0 },
  ];

  const csvCorrelationMatrix = [
    ['CRIM', '1.00', '0.20', '0.41', '-0.39'],
    ['ZN', '0.20', '1.00', '-0.53', '0.36'],
    ['INDUS', '0.41', '-0.53', '1.00', '-0.71'],
    ['RM', '-0.39', '0.36', '-0.71', '1.00']
  ];

  const csvOutlierData = [
    { x: 4.5, y: 24.0, name: 'Normal' },
    { x: 5.2, y: 21.6, name: 'Normal' },
    { x: 6.1, y: 34.2, name: 'Normal' },
    { x: 8.8, y: 50.0, name: 'Outlier' }, // Outlier
    { x: 5.8, y: 19.8, name: 'Normal' },
    { x: 6.9, y: 44.5, name: 'Normal' },
    { x: 7.2, y: 48.0, name: 'Outlier' }, // Outlier
    { x: 4.8, y: 12.3, name: 'Normal' },
  ];

  const csvFeatureDist = [
    { name: '0-10', freq: 45 },
    { name: '10-20', freq: 142 },
    { name: '20-30', freq: 210 },
    { name: '30-40', freq: 88 },
    { name: '40-50', freq: 21 }
  ];

  // Text Datasets statistics
  const textVocabData = {
    totalWords: '2.4M',
    uniqueTokens: '84,120',
    oovCount: '1,200 (0.05%)'
  };

  const textTokenFrequency = [
    { token: 'the', count: 124500 },
    { token: 'and', count: 89000 },
    { token: 'a', count: 67200 },
    { token: 'of', count: 54100 },
    { token: 'to', count: 48900 },
    { token: 'is', count: 41200 },
    { token: 'film', count: 32000 },
    { token: 'movie', count: 28500 }
  ];

  const textSequenceLength = [
    { length: '0-50', count: 1200 },
    { length: '50-100', count: 4800 },
    { length: '100-200', count: 11200 },
    { length: '200-350', count: 6400 },
    { length: '350-500', count: 1100 },
    { length: '500+', count: 300 }
  ];

  return (
    <MainLayout>
      <div className="p-8 max-w-6xl mx-auto space-y-8 relative pb-24 font-sans select-none">
        
        {/* Back Link & Header */}
        <div className="space-y-4">
          <button 
            onClick={() => router.push('/datasets')}
            className="flex items-center gap-1 text-xs font-bold text-[#8ab4f8] hover:text-[#a8c7fa] transition-all cursor-pointer border-none bg-transparent"
          >
            <ArrowLeft size={14} />
            <span>Back to Dataset Repository</span>
          </button>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#8ab4f8]/10 border border-[#8ab4f8]/20 rounded-2xl text-[#8ab4f8]">
                {activeDataset.type === 'IMAGE' && <ImageIcon size={26} />}
                {activeDataset.type === 'CSV' && <FileSpreadsheet size={26} />}
                {activeDataset.type === 'TEXT' && <FileText size={26} />}
              </div>
              <div>
                <h1 className="text-3xl font-black text-white">{activeDataset.name}</h1>
                <p className="text-[#9aa0a6] text-xs font-semibold mt-1">
                  ID: {activeDataset.id} • {activeDataset.numRecords.toLocaleString()} parsed entries.
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (activeDataset.type === 'IMAGE') {
                    // Switch to CSV mock analysis for testing
                    setActiveDataset(prev => prev ? { ...prev, type: 'CSV', name: 'boston_housing_features.csv' } : null);
                  } else if (activeDataset.type === 'CSV') {
                    setActiveDataset(prev => prev ? { ...prev, type: 'TEXT', name: 'imdb_movie_reviews.txt' } : null);
                  } else {
                    setActiveDataset(prev => prev ? { ...prev, type: 'IMAGE', name: 'cifar10_train_images.zip' } : null);
                  }
                }}
                className="flex items-center gap-1.5 px-4.5 py-2.5 bg-[#2b2d31] hover:bg-[#313338] border border-[#3f4046] text-xs font-bold text-white rounded-xl transition-all cursor-pointer"
              >
                <span>Cycle Format Demo</span>
              </button>
            </div>
          </div>
        </div>

        {/* Dashboard grid layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Main Visualizations Column */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* 1. IMAGE FORMAT ANALYSIS */}
            {activeDataset.type === 'IMAGE' && (
              <div className="space-y-8">
                
                {/* Visual Class Distribution */}
                <div className="bg-[#2b2d31]/50 border border-[#3f4046] rounded-2xl p-6 shadow-xl">
                  <h3 className="text-sm font-bold text-white mb-4">Class Cardinality Distribution</h3>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                      <BarChart data={imageClassData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#3f4046" opacity={0.3} />
                        <XAxis dataKey="name" stroke="#9aa0a6" tick={{ fontSize: 9, fontWeight: 700 }} />
                        <YAxis stroke="#9aa0a6" tick={{ fontSize: 9, fontWeight: 700 }} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1e1f22', borderColor: '#3f4046', borderRadius: '12px' }}
                          labelStyle={{ color: '#white', fontSize: '11px', fontWeight: 'bold' }}
                          itemStyle={{ color: '#8ab4f8', fontSize: '11px' }}
                        />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                          {imageClassData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#8ab4f8' : '#c5a3ff'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Resolution Scatter mapping */}
                  <div className="bg-[#2b2d31]/50 border border-[#3f4046] rounded-2xl p-6 shadow-xl flex flex-col justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white mb-1">Resolution Scatter</h3>
                      <p className="text-[10px] text-gray-500 font-semibold mb-4">Distribution of image width vs. height bounds.</p>
                    </div>
                    <div className="h-44 w-full">
                      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                        <ScatterChart margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid stroke="#3f4046" opacity={0.3} />
                          <XAxis type="number" dataKey="x" name="Width" stroke="#9aa0a6" unit="px" tick={{ fontSize: 9 }} />
                          <YAxis type="number" dataKey="y" name="Height" stroke="#9aa0a6" unit="px" tick={{ fontSize: 9 }} />
                          <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                          <Scatter name="Dimensions" data={imageResolutionData} fill="#80cbc4" />
                        </ScatterChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Label statistics */}
                  <div className="bg-[#2b2d31]/50 border border-[#3f4046] rounded-2xl p-6 shadow-xl space-y-4">
                    <h3 className="text-sm font-bold text-white">Label Statistics</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between border-b border-[#3f4046]/40 pb-2">
                        <span className="text-xs text-[#9aa0a6] font-semibold">Total Categories</span>
                        <span className="text-xs text-white font-extrabold font-mono">10</span>
                      </div>
                      <div className="flex justify-between border-b border-[#3f4046]/40 pb-2">
                        <span className="text-xs text-[#9aa0a6] font-semibold">Imbalance Ratio (Max/Min)</span>
                        <span className="text-xs text-white font-extrabold font-mono">1.008 (Balanced)</span>
                      </div>
                      <div className="flex justify-between border-b border-[#3f4046]/40 pb-2">
                        <span className="text-xs text-[#9aa0a6] font-semibold">Avg Color Channels</span>
                        <span className="text-xs text-white font-extrabold font-mono">3 (RGB)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-[#9aa0a6] font-semibold">Compressed File Sizing</span>
                        <span className="text-xs text-white font-extrabold font-mono">162 MB</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sample visual gallery */}
                <div className="bg-[#2b2d31]/50 border border-[#3f4046] rounded-2xl p-6 shadow-xl space-y-4">
                  <h3 className="text-sm font-bold text-white">Sample Ingest Gallery</h3>
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
                    {imageSamples.map((sample, idx) => (
                      <div 
                        key={idx} 
                        className={`h-16 rounded-xl border flex flex-col items-center justify-center gap-1 ${sample.color} shadow-sm cursor-help`}
                        title={`Label: ${sample.label}`}
                      >
                        <span className="text-xl">{sample.url}</span>
                        <span className="text-[8px] font-black uppercase text-center w-full truncate px-1">{sample.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}

            {/* 2. CSV FORMAT ANALYSIS */}
            {activeDataset.type === 'CSV' && (
              <div className="space-y-8">
                
                {/* Missing values distribution */}
                <div className="bg-[#2b2d31]/50 border border-[#3f4046] rounded-2xl p-6 shadow-xl">
                  <h3 className="text-sm font-bold text-white mb-4">Null Value Incomplete Counts</h3>
                  <div className="h-60 w-full">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                      <BarChart data={csvMissingData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#3f4046" opacity={0.3} />
                        <XAxis dataKey="column" stroke="#9aa0a6" tick={{ fontSize: 9 }} />
                        <YAxis stroke="#9aa0a6" tick={{ fontSize: 9 }} />
                        <Tooltip />
                        <Bar dataKey="missing" fill="#f28b82" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Grid for matrix & outliers */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Correlation Matrix */}
                  <div className="bg-[#2b2d31]/50 border border-[#3f4046] rounded-2xl p-6 shadow-xl space-y-4">
                    <div>
                      <h3 className="text-sm font-bold text-white mb-1">Correlation Matrix</h3>
                      <p className="text-[10px] text-gray-500 font-semibold">Pearson coefficients across main numeric features.</p>
                    </div>

                    <div className="grid grid-cols-5 gap-1 font-mono text-[9px] text-center font-bold">
                      {/* Headers */}
                      <div></div>
                      {csvCorrelationMatrix.map(row => <div key={row[0]} className="text-white truncate">{row[0]}</div>)}

                      {/* Content cells */}
                      {csvCorrelationMatrix.map((row, rIdx) => (
                        <React.Fragment key={rIdx}>
                          <div className="text-left text-white truncate py-1.5">{row[0]}</div>
                          {row.slice(1).map((val, cIdx) => {
                            const floatVal = parseFloat(val);
                            const bgCol = floatVal > 0.6 ? 'bg-[#8ab4f8]/20 text-[#8ab4f8]' : floatVal < -0.4 ? 'bg-[#f28b82]/20 text-[#f28b82]' : 'bg-[#1e1f22] text-gray-400';
                            return (
                              <div key={cIdx} className={`py-1.5 rounded-md ${bgCol} flex items-center justify-center`}>
                                {val}
                              </div>
                            );
                          })}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>

                  {/* Outliers Scatter mapping */}
                  <div className="bg-[#2b2d31]/50 border border-[#3f4046] rounded-2xl p-6 shadow-xl flex flex-col justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white mb-1">Anomalous Outlier Scan</h3>
                      <p className="text-[10px] text-gray-500 font-semibold mb-4">Scatter layout mapping Room count vs. pricing anomalies.</p>
                    </div>
                    <div className="h-44 w-full">
                      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                        <ScatterChart margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid stroke="#3f4046" opacity={0.3} />
                          <XAxis type="number" dataKey="x" name="Rooms" stroke="#9aa0a6" tick={{ fontSize: 9 }} />
                          <YAxis type="number" dataKey="y" name="Price" stroke="#9aa0a6" tick={{ fontSize: 9 }} />
                          <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                          <Scatter name="Anomalies" data={csvOutlierData}>
                            {csvOutlierData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.name === 'Outlier' ? '#f28b82' : '#8ab4f8'} />
                            ))}
                          </Scatter>
                        </ScatterChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Feature distribution curve */}
                <div className="bg-[#2b2d31]/50 border border-[#3f4046] rounded-2xl p-6 shadow-xl">
                  <h3 className="text-sm font-bold text-white mb-4">Target Feature Pricing Distribution</h3>
                  <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                      <AreaChart data={csvFeatureDist} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#3f4046" opacity={0.3} />
                        <XAxis dataKey="name" stroke="#9aa0a6" tick={{ fontSize: 9 }} />
                        <YAxis stroke="#9aa0a6" tick={{ fontSize: 9 }} />
                        <Tooltip />
                        <Area type="monotone" dataKey="freq" stroke="#80cbc4" fill="rgba(128, 203, 196, 0.1)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>
            )}

            {/* 3. TEXT FORMAT ANALYSIS */}
            {activeDataset.type === 'TEXT' && (
              <div className="space-y-8">
                
                {/* Vocabulary metrics widgets */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-[#2b2d31]/40 border border-[#3f4046] p-4.5 rounded-xl space-y-1">
                    <span className="text-[10px] uppercase font-bold text-gray-500">Total Word Count</span>
                    <h4 className="text-xl font-extrabold text-white">{textVocabData.totalWords}</h4>
                  </div>
                  <div className="bg-[#2b2d31]/40 border border-[#3f4046] p-4.5 rounded-xl space-y-1">
                    <span className="text-[10px] uppercase font-bold text-gray-500">Unique Vocabulary</span>
                    <h4 className="text-xl font-extrabold text-white text-[#8ab4f8]">{textVocabData.uniqueTokens}</h4>
                  </div>
                  <div className="bg-[#2b2d31]/40 border border-[#3f4046] p-4.5 rounded-xl space-y-1">
                    <span className="text-[10px] uppercase font-bold text-gray-500">Out-Of-Vocab (OOV) Rate</span>
                    <h4 className="text-xl font-extrabold text-white">{textVocabData.oovCount}</h4>
                  </div>
                </div>

                {/* Token frequency distribution */}
                <div className="bg-[#2b2d31]/50 border border-[#3f4046] rounded-2xl p-6 shadow-xl">
                  <h3 className="text-sm font-bold text-white mb-4">Top 8 Vocabulary Frequencies</h3>
                  <div className="h-60 w-full">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                      <BarChart data={textTokenFrequency} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#3f4046" opacity={0.3} />
                        <XAxis type="number" stroke="#9aa0a6" tick={{ fontSize: 9 }} />
                        <YAxis type="category" dataKey="token" stroke="#9aa0a6" tick={{ fontSize: 9 }} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#c5a3ff" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Sequence length counts */}
                <div className="bg-[#2b2d31]/50 border border-[#3f4046] rounded-2xl p-6 shadow-xl">
                  <h3 className="text-sm font-bold text-white mb-4">Sequence Tokens Length Distribution</h3>
                  <div className="h-52 w-full">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                      <AreaChart data={textSequenceLength} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#3f4046" opacity={0.3} />
                        <XAxis dataKey="length" stroke="#9aa0a6" tick={{ fontSize: 9 }} />
                        <YAxis stroke="#9aa0a6" tick={{ fontSize: 9 }} />
                        <Tooltip />
                        <Area type="monotone" dataKey="count" stroke="#ffe082" fill="rgba(255, 224, 130, 0.08)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>
            )}
          </div>

          {/* AI Insights Right Panel Column */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-[#2b2d31]/50 border border-[#3f4046] rounded-2xl p-6 shadow-xl space-y-6 relative overflow-hidden">
              <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 w-20 h-20 bg-[#8ab4f8]/5 rounded-full blur-2xl"></div>
              
              <div className="flex items-center gap-2 border-b border-[#3f4046]/80 pb-4">
                <Sparkles size={18} className="text-[#8ab4f8] animate-pulse" />
                <h3 className="text-xs font-black tracking-widest uppercase text-white">AI Dataset Insights</h3>
              </div>

              {/* Issues */}
              <div className="space-y-3">
                <span className="text-[10px] uppercase font-black tracking-wider text-rose-400 block flex items-center gap-1.5">
                  <AlertTriangle size={14} />
                  <span>Dataset Issues ({activeDataset.type === 'IMAGE' ? '1' : activeDataset.type === 'CSV' ? '2' : '1'})</span>
                </span>
                
                <div className="space-y-2.5">
                  {activeDataset.type === 'IMAGE' && (
                    <div className="bg-rose-500/5 border border-rose-500/15 p-3 rounded-xl">
                      <p className="text-[11px] font-bold text-rose-300">File structure nesting warning</p>
                      <p className="text-[10px] text-gray-400 mt-1 font-semibold leading-relaxed">
                        Parsed 2 files inside the zip root directory containing system metadata files (e.g. .DS_Store) which may trigger pipeline crashes.
                      </p>
                    </div>
                  )}

                  {activeDataset.type === 'CSV' && (
                    <>
                      <div className="bg-rose-500/5 border border-rose-500/15 p-3 rounded-xl">
                        <p className="text-[11px] font-bold text-rose-300">Missing column indexes</p>
                        <p className="text-[10px] text-gray-400 mt-1 font-semibold leading-relaxed">
                          15 rows in `AGE` are null. Tabular regression pipelines require input masking or imputation prior to execution.
                        </p>
                      </div>
                      <div className="bg-rose-500/5 border border-rose-500/15 p-3 rounded-xl">
                        <p className="text-[11px] font-bold text-rose-300">Outlier vectors detected</p>
                        <p className="text-[10px] text-gray-400 mt-1 font-semibold leading-relaxed">
                          2 high-leverage anomaly points located on price axes, which might distort standard MSE loss weights.
                        </p>
                      </div>
                    </>
                  )}

                  {activeDataset.type === 'TEXT' && (
                    <div className="bg-rose-500/5 border border-rose-500/15 p-3 rounded-xl">
                      <p className="text-[11px] font-bold text-rose-300">Highly skewed sequence lengths</p>
                      <p className="text-[10px] text-gray-400 mt-1 font-semibold leading-relaxed">
                        0.5% reviews exceed 500 tokens. This requires setting a max-len truncation bound to prevent CUDA memory limits.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Recommendations */}
              <div className="space-y-3">
                <span className="text-[10px] uppercase font-black tracking-wider text-[#8ab4f8] block flex items-center gap-1.5">
                  <CheckCircle size={14} />
                  <span>Recommendations</span>
                </span>
                
                <ul className="space-y-2 text-[10px] text-gray-300 font-semibold list-disc pl-4 leading-relaxed">
                  {activeDataset.type === 'IMAGE' && (
                    <>
                      <li>Apply <code className="text-[#8ab4f8] font-mono">transforms.Normalize</code> using Imagenet channels means.</li>
                      <li>Use RandomHorizontalFlip data augmentation to avoid position overfitting.</li>
                      <li>Standardize crop resolution dimensions to 32x32 prior to convolution layers.</li>
                    </>
                  )}

                  {activeDataset.type === 'CSV' && (
                    <>
                      <li>Impute missing values in `AGE` using column median vectors.</li>
                      <li>Apply MinMax scaling to tabular feature inputs to align scale bounds.</li>
                      <li>Perform outlier removal using Cook's distance threshold coefficient.</li>
                    </>
                  )}

                  {activeDataset.type === 'TEXT' && (
                    <>
                      <li>Enforce max sequence padding length to 128 words.</li>
                      <li>Remove punctuation and non-alphabetical tags for cleaner vocab stems.</li>
                      <li>Utilize pre-trained GloVe embedding indexes for base representation.</li>
                    </>
                  )}
                </ul>
              </div>

              {/* Warnings */}
              <div className="space-y-3">
                <span className="text-[10px] uppercase font-black tracking-wider text-[#ffe082] block flex items-center gap-1.5">
                  <Info size={14} />
                  <span>Pipeline Warnings</span>
                </span>
                
                <div className="p-3 bg-[#ffe082]/5 border border-[#ffe082]/15 rounded-xl text-[10px] text-gray-400 font-semibold leading-relaxed">
                  {activeDataset.type === 'IMAGE' && "Tensor flow operations require batch sizes of powers-of-two (e.g. 32, 64) for maximum hardware layout acceleration."}
                  {activeDataset.type === 'CSV' && "High collinearity warning: INDUS and TAX columns have a -0.71 index. Consider pruning redundant columns."}
                  {activeDataset.type === 'TEXT' && "Using dynamic batch padding may trigger compiler recompilations on XLA/JAX devices."}
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>
    </MainLayout>
  );
}
