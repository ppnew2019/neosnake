import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { ScoreEntry } from '../types';

interface ScoreChartProps {
  data: ScoreEntry[];
}

const ScoreChart: React.FC<ScoreChartProps> = ({ data }) => {
  if (data.length === 0) return null;

  return (
    <div className="w-full h-48 mt-4 bg-gray-900/50 p-4 rounded-xl border border-gray-700">
      <h3 className="text-sm font-bold text-gray-400 mb-2 font-mono uppercase">Performance History</h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="gameId" hide />
          <YAxis stroke="#9ca3af" fontSize={12} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', color: '#fff' }}
            itemStyle={{ color: '#4ade80' }}
            labelStyle={{ display: 'none' }}
          />
          <Line 
            type="monotone" 
            dataKey="score" 
            stroke="#10b981" 
            strokeWidth={2} 
            dot={{ r: 3, fill: '#10b981' }} 
            activeDot={{ r: 6, stroke: '#ec4899' }} 
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ScoreChart;
