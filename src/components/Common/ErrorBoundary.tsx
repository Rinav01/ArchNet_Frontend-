'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
  name: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`ErrorBoundary caught an error in "${this.props.name}":`, error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-[#1e1f22]/90 border border-red-500/20 rounded-2xl shadow-2xl backdrop-blur-md select-none relative overflow-hidden text-[#e3e3e3]">
          {/* Glassmorphic glowing accent background */}
          <div className="absolute inset-0 bg-red-500/5 blur-xl pointer-events-none"></div>
          
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl mb-4 animate-bounce duration-3000">
            <AlertTriangle size={24} />
          </div>
          
          <h3 className="text-sm font-black text-white uppercase tracking-wider">
            {this.props.name} Crashed
          </h3>
          
          <p className="text-[10px] text-gray-400 mt-2 max-w-xs leading-relaxed font-semibold">
            An unexpected error occurred during panel rendering. You can attempt to soft-reboot this specific panel below.
          </p>

          {this.state.error && (
            <div className="w-full max-w-sm mt-4 p-3 bg-[#1b1c1e] border border-red-500/15 rounded-xl text-left overflow-x-auto">
              <pre className="text-[8.5px] font-mono text-red-300 leading-normal no-scrollbar">
                {this.state.error.name}: {this.state.error.message}
              </pre>
            </div>
          )}

          <button
            onClick={this.handleReset}
            className="mt-5 flex items-center gap-1.5 px-4.5 py-2 bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 text-[10.5px] font-black rounded-full transition-all cursor-pointer shadow-sm hover:scale-[1.02] active:scale-[0.98]"
          >
            <RefreshCw size={12} className="animate-spin duration-3000" />
            <span>Reset {this.props.name}</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
