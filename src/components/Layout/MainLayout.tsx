'use client';

import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

interface MainLayoutProps {
  children: React.ReactNode;
  onGenerateCode?: () => void;
}

export default function MainLayout({ children, onGenerateCode }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-[#090a0f] text-gray-100 flex overflow-hidden">
      {/* Visual background elements */}
      <div className="absolute inset-0 dot-grid pointer-events-none opacity-40 z-0"></div>
      
      {/* Sidebar Navigation */}
      <Sidebar />
      
      {/* Main Content Area */}
      <div className="flex-1 pl-64 flex flex-col h-screen overflow-hidden relative z-10">
        <Header onGenerateCode={onGenerateCode} />
        <main className="flex-1 overflow-y-auto relative">
          {children}
        </main>
      </div>
    </div>
  );
}
