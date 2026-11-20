import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import { Map, Clock, Truck, User, ArrowLeft, Activity, ShieldAlert, Package, CheckCircle2, Sparkles } from 'lucide-react';
import api from '../services/api';

interface Waypoint {
  lat: number;
  lng: number;
  name: string;
}

interface RouteData {
  id: string;
  source: string;
  total_distance_km: number;
  estimated_duration_min: number;
  waypoints: Waypoint[];
}

interface Shipment {
  id: string;
  reference: string;
  description: string;
  barcode: string;
  status: string;
  weight_kg: number;
}

interface Alert {
  id: string;
  type: string;
  severity: string;
  message: string;
}

interface TripDetailData {
  id: string;
  reference: string;
  status: string;
  planned_start: string | null;
  actual_start: string | null;
  actual_end: string | null;
  driver_name: string;
  vehicle_reg: string;
  shipments: Shipment[];
  route: RouteData | null;
  alerts: Alert[];
}

export default function TripDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState<TripDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);

  useEffect(() => {
    const fetchTrip = async () => {
      try {
        const res = await api.get(`/trips/${id}`);
        setTrip(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchTrip();
  }, [id]);

  const handleOptimize = async () => {
    if (!id) return;
    try {
      setOptimizing(true);
      const res = await api.post(`/trips/${id}/optimize`);
      // Update local state with new route
      setTrip(prev => prev ? { ...prev, route: res.data.route } : null);
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to optimize route');
    } finally {
      setOptimizing(false);
    }
  };

  if (loading) {
    return <div className="flex-1 p-12 flex justify-center"><p className="text-zinc-500">Loading trip details...</p></div>;
  }

  if (!trip) {
    return <div className="flex-1 p-12 flex justify-center"><p className="text-red-500">Trip not found.</p></div>;
  }

  const formatTime = (iso: string | null) => {
    if (!iso) return 'Not Set';
    return new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
  };

  const getStatusColor = (s: string) => {
    if (s === 'completed') return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
    if (s === 'in_progress') return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
    if (s === 'scheduled') return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
    return 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20';
  };

  const positions: [number, number][] = trip.route?.waypoints.map(w => [w.lat, w.lng]) || [];
  const mapCenter: [number, number] = positions.length > 0 ? positions[0] : [51.505, -0.09];

  return (
    <div className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto">
      <header className="flex items-center gap-4 animate-fade-in">
        <button onClick={() => navigate('/trips')} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-500 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-3">
            Trip {trip.reference}
            <span className={`text-xs px-2.5 py-0.5 rounded-full border uppercase tracking-wider font-semibold ${getStatusColor(trip.status)}`}>
              {trip.status.replace('_', ' ')}
            </span>
          </h1>
          <p className="text-sm text-zinc-500 mt-1">Detailed manifest and route timeline</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in" style={{ animationDelay: '0.05s' }}>
        
        {/* Left Column: Details & Timeline */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Main Info */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800">
              <span className="flex items-center gap-2 text-sm font-semibold text-zinc-500 uppercase tracking-wider"><User size={16} /> Driver</span>
              <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{trip.driver_name}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800">
              <span className="flex items-center gap-2 text-sm font-semibold text-zinc-500 uppercase tracking-wider"><Truck size={16} /> Vehicle</span>
              <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{trip.vehicle_reg}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800">
              <span className="flex items-center gap-2 text-sm font-semibold text-zinc-500 uppercase tracking-wider"><Clock size={16} /> Planned</span>
              <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{formatTime(trip.planned_start)}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800">
              <span className="flex items-center gap-2 text-sm font-semibold text-zinc-500 uppercase tracking-wider"><Clock size={16} /> Actual Start</span>
              <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{formatTime(trip.actual_start)}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="flex items-center gap-2 text-sm font-semibold text-zinc-500 uppercase tracking-wider"><CheckCircle2 size={16} /> Actual End</span>
              <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{formatTime(trip.actual_end)}</span>
            </div>
          </div>

          {/* AI Alerts */}
          {trip.alerts.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl p-5 shadow-sm space-y-3">
              <h3 className="font-bold text-amber-900 dark:text-amber-500 flex items-center gap-2">
                <ShieldAlert size={18} /> Active Trip Alerts
              </h3>
              {trip.alerts.map(a => (
                <div key={a.id} className="p-3 bg-white/60 dark:bg-zinc-900/50 rounded-lg border border-amber-100 dark:border-amber-900/30">
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-200">{a.message}</p>
                </div>
              ))}
            </div>
          )}

          {/* Shipments List */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex items-center gap-2">
              <Package size={18} className="text-zinc-500" />
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Shipment Manifest ({trip.shipments.length})</h3>
            </div>
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {trip.shipments.length === 0 ? (
                <p className="p-6 text-center text-sm text-zinc-500">No shipments attached.</p>
              ) : (
                trip.shipments.map(s => (
                  <div key={s.id} className="p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <div className="flex justify-between items-start mb-1">
                      <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{s.reference}</p>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${getStatusColor(s.status)}`}>{s.status}</span>
                    </div>
                    <p className="text-xs text-zinc-500 mb-2">{s.description}</p>
                    <div className="flex gap-4">
                      <span className="text-xs font-mono bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-600 dark:text-zinc-400">{s.barcode || 'NO-BARCODE'}</span>
                      <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{s.weight_kg ? `${s.weight_kg} kg` : ''}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Map & Route */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm flex flex-col overflow-hidden" style={{ minHeight: 500 }}>
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-950">
              <div className="flex items-center gap-4">
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Map size={18} className="text-primary" /> Route Plan
                </h3>
                <button 
                  onClick={handleOptimize} 
                  disabled={optimizing || trip.shipments.length === 0}
                  className="bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <Sparkles size={14} /> {optimizing ? 'Optimizing...' : 'Run AI Route'}
                </button>
              </div>
              {trip.route && (
                <div className="flex gap-4 text-sm font-medium text-zinc-600 dark:text-zinc-400">
                  <span>{trip.route.total_distance_km} km</span>
                  <span>{Math.floor(trip.route.estimated_duration_min / 60)}h {trip.route.estimated_duration_min % 60}m</span>
                  <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 rounded text-xs uppercase tracking-wider">{trip.route.source.replace('_', ' ')}</span>
                </div>
              )}
            </div>
            <div className="flex-1 relative z-0">
              {trip.route ? (
                <MapContainer center={mapCenter} zoom={6} style={{ height: '100%', width: '100%' }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  {trip.route.waypoints.map((w, i) => (
                    <Marker key={i} position={[w.lat, w.lng]}>
                      <Popup><strong>Stop {i+1}</strong><br/>{w.name}</Popup>
                    </Marker>
                  ))}
                  {positions.length > 1 && <Polyline positions={positions} color="#3b82f6" weight={4} opacity={0.7} />}
                </MapContainer>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950/50">
                  <Map size={48} className="text-zinc-300 dark:text-zinc-700 mb-4" />
                  <p className="text-zinc-500 font-medium">No route planned for this trip.</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
