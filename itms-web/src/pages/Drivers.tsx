import React, { useEffect, useState } from 'react';
import { useThemeStore } from '../store/themeStore';
import { Users, Activity, Target, ShieldAlert, Award, Clock } from 'lucide-react';
import api from '../services/api';

interface Driver {
  id: string;
  name: string;
  status: string;
}

interface PerformanceLog {
  id: string;
  composite_score: number;
  on_time_score: number;
  idle_minutes: number;
  created_at: string;
}

export default function Drivers() {
  const { theme } = useThemeStore();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [performanceLogs, setPerformanceLogs] = useState<PerformanceLog[]>([]);

  useEffect(() => {
    const fetchDrivers = async () => {
      try {
        const response = await api.get('/drivers');
        setDrivers(response.data.drivers);
      } catch (err) {
        console.error(err);
      }
    };
    fetchDrivers();
  }, []);

  const selectDriver = async (driver: Driver) => {
    setSelectedDriver(driver);
    try {
      const response = await api.get(`/performance/${driver.id}`);
      setPerformanceLogs(response.data.performance_logs);
    } catch (err) {
      console.error(err);
      setPerformanceLogs([]);
    }
  };

  return (
    <div className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto">
      <header className="flex justify-between items-center animate-fade-in">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-3">
          <Users className="text-primary" size={28} />
          Driver Performance Center
        </h1>
        <div className="flex gap-4">
          <div className="bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 px-4 py-2 flex items-center gap-2 rounded-lg shadow-sm">
            <Activity size={16} className="text-indigo-600 dark:text-indigo-400" />
            <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">AI Scoring Active</span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
        {/* Drivers List */}
        <div className="lg:col-span-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl flex flex-col shadow-sm">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Fleet Leaderboard</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {drivers.map(d => (
              <div 
                key={d.id} 
                onClick={() => selectDriver(d)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedDriver?.id === d.id ? 'border-primary bg-primary/5 shadow-sm' : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 hover:border-primary/50'}`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-semibold text-zinc-900 dark:text-zinc-100">{d.name}</h4>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 capitalize">{d.status}</span>
                  </div>
                  <ChevronRightIcon />
                </div>
              </div>
            ))}
            {drivers.length === 0 && (
              <div className="text-center p-8 text-zinc-500">No drivers found.</div>
            )}
          </div>
        </div>

        {/* Performance Detail */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl flex flex-col shadow-sm">
          {selectedDriver ? (
            <div className="p-6">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-6 flex items-center gap-2">
                <Target className="text-emerald-500" />
                Performance Profile: {selectedDriver.name}
              </h2>
              
              {performanceLogs.length > 0 ? (
                <div className="space-y-6">
                  {/* Summary Metric */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl text-center">
                      <div className="text-zinc-500 dark:text-zinc-400 text-sm font-semibold mb-1 flex items-center justify-center gap-1">
                        <Award size={16} /> Composite
                      </div>
                      <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                        {performanceLogs[0].composite_score.toFixed(1)}
                      </div>
                    </div>
                    <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl text-center">
                      <div className="text-zinc-500 dark:text-zinc-400 text-sm font-semibold mb-1 flex items-center justify-center gap-1">
                        <Clock size={16} /> On-Time
                      </div>
                      <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                        {performanceLogs[0].on_time_score.toFixed(1)}%
                      </div>
                    </div>
                    <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl text-center">
                      <div className="text-zinc-500 dark:text-zinc-400 text-sm font-semibold mb-1 flex items-center justify-center gap-1">
                        <ShieldAlert size={16} /> Idle Mins
                      </div>
                      <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                        {performanceLogs[0].idle_minutes}
                      </div>
                    </div>
                  </div>

                  {/* History Table */}
                  <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-xs">
                        <tr>
                          <th className="px-4 py-3 font-medium">Date</th>
                          <th className="px-4 py-3 font-medium">Composite Score</th>
                          <th className="px-4 py-3 font-medium">On-Time</th>
                          <th className="px-4 py-3 font-medium">Idle Mins</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                        {performanceLogs.map(log => (
                          <tr key={log.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                            <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{new Date(log.created_at).toLocaleDateString()}</td>
                            <td className="px-4 py-3 font-bold text-emerald-600 dark:text-emerald-400">{log.composite_score.toFixed(1)}</td>
                            <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{log.on_time_score.toFixed(1)}%</td>
                            <td className="px-4 py-3 text-amber-600 dark:text-amber-400">{log.idle_minutes}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center p-12 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <Activity size={48} className="mx-auto text-zinc-300 dark:text-zinc-700 mb-4" />
                  <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">No performance data yet</h3>
                  <p className="text-zinc-500 dark:text-zinc-400 mt-2">Scores will appear here once the driver completes their first AI-monitored trip.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-zinc-500 dark:text-zinc-400">
              <Users size={64} className="mb-4 text-zinc-300 dark:text-zinc-700" />
              <p className="text-lg">Select a driver from the leaderboard to view their AI performance profile.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ChevronRightIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400"><path d="m9 18 6-6-6-6"/></svg>
  );
}
