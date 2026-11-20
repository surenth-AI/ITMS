import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Plus, X, Map, Calendar, User, Truck, ChevronRight, Activity } from 'lucide-react';
import { socketService } from '../services/socket';

interface Shipment {
  id: string;
  reference: string;
  description: string;
  barcode: string;
  status: string;
}

interface Trip {
  id: string;
  reference: string;
  status: string;
  planned_start: string | null;
  driver_name: string;
  vehicle_reg: string;
  shipments?: Shipment[];
}

export default function Trips() {
  const navigate = useNavigate();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    driver_id: '',
    vehicle_id: '',
    planned_start: ''
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [tripsRes, driversRes, vehiclesRes] = await Promise.all([
        api.get('/trips'),
        api.get('/drivers'),
        api.get('/vehicles')
      ]);
      setTrips(tripsRes.data.trips);
      setDrivers(driversRes.data.drivers);
      setVehicles(vehiclesRes.data.vehicles);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    socketService.connect();
    
    const handleStatusUpdate = () => {
      console.log('Received status update, reloading trips...');
      loadData();
    };

    socketService.on('status_update', handleStatusUpdate);

    return () => {
      socketService.off('status_update', handleStatusUpdate);
    };
  }, []);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.post('/trips', formData);
      setIsModalOpen(false);
      setFormData({ driver_id: '', vehicle_id: '', planned_start: '' });
      loadData(); // Refresh the table
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'completed':
        return <span className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2.5 py-0.5 rounded text-xs font-semibold uppercase tracking-wider">Completed</span>;
      case 'in_progress':
        return <span className="bg-blue-500/10 text-blue-500 border border-blue-500/20 px-2.5 py-0.5 rounded text-xs font-semibold uppercase tracking-wider">In Progress</span>;
      case 'scheduled':
        return <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2.5 py-0.5 rounded text-xs font-semibold uppercase tracking-wider">Scheduled</span>;
      default:
        return <span className="bg-zinc-500/10 text-zinc-400 border border-zinc-500/20 px-2.5 py-0.5 rounded text-xs font-semibold uppercase tracking-wider">{status}</span>;
    }
  };

  return (
    <div className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto animate-fade-in relative">
      <header className="flex justify-between items-center z-10">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Trip Management</h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">Dispatch and monitor fleet assignments</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-950 px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 shadow-sm"
        >
          <Plus size={18} />
          Create Trip
        </button>
      </header>

      {/* Data Table */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden z-10 flex-1 flex flex-col shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400 text-xs font-semibold uppercase tracking-wider">
                <th className="p-4 font-medium">Reference</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Driver</th>
                <th className="p-4 font-medium">Vehicle</th>
                <th className="p-4 font-medium">Planned Start</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted animate-pulse">Loading trips...</td>
                </tr>
              ) : trips.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted">No trips found. Create one to get started!</td>
                </tr>
              ) : (
                trips.map((trip) => (
                  <tr key={trip.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <Map size={16} className="text-zinc-400 dark:text-zinc-500" />
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100">{trip.reference}</span>
                      </div>
                    </td>
                    <td className="p-4">{getStatusBadge(trip.status)}</td>
                    <td className="p-4 text-zinc-700 dark:text-zinc-300">{trip.driver_name}</td>
                    <td className="p-4 text-zinc-700 dark:text-zinc-300">{trip.vehicle_reg}</td>
                    <td className="p-4 text-zinc-500 dark:text-zinc-400 text-sm">
                      {trip.planned_start ? new Date(trip.planned_start).toLocaleString() : 'Not Set'}
                    </td>
                    <td className="p-4 text-right flex items-center justify-end gap-2">
                      {trip.status === 'in_progress' && (
                        <button
                          onClick={() => navigate(`/trips/${trip.id}/track`)}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-500 dark:hover:text-blue-400 font-semibold text-sm transition-colors p-2 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/30 opacity-0 group-hover:opacity-100"
                        >
                          Live Track
                        </button>
                      )}
                      <button 
                        onClick={() => navigate(`/trips/${trip.id}`)}
                        className="text-zinc-400 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-zinc-100 transition-colors p-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-700 opacity-0 group-hover:opacity-100"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Trip Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 dark:bg-black/60 animate-fade-in backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-lg border border-zinc-200 dark:border-zinc-800 rounded-xl relative overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-950/50">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Map size={18} className="text-primary" />
                Dispatch New Trip
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-zinc-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreateSubmit} className="p-6 space-y-5">
              
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <User size={14} />
                  Assign Driver
                </label>
                <select 
                  required
                  value={formData.driver_id}
                  onChange={(e) => setFormData({...formData, driver_id: e.target.value})}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-primary transition-all text-sm"
                >
                  <option value="" disabled>Select a driver...</option>
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>{d.name} (Class {d.licence_class})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Truck size={14} />
                  Assign Vehicle
                </label>
                <select 
                  required
                  value={formData.vehicle_id}
                  onChange={(e) => setFormData({...formData, vehicle_id: e.target.value})}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-primary transition-all text-sm"
                >
                  <option value="" disabled>Select a vehicle...</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.registration} ({v.type})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar size={14} />
                  Planned Start Time
                </label>
                <input 
                  type="datetime-local" 
                  required
                  value={formData.planned_start}
                  onChange={(e) => setFormData({...formData, planned_start: e.target.value})}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-primary transition-all text-sm"
                />
              </div>

              <div className="pt-6 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-100 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors text-sm font-semibold"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-950 rounded-lg transition-colors text-sm font-semibold disabled:opacity-50"
                >
                  {submitting ? 'Dispatching...' : 'Create & Dispatch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Trip Details Modal Removed - Now a dedicated page */}
    </div>
  );
}
