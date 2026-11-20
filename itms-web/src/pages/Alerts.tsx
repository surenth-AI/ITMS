import React, { useEffect, useState } from 'react';
import { useThemeStore } from '../store/themeStore';
import { AlertTriangle, CheckCircle, Clock, Shield, Filter } from 'lucide-react';
import api from '../services/api';

interface AlertData {
  id: string;
  entity_type: string;
  entity_id: string;
  type: string;
  severity: string;
  message: string;
  resolved: boolean;
  resolved_at: string | null;
  created_at: string | null;
}

const severityConfig: Record<string, { color: string; bg: string; border: string }> = {
  critical: { color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-500/5', border: 'border-l-red-500' },
  warning: { color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/5', border: 'border-l-amber-500' },
  info: { color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-500/5', border: 'border-l-blue-500' },
};

const typeLabels: Record<string, string> = {
  engine_warning: 'Engine Warning',
  idle_excess: 'Idle Excess',
  licence_expiry: 'Licence Expiry',
  maintenance_due: 'Maintenance Due',
  delay: 'Trip Delay',
  fuel_anomaly: 'Fuel Anomaly',
  geofence: 'Geofence Breach',
  driver_hours: 'Driver Hours',
};

export default function Alerts() {
  const { theme } = useThemeStore();
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'resolved'>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');

  const fetchAlerts = async () => {
    try {
      const res = await api.get('/alerts');
      setAlerts(res.data.alerts);
    } catch (err) {
      console.error('Failed to fetch alerts', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAlerts(); }, []);

  const resolveAlert = async (id: string) => {
    try {
      await api.post(`/alerts/${id}/resolve`);
      fetchAlerts();
    } catch (err) {
      console.error('Failed to resolve alert', err);
    }
  };

  const filtered = alerts.filter(a => {
    if (filter === 'active' && a.resolved) return false;
    if (filter === 'resolved' && !a.resolved) return false;
    if (severityFilter !== 'all' && a.severity !== severityFilter) return false;
    return true;
  });

  const activeCount = alerts.filter(a => !a.resolved).length;
  const criticalCount = alerts.filter(a => !a.resolved && a.severity === 'critical').length;

  const timeAgo = (dateStr: string | null) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto">
      <header className="flex justify-between items-center animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Alert Centre</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">System-generated warnings and exceptions</p>
        </div>
        <div className="flex gap-3">
          <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 px-4 py-2 rounded-lg">
            <span className="text-xs font-medium text-red-600 dark:text-red-400">{criticalCount} Critical</span>
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-4 py-2 rounded-lg">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{activeCount} Active</span>
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap animate-fade-in" style={{ animationDelay: '0.05s' }}>
        {(['all', 'active', 'resolved'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${filter === f ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100' : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
        <div className="w-px bg-zinc-200 dark:bg-zinc-800 mx-1" />
        {['all', 'critical', 'warning', 'info'].map(s => (
          <button key={s} onClick={() => setSeverityFilter(s)}
            className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${severityFilter === s ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100' : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}>
            {s === 'all' ? 'All Severity' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Alert List */}
      <div className="space-y-3 animate-fade-in" style={{ animationDelay: '0.1s' }}>
        {loading ? (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-12 text-center">
            <p className="text-sm text-zinc-500">Loading alerts…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-12 text-center">
            <Shield size={32} className="text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
            <p className="text-sm text-zinc-500">No alerts match this filter.</p>
          </div>
        ) : (
          filtered.map(a => {
            const cfg = severityConfig[a.severity] || severityConfig.info;
            return (
              <div key={a.id} className={`bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 border-l-4 ${cfg.border} rounded-xl p-5 shadow-sm flex items-start justify-between gap-4 ${a.resolved ? 'opacity-60' : ''}`}>
                <div className="flex items-start gap-4 flex-1">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                    <AlertTriangle size={18} className={cfg.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-semibold uppercase tracking-wider ${cfg.color}`}>{a.severity}</span>
                      <span className="text-xs text-zinc-400">·</span>
                      <span className="text-xs font-medium text-zinc-500">{typeLabels[a.type] || a.type}</span>
                      <span className="text-xs text-zinc-400">·</span>
                      <span className="text-xs text-zinc-400">{a.entity_type}</span>
                    </div>
                    <p className="text-sm text-zinc-800 dark:text-zinc-200 font-medium">{a.message}</p>
                    <p className="text-xs text-zinc-500 mt-2">{timeAgo(a.created_at)}</p>
                  </div>
                </div>
                {!a.resolved ? (
                  <button onClick={() => resolveAlert(a.id)} className="px-4 py-2 text-xs font-semibold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors flex-shrink-0">
                    Resolve
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                    <CheckCircle size={14} />
                    Resolved
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
