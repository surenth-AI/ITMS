import React, { useEffect, useState } from 'react';
import { useThemeStore } from '../store/themeStore';
import { Truck, Wrench, AlertTriangle, Activity, Cpu, ChevronRight, Shield, Gauge } from 'lucide-react';
import api from '../services/api';

interface MaintenanceRecord {
  id: string;
  type: string;
  next_service_km: number | null;
  next_service_date: string | null;
  status: string;
  ai_recommended: boolean;
}

interface AIFlag {
  id: string;
  prediction_label: string;
  confidence: number;
}

interface VehicleData {
  id: string;
  registration: string;
  type: string;
  odometer_km: number;
  status: string;
  maintenance_records: MaintenanceRecord[];
  ai_flags: AIFlag[];
}

const statusColor: Record<string, string> = {
  available: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  in_trip: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  idle: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  maintenance: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
  retired: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20',
};

const maintTypeIcon: Record<string, string> = {
  routine: '🔧',
  brake: '🛑',
  tyre: '🛞',
  engine: '⚙️',
  inspection: '📋',
  electrical: '⚡',
  bodywork: '',
  other: '🔩',
};

export default function Vehicles() {
  const { theme } = useThemeStore();
  const [vehicles, setVehicles] = useState<VehicleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleData | null>(null);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/vehicles/maintenance');
        setVehicles(res.data.vehicles);
      } catch (err) {
        console.error('Failed to fetch fleet data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filtered = filter === 'all' ? vehicles : vehicles.filter(v => v.status === filter);
  const totalAiFlags = vehicles.reduce((sum, v) => sum + v.ai_flags.length, 0);
  const totalMaintDue = vehicles.reduce((sum, v) => sum + v.maintenance_records.filter(m => m.status === 'scheduled' || m.status === 'in_progress').length, 0);

  return (
    <div className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto">
      {/* Header */}
      <header className="flex justify-between items-center animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Fleet Management</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Vehicle status, maintenance schedules & AI diagnostics</p>
        </div>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in" style={{ animationDelay: '0.05s' }}>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <Truck size={18} className="text-zinc-400" />
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Total Fleet</span>
          </div>
          <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{vehicles.length}</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <Activity size={18} className="text-emerald-500" />
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Active</span>
          </div>
          <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{vehicles.filter(v => v.status === 'available' || v.status === 'in_trip').length}</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <Wrench size={18} className="text-amber-500" />
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Maintenance Due</span>
          </div>
          <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{totalMaintDue}</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <Cpu size={18} className="text-purple-500" />
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">AI Flags</span>
          </div>
          <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{totalAiFlags}</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 animate-fade-in" style={{ animationDelay: '0.1s' }}>
        {['all', 'available', 'in_trip', 'maintenance'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${filter === f
                ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100'
                : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800'
              }`}
          >
            {f === 'all' ? 'All Vehicles' : f === 'in_trip' ? 'In Trip' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 animate-fade-in" style={{ animationDelay: '0.15s' }}>
        {/* Vehicle List */}
        <div className="lg:col-span-1 flex flex-col gap-3">
          {loading ? (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-8 text-center">
              <p className="text-sm text-zinc-500">Loading fleet data…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-8 text-center">
              <p className="text-sm text-zinc-500">No vehicles match this filter.</p>
            </div>
          ) : (
            filtered.map(v => (
              <button
                key={v.id}
                onClick={() => setSelectedVehicle(v)}
                className={`w-full text-left bg-white dark:bg-zinc-900 border rounded-xl p-4 shadow-sm transition-all hover:shadow-md ${selectedVehicle?.id === v.id
                    ? 'border-blue-500 dark:border-blue-400 ring-1 ring-blue-500/20'
                    : 'border-zinc-200 dark:border-zinc-800'
                  }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center">
                      <Truck size={18} className="text-zinc-500 dark:text-zinc-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{v.registration}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">{v.type} · {v.odometer_km?.toLocaleString() ?? '—'} km</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {v.ai_flags.length > 0 && (
                      <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" title="AI Flag" />
                    )}
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${statusColor[v.status] || statusColor.available}`}>
                      {v.status === 'in_trip' ? 'In Trip' : v.status.charAt(0).toUpperCase() + v.status.slice(1)}
                    </span>
                    <ChevronRight size={16} className="text-zinc-400" />
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Detail Panel */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {!selectedVehicle ? (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-12 text-center flex-1 flex flex-col items-center justify-center">
              <Truck size={40} className="text-zinc-300 dark:text-zinc-700 mb-4" />
              <p className="text-zinc-500 text-sm">Select a vehicle to view maintenance history and AI diagnostics</p>
            </div>
          ) : (
            <>
              {/* Vehicle Header */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-zinc-100 dark:bg-zinc-800 rounded-xl flex items-center justify-center">
                      <Truck size={24} className="text-zinc-600 dark:text-zinc-300" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{selectedVehicle.registration}</h2>
                      <p className="text-sm text-zinc-500 mt-0.5">{selectedVehicle.type} · Odometer: {selectedVehicle.odometer_km?.toLocaleString() ?? '—'} km</p>
                    </div>
                  </div>
                  <span className={`text-sm font-semibold px-3 py-1 rounded-full border ${statusColor[selectedVehicle.status] || statusColor.available}`}>
                    {selectedVehicle.status === 'in_trip' ? 'In Trip' : selectedVehicle.status.charAt(0).toUpperCase() + selectedVehicle.status.slice(1)}
                  </span>
                </div>
              </div>

              {/* AI Flags */}
              {selectedVehicle.ai_flags.length > 0 && (
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
                    <Cpu size={18} className="text-purple-500" />
                    AI Predictive Diagnostics
                  </h3>
                  <div className="space-y-3">
                    {selectedVehicle.ai_flags.map(flag => (
                      <div key={flag.id} className="bg-purple-50 dark:bg-purple-500/5 border border-purple-200 dark:border-purple-500/20 rounded-lg p-4 flex items-start gap-3">
                        <AlertTriangle size={18} className="text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-purple-900 dark:text-purple-200">{flag.prediction_label}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <div className="flex-1 h-1.5 bg-purple-200 dark:bg-purple-800 rounded-full overflow-hidden">
                              <div className="h-full bg-purple-500 rounded-full" style={{ width: `${flag.confidence * 100}%` }} />
                            </div>
                            <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">{Math.round(flag.confidence * 100)}% confidence</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Maintenance History */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
                  <Wrench size={18} className="text-amber-500" />
                  Maintenance Schedule
                </h3>
                {selectedVehicle.maintenance_records.length === 0 ? (
                  <div className="text-center py-8">
                    <Shield size={32} className="text-zinc-300 dark:text-zinc-700 mx-auto mb-2" />
                    <p className="text-sm text-zinc-500">No maintenance records yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedVehicle.maintenance_records.map(m => {
                      const isMaintStatusActive = m.status === 'scheduled' || m.status === 'in_progress';
                      return (
                        <div key={m.id} className={`border rounded-lg p-4 ${m.ai_recommended
                            ? 'border-purple-200 dark:border-purple-500/20 bg-purple-50/50 dark:bg-purple-500/5'
                            : isMaintStatusActive
                              ? 'border-amber-200 dark:border-amber-500/20 bg-amber-50/50 dark:bg-amber-500/5'
                              : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950'
                          }`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-lg">{maintTypeIcon[m.type] || '🔩'}</span>
                              <div>
                                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 capitalize">{m.type} Service</p>
                                <div className="flex items-center gap-3 mt-1">
                                  {m.next_service_km && (
                                    <span className="text-xs text-zinc-500 flex items-center gap-1">
                                      <Gauge size={12} /> {m.next_service_km.toLocaleString()} km
                                    </span>
                                  )}
                                  {m.next_service_date && (
                                    <span className="text-xs text-zinc-500">{m.next_service_date}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {m.ai_recommended && (
                                <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-500/20">
                                  AI Flagged
                                </span>
                              )}
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${m.status === 'completed'
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                  : m.status === 'in_progress'
                                    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                                }`}>
                                {m.status === 'in_progress' ? 'In Progress' : m.status.charAt(0).toUpperCase() + m.status.slice(1)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
