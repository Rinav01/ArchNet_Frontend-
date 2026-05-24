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
  Plus, 
  HelpCircle, 
  FileText 
} from 'lucide-react';
import { useCanvasStore } from '@/store/canvasStore';

export default function Sidebar() {
  const pathname = usePathname();
  const addNode = useCanvasStore((state) => state.addNode);

  const menuItems = [
    { name: 'Layers', icon: Layers, path: '/' },
    { name: 'Datasets', icon: Database, path: '/datasets' },
    { name: 'Notebook', icon: BookOpen, path: '/notebook' },
    { name: 'Models', icon: Cpu, path: '/models' },
    { name: 'Settings', icon: Settings, path: '/settings' },
  ];

  const handleQuickAdd = () => {
    // Quick add Input layer or show user visual notice
    addNode('Input', 150, 150);
  };

  return (
    <aside className="w-64 glass-panel border-r border-white/5 flex flex-col h-screen fixed left-0 top-0 z-20">
      {/* Brand Logo */}
      <div className="p-6 flex items-center gap-3 border-b border-white/5">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
          <span className="font-bold text-white text-lg">M</span>
        </div>
        <div>
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            MLBuilder
          </span>
        </div>
      </div>

      {/* Project Status Info */}
      <div className="p-4 mx-4 my-4 rounded-xl bg-white/5 border border-white/5 flex items-center gap-3">
        <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
          <Cpu size={20} />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-white truncate">Project Alpha</h4>
          <span className="text-xs text-purple-400 font-mono">V1.0.4-beta</span>
        </div>
      </div>

      {/* Main Navigation Menu */}
      <nav className="flex-1 px-4 space-y-1">
        {menuItems.map((item) => {
          const isActive = pathname === item.path || (item.path === '/' && pathname.startsWith('/editor'));
          const Icon = item.icon;
          
          return (
            <Link
              key={item.name}
              href={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                isActive 
                  ? 'bg-purple-600/10 text-purple-400 border-l-2 border-purple-500 font-semibold' 
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon size={18} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Add New Layer & bottom guides */}
      <div className="p-4 border-t border-white/5 space-y-4">
        <button
          onClick={handleQuickAdd}
          className="w-full flex items-center justify-center gap-2 py-3 bg-purple-600/15 hover:bg-purple-600/25 border border-purple-500/20 text-purple-400 hover:text-purple-300 rounded-xl text-sm font-medium transition-all duration-200"
        >
          <Plus size={16} />
          <span>New Layer</span>
        </button>

        <div className="flex flex-col gap-2 pt-2 text-xs font-medium text-gray-500">
          <Link href="/docs" className="flex items-center gap-2 hover:text-gray-300 py-1">
            <FileText size={14} />
            <span>Docs</span>
          </Link>
          <Link href="/support" className="flex items-center gap-2 hover:text-gray-300 py-1">
            <HelpCircle size={14} />
            <span>Support</span>
          </Link>
        </div>
      </div>
    </aside>
  );
}
