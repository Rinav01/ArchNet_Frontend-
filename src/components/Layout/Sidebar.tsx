'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Layers, 
  Database, 
  BookOpen, 
  Cpu, 
  Settings, 
  HelpCircle, 
  FileText,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  CloudLightning,
  DollarSign,
  GitBranch
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();

  const isEditor = pathname.startsWith('/editor');

  const menuItems = [
    { name: 'Layers', icon: Layers, path: '/' },
    { name: 'Datasets', icon: Database, path: '/datasets' },
    { name: 'Notebook', icon: BookOpen, path: '/notebook' },
    { name: 'Models', icon: Cpu, path: '/models' },
    { name: 'Research', icon: Sparkles, path: '/models/research' },
    { name: 'Experiments', icon: TrendingUp, path: '/experiments' },
    { name: 'Registry', icon: ShieldCheck, path: '/models/registry' },
    { name: 'Deployments', icon: CloudLightning, path: '/deployments' },
    { name: 'Costs', icon: DollarSign, path: '/costs' },
    { name: 'Workflows', icon: GitBranch, path: '/workflows' },
    { name: 'Settings', icon: Settings, path: '/settings' },
  ];

  return (
    <aside className={`bg-[#1e1f22] border-r border-[#3f4046] flex flex-col h-screen fixed left-0 top-0 z-20 select-none transition-all duration-300 ${
      isEditor ? 'w-20 items-center' : 'w-64'
    }`}>
      {/* Brand Logo */}
      <div className={`flex items-center border-b border-[#3f4046] w-full ${
        isEditor ? 'p-4 justify-center h-16' : 'p-6 gap-3'
      }`}>
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#8ab4f8] to-[#c5a3ff] flex items-center justify-center shadow-lg shadow-black/25 flex-shrink-0">
          <span className="font-bold text-[#1e1f22] text-lg">M</span>
        </div>
        {!isEditor && (
          <div>
            <span className="text-xl font-bold tracking-tight text-white">
              MLBuilder
            </span>
          </div>
        )}
      </div>

      {/* Project Status Info */}
      {!isEditor ? (
        <div className="p-4 mx-4 my-4 rounded-xl bg-[#2b2d31] border border-[#3f4046] flex items-center gap-3">
          <div className="p-2 bg-[#8ab4f8]/10 rounded-lg text-[#8ab4f8]">
            <Cpu size={20} />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white truncate">Project Alpha</h4>
            <span className="text-xs text-[#8ab4f8] font-mono">V1.0.4-beta</span>
          </div>
        </div>
      ) : (
        <div className="my-4" title="Project Alpha (V1.0.4-beta)">
          <div className="p-2 bg-[#8ab4f8]/10 border border-[#8ab4f8]/20 rounded-xl text-[#8ab4f8] cursor-pointer">
            <Cpu size={18} />
          </div>
        </div>
      )}

      {/* Main Navigation Menu */}
      <nav className={`flex-1 w-full space-y-1 ${isEditor ? 'px-2' : 'px-4'}`}>
        {menuItems.map((item) => {
          const isActive = pathname === item.path || (item.path === '/' && pathname.startsWith('/editor'));
          const Icon = item.icon;
          
          return (
            <Link
              key={item.name}
              href={item.path}
              title={isEditor ? item.name : undefined}
              className={`flex items-center rounded-lg text-sm font-medium transition-all ${
                isEditor ? 'justify-center p-3' : 'px-4 py-3 gap-3'
              } ${
                isActive 
                  ? 'bg-[#394457] text-[#8ab4f8] border-l-4 border-[#8ab4f8] font-semibold' 
                  : 'text-[#9aa0a6] hover:bg-[#2b2d31] hover:text-[#e3e3e3]'
              }`}
            >
              <Icon size={18} />
              {!isEditor && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom guides */}
      <div className={`border-t border-[#3f4046] w-full flex flex-col items-center gap-4 ${isEditor ? 'p-3' : 'p-4'}`}>
        <div className={`flex text-xs font-semibold text-[#9aa0a6] ${isEditor ? 'flex-col gap-3 py-1 animate-fade-in' : 'flex-col gap-2 pt-2 w-full'}`}>
          <Link 
            href="/docs" 
            target="_blank"
            rel="noopener noreferrer"
            title={isEditor ? "Docs" : undefined}
            className={`flex items-center hover:text-[#e3e3e3] ${isEditor ? 'justify-center p-1' : 'gap-2 py-1'}`}
          >
            <FileText size={14} />
            {!isEditor && <span>Docs</span>}
          </Link>
          <Link 
            href="/docs#support" 
            target="_blank"
            rel="noopener noreferrer"
            title={isEditor ? "Support" : undefined}
            className={`flex items-center hover:text-[#e3e3e3] ${isEditor ? 'justify-center p-1' : 'gap-2 py-1'}`}
          >
            <HelpCircle size={14} />
            {!isEditor && <span>Support</span>}
          </Link>
        </div>
      </div>
    </aside>
  );
}
