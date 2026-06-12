'use client';

import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { MetricPoint } from '@/store/trainingStore';
import { TrendingDown } from 'lucide-react';

interface LossChartProps {
  metrics: MetricPoint[];
}

export default function LossChart({ metrics }: LossChartProps) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="bg-[#1e1f22]/50 border border-[#3f4046] rounded-2xl p-5 space-y-4 shadow-md select-none flex-1 min-w-[280px]">
      <div className="flex items-center gap-2 border-b border-[#3f4046]/35 pb-3">
        <div className="p-1.5 bg-[#8ab4f8]/15 border border-[#8ab4f8]/20 rounded-lg text-[#8ab4f8]">
          <TrendingDown size={14} />
        </div>
        <div>
          <h4 className="text-xs font-black text-white uppercase tracking-wider">Model Training Loss Curves</h4>
          <span className="text-[10px] text-gray-500 font-semibold block mt-0.5">Objective minimizer metrics per epoch</span>
        </div>
      </div>

      <div className="h-[220px] w-full text-[10px] font-mono">
        {!mounted || metrics.length === 0 ? (
          <div className="h-full w-full flex items-center justify-center text-gray-500 font-sans font-semibold">
            {!mounted ? 'Initializing curves chart...' : 'No telemetry logs queued. Start training execution loop.'}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <LineChart data={metrics} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2b2d31" />
              <XAxis dataKey="epoch" stroke="#5f6368" />
              <YAxis stroke="#5f6368" domain={[0, 'auto']} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1e1f22', 
                  borderColor: '#3f4046', 
                  borderRadius: '12px',
                  color: '#e3e3e3',
                  fontSize: '10px'
                }} 
              />
              <Legend verticalAlign="top" height={24} iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
              <Line
                name="Train Loss"
                type="monotone"
                dataKey="loss"
                stroke="#8ab4f8"
                strokeWidth={2.5}
                dot={{ r: 2 }}
                activeDot={{ r: 4 }}
              />
              <Line
                name="Val Loss"
                type="monotone"
                dataKey="val_loss"
                stroke="#c5a3ff"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={{ r: 1 }}
                activeDot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
