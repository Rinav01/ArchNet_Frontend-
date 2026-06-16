import React from 'react';
import { LayoutGrid, Cpu, Scan, Focus, X } from 'lucide-react';

interface TemplateSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (templateName: string) => void;
}

export default function TemplateSelectionModal({ isOpen, onClose, onSelectTemplate }: TemplateSelectionModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-[#1e1f22] rounded-2xl border border-[#3f4046] shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-6 border-b border-[#3f4046] flex items-center justify-between bg-[#232428]">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <LayoutGrid className="text-[#8ab4f8]" size={20} />
              Select Template
            </h3>
            <p className="text-xs text-[#9aa0a6] mt-1 font-semibold">
              Load a pre-configured architecture into your workspace.
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-[#2b2d31] rounded-lg text-[#9aa0a6] hover:text-white transition-all cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Content - Template Cards */}
        <div className="p-6 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* ResNet50 Card */}
            <div 
              onClick={() => onSelectTemplate('ResNet50')}
              className="group relative bg-[#2b2d31] border border-[#3f4046] hover:border-[#8ab4f8]/50 rounded-xl p-5 cursor-pointer transition-all hover:bg-[#8ab4f8]/5"
            >
              <div className="absolute top-4 right-4 p-1.5 bg-[#8ab4f8]/10 rounded-lg text-[#8ab4f8] group-hover:scale-110 transition-transform">
                <Cpu size={18} />
              </div>
              <h4 className="text-sm font-bold text-white mb-1">ResNet50</h4>
              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-[#8ab4f8]/10 text-[#8ab4f8] mb-3">Computer Vision</span>
              <p className="text-xs text-[#9aa0a6] leading-relaxed">
                Full 50-layer Residual Network with stem, bottleneck blocks, skip connections, and global average pooling head.
              </p>
            </div>

            {/* ViT Card */}
            <div 
              onClick={() => onSelectTemplate('ViT')}
              className="group relative bg-[#2b2d31] border border-[#3f4046] hover:border-[#c5a3ff]/50 rounded-xl p-5 cursor-pointer transition-all hover:bg-[#c5a3ff]/5"
            >
              <div className="absolute top-4 right-4 p-1.5 bg-[#c5a3ff]/10 rounded-lg text-[#c5a3ff] group-hover:scale-110 transition-transform">
                <Scan size={18} />
              </div>
              <h4 className="text-sm font-bold text-white mb-1">Vision Transformer (ViT)</h4>
              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-[#c5a3ff]/10 text-[#c5a3ff] mb-3">Attention</span>
              <p className="text-xs text-[#9aa0a6] leading-relaxed">
                Patch embedding projection followed by Self-Attention and MLP blocks with LayerNorm and residual streams.
              </p>
            </div>

            {/* Simple CNN Card */}
            <div 
              onClick={() => onSelectTemplate('Simple CNN')}
              className="group relative bg-[#2b2d31] border border-[#3f4046] hover:border-[#ffe082]/50 rounded-xl p-5 cursor-pointer transition-all hover:bg-[#ffe082]/5"
            >
              <div className="absolute top-4 right-4 p-1.5 bg-[#ffe082]/10 rounded-lg text-[#ffe082] group-hover:scale-110 transition-transform">
                <Focus size={18} />
              </div>
              <h4 className="text-sm font-bold text-white mb-1">Simple CNN</h4>
              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-[#ffe082]/10 text-[#ffe082] mb-3">Computer Vision</span>
              <p className="text-xs text-[#9aa0a6] leading-relaxed">
                A basic convolutional network for MNIST/CIFAR. Includes Conv2D and MaxPool layers followed by a dense classifier.
              </p>
            </div>

            {/* Autoencoder Card */}
            <div 
              onClick={() => onSelectTemplate('Autoencoder')}
              className="group relative bg-[#2b2d31] border border-[#3f4046] hover:border-[#80cbc4]/50 rounded-xl p-5 cursor-pointer transition-all hover:bg-[#80cbc4]/5"
            >
              <div className="absolute top-4 right-4 p-1.5 bg-[#80cbc4]/10 rounded-lg text-[#80cbc4] group-hover:scale-110 transition-transform">
                <LayoutGrid size={18} />
              </div>
              <h4 className="text-sm font-bold text-white mb-1">Autoencoder</h4>
              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-[#80cbc4]/10 text-[#80cbc4] mb-3">Unsupervised</span>
              <p className="text-xs text-[#9aa0a6] leading-relaxed">
                An encoder-decoder architecture with a dense bottleneck layer for dimensionality reduction and reconstruction.
              </p>
            </div>
          </div>
        </div>
        
        {/* Modal Footer */}
        <div className="p-4 border-t border-[#3f4046] bg-[#1e1f22] flex justify-end">
          <button 
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-[#9aa0a6] hover:text-white transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
