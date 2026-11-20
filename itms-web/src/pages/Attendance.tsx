import React, { useEffect, useState } from 'react';
import { Clock, Calendar as CalendarIcon, User, AlertTriangle, CheckCircle2 } from 'lucide-react';
import api from '../services/api';

interface AttendanceRecord {
  id: string;
  driver_name: string;
  clock_in: string | null;
  clock_out: string | null;
  total_hours: number | null;
}

export default function Attendance() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      const res = await api.get('/attendance');
      setRecords(res.data.attendance);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (iso: string | null) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto">
      <header className="animate-fade-in">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-3">
          <Clock className="text-primary" size={28} />
          Driver Hours & Compliance
        </h1>
        <p className="text-sm text-zinc-500 mt-1">Monitor EU driver hours, shifts, and compliance alerts</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 animate-fade-in" style={{ animationDelay: '0.05s' }}>
        
        {/* Reports List */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex justify-between items-center">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <CalendarIcon size={18} className="text-zinc-400" /> Recent Shifts
            </h3>
            <div className="flex bg-zinc-200 dark:bg-zinc-800 p-0.5 rounded-lg">
              <button onClick={() => setViewMode('list')} className={`px-3 py-1 text-xs font-medium rounded-md ${viewMode === 'list' ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm' : 'text-zinc-500'}`}>List</button>
              <button onClick={() => setViewMode('calendar')} className={`px-3 py-1 text-xs font-medium rounded-md ${viewMode === 'calendar' ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm' : 'text-zinc-500'}`}>Calendar</button>
            </div>
          </div>
          
          {viewMode === 'list' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50 dark:bg-zinc-950/50 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-xs">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Date</th>
                    <th className="px-5 py-4 font-semibold">Driver</th>
                    <th className="px-5 py-4 font-semibold">Clock In</th>
                    <th className="px-5 py-4 font-semibold">Clock Out</th>
                    <th className="px-5 py-4 font-semibold">Total Time</th>
                    <th className="px-5 py-4 font-semibold">Compliance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {loading ? (
                    <tr><td colSpan={6} className="px-5 py-8 text-center text-zinc-500">Loading attendance data...</td></tr>
                  ) : records.length === 0 ? (
                    <tr><td colSpan={6} className="px-5 py-8 text-center text-zinc-500">No shifts recorded yet.</td></tr>
                  ) : (
                    records.map(r => {
                      const hours = r.total_hours || 0;
                      // EU driving limit is typically 9 hours daily, extendable to 10 twice a week. Let's flag > 9.
                      const isBreach = hours > 9;
                      const isOngoing = !r.clock_out;

                      return (
                        <tr key={r.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                          <td className="px-5 py-4 font-medium text-zinc-900 dark:text-zinc-100 whitespace-nowrap">{formatDate(r.clock_in)}</td>
                          <td className="px-5 py-4 text-zinc-700 dark:text-zinc-300 flex items-center gap-2 whitespace-nowrap">
                            <div className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-600 dark:text-zinc-400">
                              {r.driver_name.charAt(0)}
                            </div>
                            {r.driver_name}
                          </td>
                          <td className="px-5 py-4 text-zinc-600 dark:text-zinc-400 font-mono text-xs">{formatTime(r.clock_in)}</td>
                          <td className="px-5 py-4 text-zinc-600 dark:text-zinc-400 font-mono text-xs">{formatTime(r.clock_out)}</td>
                          <td className="px-5 py-4 font-semibold text-zinc-900 dark:text-zinc-100">
                            {isOngoing ? (
                              <span className="text-blue-500 animate-pulse text-xs uppercase tracking-wider bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">Active Shift</span>
                            ) : (
                              `${hours.toFixed(1)} hrs`
                            )}
                          </td>
                          <td className="px-5 py-4">
                            {isOngoing ? (
                              <span className="text-zinc-400 text-xs">—</span>
                            ) : isBreach ? (
                              <span className="flex items-center gap-1 text-red-600 dark:text-red-400 text-xs font-semibold uppercase tracking-wider">
                                <AlertTriangle size={14} /> Breach ({'>'}9h)
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-semibold uppercase tracking-wider">
                                <CheckCircle2 size={14} /> Compliant
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6">
              <div className="grid grid-cols-7 gap-px bg-zinc-200 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                  <div key={day} className="bg-zinc-50 dark:bg-zinc-950 p-2 text-center text-xs font-semibold text-zinc-500 uppercase">{day}</div>
                ))}
                {/* Mock Calendar Grid */}
                {Array.from({ length: 35 }).map((_, i) => (
                  <div key={i} className="bg-white dark:bg-zinc-900 p-2 h-24 relative hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                    <span className="text-xs text-zinc-400 absolute top-2 left-2">{i > 2 && i < 33 ? i - 2 : ''}</span>
                    {i === 15 && (
                      <div className="absolute top-6 left-1 right-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[10px] p-1 rounded font-medium">
                        3 Shifts (Compliant)
                      </div>
                    )}
                    {i === 18 && (
                      <div className="absolute top-6 left-1 right-1 bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400 text-[10px] p-1 rounded font-medium">
                        1 Breach (M. Johnson)
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Analytics Sidebar */}
        <div className="space-y-6">
          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-xl p-5 shadow-sm text-center">
            <CheckCircle2 size={32} className="text-emerald-500 mx-auto mb-3" />
            <h3 className="font-bold text-emerald-900 dark:text-emerald-500 mb-1">Fleet Compliance</h3>
            <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mb-2">98.2%</p>
            <p className="text-xs text-emerald-700 dark:text-emerald-600">Rolling 30-day average. Above 95% target.</p>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <AlertTriangle size={18} className="text-amber-500" /> Watchlist
              </h3>
            </div>
            <div className="p-5 text-center">
              <p className="text-sm text-zinc-500 mb-4">Drivers approaching daily hour limits.</p>
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-lg flex justify-between items-center">
                <span className="font-medium text-amber-900 dark:text-amber-500 text-sm">Marcus Johnson</span>
                <span className="font-mono font-bold text-amber-700 dark:text-amber-600 text-sm">8h 45m</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
