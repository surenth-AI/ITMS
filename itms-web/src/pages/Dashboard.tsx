import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { Activity, Truck, AlertTriangle, TrendingUp, Users, BarChart3, Package, Gauge, Fuel, Shield, Clock, Target, Sparkles } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import api from '../services/api';
import { socketService } from '../services/socket';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface ForecastData {
  id: string;
  forecast_for_week: string;
  trips_forecast: number;
  vehicles_required: number;
  drivers_required: number;
  confidence: number;
}

interface KPIData {
  total_trips: number;
  completed_trips: number;
  in_progress_trips: number;
  total_vehicles: number;
  available_vehicles: number;
  maintenance_vehicles: number;
  fleet_utilisation_pct: number;
  total_shipments: number;
  delivered_shipments: number;
  failed_shipments: number;
  total_drivers: number;
  active_alerts: number;
  critical_alerts: number;
  avg_on_time_pct: number;
  avg_driver_score: number;
  total_fuel_cost: number;
  total_litres: number;
}

interface AlertData {
  id: string;
  severity: string;
  type: string;
  message: string;
  created_at: string;
  resolved: boolean;
}

export default function Dashboard() {
  const { user } = useAuthStore();
  const { theme } = useThemeStore();
  const [stats, setStats] = useState({ inProgress: 0, scheduled: 0, completed: 0, draft: 0 });
  const [vehicleLocations, setVehicleLocations] = useState<Record<string, { lat: number, lng: number }>>({});
  const [forecasts, setForecasts] = useState<ForecastData[]>([]);
  const [kpis, setKpis] = useState<KPIData | null>(null);
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [forecasting, setForecasting] = useState(false);

  useEffect(() => {
    socketService.connect();
    const handleLocationUpdate = (data: { vehicle_id: string, lat: number, lng: number }) => {
      setVehicleLocations(prev => ({ ...prev, [data.vehicle_id]: { lat: data.lat, lng: data.lng } }));
    };
    socketService.on('location_update', handleLocationUpdate);
    return () => { socketService.off('location_update', handleLocationUpdate); };
  }, []);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [tripsRes, forecastRes, kpiRes, alertsRes] = await Promise.all([
          api.get('/trips/today'),
          api.get('/forecasts/demand'),
          api.get('/stats/kpi'),
          api.get('/alerts'),
        ]);

        const trips = tripsRes.data.trips;
        const newStats = { inProgress: 0, scheduled: 0, completed: 0, draft: 0 };
        trips.forEach((t: any) => {
          if (t.status === 'in_progress') newStats.inProgress++;
          if (t.status === 'scheduled') newStats.scheduled++;
          if (t.status === 'completed') newStats.completed++;
          if (t.status === 'draft') newStats.draft++;
        });
        setStats(newStats);
        setForecasts(forecastRes.data.forecasts);
        setKpis(kpiRes.data.kpis);
        setAlerts(alertsRes.data.alerts.filter((a: AlertData) => !a.resolved).slice(0, 5));
      } catch (err) {
        console.error("Failed to fetch dashboard data", err);
      }
    };
    fetchAll();
  }, []);

  const handleRunForecast = async () => {
    try {
      setForecasting(true);
      const res = await api.post('/forecasts/demand/generate');
      setForecasts(res.data.forecasts);
    } catch (err) {
      console.error(err);
      alert('Failed to generate forecast');
    } finally {
      setForecasting(false);
    }
  };

  const formatWeek = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
  };

  const timeAgo = (dateStr: string) => {
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
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Command Centre</h1>
          <p className="text-sm text-zinc-500 mt-1">Real-time operations & AI insights</p>
        </div>
        <div className="flex gap-3">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-4 py-2 flex items-center gap-2 rounded-lg shadow-sm">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">System Nominal</span>
          </div>
        </div>
      </header>

      {/* KPI Ribbon */}
      {kpis && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 animate-fade-in" style={{ animationDelay: '0.05s' }}>
          <KPICard icon={<BarChart3 size={16} className="text-blue-500" />} label="Total Trips" value={kpis.total_trips} />
          <KPICard icon={<Activity size={16} className="text-emerald-500" />} label="In Progress" value={kpis.in_progress_trips} color="text-emerald-600 dark:text-emerald-400" />
          <KPICard icon={<Truck size={16} className="text-indigo-500" />} label="Fleet Util." value={`${kpis.fleet_utilisation_pct}%`} color="text-indigo-600 dark:text-indigo-400" />
          <KPICard icon={<Target size={16} className="text-blue-500" />} label="On-Time" value={`${kpis.avg_on_time_pct}%`} color="text-blue-600 dark:text-blue-400" />
          <KPICard icon={<Package size={16} className="text-purple-500" />} label="Shipments" value={kpis.total_shipments} />
          <KPICard icon={<Users size={16} className="text-amber-500" />} label="Drivers" value={kpis.total_drivers} />
          <KPICard icon={<AlertTriangle size={16} className="text-red-500" />} label="Active Alerts" value={kpis.active_alerts} color="text-red-600 dark:text-red-400" />
          <KPICard icon={<Fuel size={16} className="text-zinc-500" />} label="Fuel Cost" value={`€${kpis.total_fuel_cost}`} />
        </div>
      )}

      {/* Main Grid: Map + Alerts + Trips */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 animate-fade-in" style={{ animationDelay: '0.1s' }}>
        {/* Map */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 flex flex-col shadow-sm">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
            <Activity size={18} className="text-primary" />
            Live Fleet Map
          </h3>
          <div className="flex-1 bg-zinc-50 dark:bg-zinc-950 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden relative" style={{ minHeight: 320 }}>
            <MapContainer center={[51.505, -0.09]} zoom={13} style={{ height: '100%', width: '100%', zIndex: 0 }}>
              <TileLayer
                url={theme === 'dark' ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'}
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              />
              {Object.keys(vehicleLocations).length === 0 && (
                <Marker position={[51.505, -0.09]}><Popup>Awaiting Fleet GPS Data...</Popup></Marker>
              )}
              {Object.entries(vehicleLocations).map(([vid, loc]) => (
                <Marker key={vid} position={[loc.lat, loc.lng]}><Popup>Vehicle {vid}<br />Live GPS</Popup></Marker>
              ))}
            </MapContainer>
          </div>
        </div>

        {/* Right Column: Alerts + Trip Board */}
        <div className="flex flex-col gap-6">
          {/* Live Alerts */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 flex-1 shadow-sm">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-500" />
              Active Alerts
              {kpis && kpis.critical_alerts > 0 && (
                <span className="text-xs font-semibold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full">{kpis.critical_alerts} critical</span>
              )}
            </h3>
            <div className="space-y-2.5">
              {alerts.length === 0 ? (
                <div className="text-center py-6"><Shield size={24} className="mx-auto text-zinc-300 dark:text-zinc-700 mb-2" /><p className="text-xs text-zinc-500">No active alerts</p></div>
              ) : (
                alerts.map(a => (
                  <div key={a.id} className={`p-3 rounded-lg border-l-2 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 ${a.severity === 'critical' ? 'border-l-red-500' : a.severity === 'warning' ? 'border-l-amber-500' : 'border-l-blue-500'}`}>
                    <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 line-clamp-2">{a.message}</p>
                    <p className="text-xs text-zinc-500 mt-1.5 font-medium">{timeAgo(a.created_at)}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Trip Board */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Live Trip Board</h3>
            <div className="space-y-2">
              {[
                { label: 'In Progress', value: stats.inProgress, cls: 'bg-blue-500/10 text-blue-600 dark:text-blue-500 border-blue-500/20' },
                { label: 'Scheduled', value: stats.scheduled, cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-500 border-amber-500/20' },
                { label: 'Drafts', value: stats.draft, cls: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20' },
                { label: 'Completed', value: stats.completed, cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 border-emerald-500/20' },
              ].map(row => (
                <div key={row.label} className="flex justify-between items-center p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
                  <span className="text-sm text-zinc-700 dark:text-zinc-300 font-medium">{row.label}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${row.cls}`}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Demand Forecast */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm animate-fade-in" style={{ animationDelay: '0.2s' }}>
        <div className="flex justify-between items-center mb-5">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <TrendingUp size={18} className="text-primary" />
            Capacity & Demand Forecast
            <span className="text-xs font-normal text-zinc-500 ml-2">AI-generated · Rolling 4-week projection</span>
          </h3>
          <button 
            onClick={handleRunForecast} 
            disabled={forecasting}
            className="bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Sparkles size={14} /> {forecasting ? 'Generating...' : 'Run AI Forecast'}
          </button>
        </div>
        {forecasts.length === 0 ? (
          <p className="text-sm text-zinc-500 text-center py-8">No forecast data available.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {forecasts.map(f => (
              <div key={f.id} className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Week of {formatWeek(f.forecast_for_week)}</p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2"><BarChart3 size={14} className="text-blue-500" /><span className="text-xs text-zinc-600 dark:text-zinc-400">Trips</span></div>
                    <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{f.trips_forecast}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2"><Truck size={14} className="text-emerald-500" /><span className="text-xs text-zinc-600 dark:text-zinc-400">Vehicles</span></div>
                    <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{f.vehicles_required}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2"><Users size={14} className="text-amber-500" /><span className="text-xs text-zinc-600 dark:text-zinc-400">Drivers</span></div>
                    <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{f.drivers_required}</span>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-zinc-500">Confidence</span>
                    <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">{Math.round(f.confidence * 100)}%</span>
                  </div>
                  <div className="h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${f.confidence >= 0.85 ? 'bg-emerald-500' : f.confidence >= 0.7 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${f.confidence * 100}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function KPICard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color?: string }) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{label}</span>
      </div>
      <p className={`text-xl font-bold ${color || 'text-zinc-900 dark:text-zinc-100'}`}>{value}</p>
    </div>
  );
}
