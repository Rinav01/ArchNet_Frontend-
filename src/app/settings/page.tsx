'use client';

import React, { useState } from 'react';
import MainLayout from '@/components/Layout/MainLayout';
import { Settings, Save, Shield, HardDrive, Key, User } from 'lucide-react';

export default function SettingsPage() {
  const [graphqlUrl, setGraphqlUrl] = useState('http://localhost:8000/graphql');
  const [s3Bucket, setS3Bucket] = useState('mlbuilder-cloud-assets');
  const [framework, setFramework] = useState('PyTorch');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Settings saved successfully!');
  };

  return (
    <MainLayout>
      <div className="p-8 max-w-4xl mx-auto space-y-8 relative pb-16">
        
        {/* Title */}
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <Settings className="text-purple-500" size={32} />
            <span>Developer Settings</span>
          </h1>
          <p className="text-gray-400 mt-2 text-sm font-medium">
            Configure your compiler runtimes, remote servers, and environmental parameters.
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="space-y-6">
          
          {/* General Section */}
          <div className="glass-card rounded-2xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-white/5 pb-3">
              <User size={18} className="text-purple-400" />
              <span>Workspace Profile</span>
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase block">Developer Name</label>
                <input 
                  type="text" 
                  defaultValue="Alpha Developer"
                  className="w-full px-4 py-3 bg-white/5 border border-white/5 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500/35"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase block">Preferred Engine</label>
                <select
                  value={framework}
                  onChange={(e) => setFramework(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/5 rounded-xl text-sm text-gray-300 focus:outline-none focus:border-purple-500/35"
                >
                  <option value="PyTorch" className="bg-[#11121d]">PyTorch (Recommended)</option>
                  <option value="TensorFlow" className="bg-[#11121d]">TensorFlow</option>
                  <option value="JAX" className="bg-[#11121d]">JAX</option>
                </select>
              </div>
            </div>
          </div>

          {/* Network Sync Section */}
          <div className="glass-card rounded-2xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-white/5 pb-3">
              <Shield size={18} className="text-purple-400" />
              <span>Endpoints & Synchronization</span>
            </h3>
            
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase block">GraphQL Sync URL</label>
                <input 
                  type="text" 
                  value={graphqlUrl}
                  onChange={(e) => setGraphqlUrl(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/5 rounded-xl text-sm font-mono text-gray-300 focus:outline-none focus:border-purple-500/35"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase block">WebSocket Subscription URL</label>
                <input 
                  type="text" 
                  defaultValue="ws://localhost:8000/graphql"
                  className="w-full px-4 py-3 bg-white/5 border border-white/5 rounded-xl text-sm font-mono text-gray-300 focus:outline-none focus:border-purple-500/35"
                />
              </div>
            </div>
          </div>

          {/* Cloud Storage Section */}
          <div className="glass-card rounded-2xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-white/5 pb-3">
              <HardDrive size={18} className="text-purple-400" />
              <span>Storage Configuration</span>
            </h3>
            
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase block">S3 Asset Bucket</label>
              <input 
                type="text" 
                value={s3Bucket}
                onChange={(e) => setS3Bucket(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/5 rounded-xl text-sm font-mono text-gray-300 focus:outline-none focus:border-purple-500/35"
              />
            </div>
          </div>

          {/* Save Button */}
          <div className="flex items-center justify-end">
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-purple-600/15 border border-purple-500/25 transition-all duration-200"
            >
              <Save size={18} />
              <span>Save Configurations</span>
            </button>
          </div>

        </form>

      </div>
    </MainLayout>
  );
}
