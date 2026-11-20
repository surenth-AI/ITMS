import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Map as MapIcon } from 'lucide-react';
import TripTracker from '../components/TripTracker';
import type { TripTrackingData } from '../components/TripTracker';
import api from '../services/api';

export default function LiveTracking() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<TripTrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [stats, setStats] = useState({
    speed: 0,
    remainingKm: 0,
    etaMins: null as number | null,
    lastPing: new Date()
  });

  useEffect(() => {
    const fetchTrackingData = async () => {
      try {
        const res = await api.get(`/trips/${id}/tracking-data`);
        setData(res.data);
      } catch (err: any) {
        console.error(err);
        setError(err.response?.data?.message || 'Failed to load tracking data.');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchTrackingData();
  }, [id]);

  if (loading) return <div className="p-12 text-center text-zinc-500">Loading tracking data...</div>;
  if (error || !data) return <div className="p-12 text-center text-red-500">{error || 'Data not found.'}</div>;

  return (
    <div className="flex-1 overflow-auto bg-zinc-50 dark:bg-zinc-950 p-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={() => navigate(`/trips/${id}`)}
          className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors text-zinc-500"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-3">
            <MapIcon className="text-blue-500" />
            Live Tracking: {data.vehicle_reg}
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400">Driver: {data.driver_name}</p>
        </div>
      </div>

      {/* Info Bar */}
      <div className="flex flex-wrap gap-4 mb-6">
        {[
          { label: 'Speed', value: `${stats.speed} km/h` },
          { label: 'Distance remaining', value: `${stats.remainingKm} km` },
          { label: 'ETA', value: stats.etaMins !== null ? (stats.etaMins > 60 ? `${Math.floor(stats.etaMins / 60)}h ${stats.etaMins % 60}m` : `${stats.etaMins} min`) : '—' },
          { label: 'Last ping', value: stats.lastPing.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) }
        ].map((item, idx) => (
          <div key={idx} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex-1 min-w-[150px] shadow-sm">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">{item.label}</p>
            <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Map Container */}
      <TripTracker tripData={data} onStatsUpdate={setStats} />
      
    </div>
  );
}
