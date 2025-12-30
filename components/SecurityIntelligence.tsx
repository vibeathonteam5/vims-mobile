
import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { ANALYTICS_CHART, MOCK_ALERTS } from '../constants';

const SecurityIntelligence: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Visitors', val: '142', delta: '+12%', color: 'text-blue-600' },
          { label: 'Guard Stations', val: '8/10', delta: 'Online', color: 'text-emerald-600' },
          { label: 'Blocked IDs', val: '3', delta: 'Last 24h', color: 'text-rose-600' },
          { label: 'EV Bays Free', val: '14', delta: 'P1 Level', color: 'text-amber-600' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">{stat.label}</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={`text-2xl font-bold ${stat.color}`}>{stat.val}</span>
              <span className="text-xs text-slate-400 font-medium">{stat.delta}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Traffic & Guard Allocation</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={ANALYTICS_CHART}>
                <defs>
                  <linearGradient id="colorVis" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip />
                <Area type="monotone" dataKey="visitors" stroke="#3b82f6" fillOpacity={1} fill="url(#colorVis)" strokeWidth={3} />
                <Area type="monotone" dataKey="guards" stroke="#10b981" fillOpacity={0} strokeWidth={2} strokeDasharray="5 5" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Live Security Feed</h3>
          <div className="space-y-4">
            {MOCK_ALERTS.map(alert => (
              <div key={alert.id} className={`p-4 rounded-lg border-l-4 ${alert.level === 'HIGH' ? 'bg-rose-50 border-rose-500' : 'bg-slate-50 border-slate-300'}`}>
                <div className="flex justify-between items-start">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${alert.level === 'HIGH' ? 'bg-rose-100 text-rose-700' : 'bg-slate-200 text-slate-600'}`}>
                    {alert.level} PRIORITY
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">{alert.timestamp}</span>
                </div>
                <p className="text-sm font-semibold text-slate-800 mt-2">{alert.message}</p>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                  {alert.location}
                </p>
              </div>
            ))}
          </div>
          <button className="w-full mt-6 py-2 text-sm font-semibold text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors">
            View Full Incident Log
          </button>
        </div>
      </div>
    </div>
  );
};

export default SecurityIntelligence;
