'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Sidebar from './Sidebar';
import Header from './Header';
import ToastContainer from './ToastContainer';
import { useProjectStore } from '@/store/projectStore';
import { Loader2 } from 'lucide-react';

interface MainLayoutProps {
  children: React.ReactNode;
  onGenerateCode?: () => void;
  onCompareVersions?: () => void;
  onOpenTrainingConfig?: () => void;
  onOpenExport?: () => void;
  onOpenCompare?: () => void;
}

export default function MainLayout({ 
  children, 
  onGenerateCode, 
  onCompareVersions, 
  onOpenTrainingConfig,
  onOpenExport,
  onOpenCompare
}: MainLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isOnline = useProjectStore((state) => state.isOnline);
  const checkBackendStatus = useProjectStore((state) => state.checkBackendStatus);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    // Check initial online status
    checkBackendStatus();
  }, [checkBackendStatus]);

  useEffect(() => {
    const token = localStorage.getItem('archnet_token');
    
    // Route guard: if online is active and token is missing, or token is missing entirely, redirect to /login
    if ((isOnline || !token) && !token && pathname !== '/login' && !pathname.startsWith('/editor/sandbox')) {
      router.push('/login');
    } else {
      setIsCheckingAuth(false);
      
      if (token) {
        localStorage.setItem('lastVisitedPage', pathname);
        localStorage.setItem('lastActivityAt', new Date().toISOString());
        
        const editorMatch = pathname.match(/^\/editor\/([^/]+)/);
        if (editorMatch) {
          const projectId = editorMatch[1];
          localStorage.setItem('lastVisitedProjectId', projectId);
        }
      }
    }
  }, [isOnline, pathname, router]);

  const isEditor = pathname.startsWith('/editor');

  if (isCheckingAuth && pathname !== '/login') {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#0a0b10] text-[#e3e3e3]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 text-[#8ab4f8] animate-spin" />
          <span className="text-xs font-semibold text-[#9aa0a6]">Securing Session Handshake...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1e1f22] text-[#e3e3e3] flex overflow-hidden">
      {/* Visual background elements */}
      <div className="absolute inset-0 dot-grid pointer-events-none opacity-40 z-0"></div>
      
      {/* Sidebar Navigation */}
      {!isEditor && <Sidebar />}
      
      {/* Main Content Area */}
      <div className={`flex-1 ${isEditor ? 'pl-0' : 'pl-64'} flex flex-col h-screen overflow-hidden relative z-10 transition-all duration-300`}>
        <Header 
          onGenerateCode={onGenerateCode} 
          onCompareVersions={onCompareVersions} 
          onOpenTrainingConfig={onOpenTrainingConfig} 
          onOpenExport={onOpenExport}
          onOpenCompare={onOpenCompare}
        />
        <main className="flex-1 overflow-y-auto relative">
          {children}
        </main>
        <ToastContainer />
      </div>
    </div>
  );
}
