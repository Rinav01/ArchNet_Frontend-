'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { Loader } from 'lucide-react';

const NodeGraphDynamic = dynamic(
  () => import('./NodeGraph'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#090a0f] gap-4 relative min-h-[500px]">
        <div className="absolute inset-0 dot-grid opacity-30"></div>
        <div className="relative flex items-center justify-center">
          <Loader size={36} className="text-purple-500 animate-spin" />
        </div>
        <div className="text-sm font-semibold tracking-wider text-gray-500 font-mono animate-pulse">
          COMPILING CANVAS ENGINE...
        </div>
      </div>
    ),
  }
);

export default function CanvasWrapper() {
  return <NodeGraphDynamic />;
}
