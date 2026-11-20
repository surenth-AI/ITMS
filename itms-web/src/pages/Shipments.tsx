import React, { useEffect, useState } from 'react';
import { useThemeStore } from '../store/themeStore';
import { Package, Search, Plus, Filter, ChevronRight } from 'lucide-react';
import api from '../services/api';

interface ShipmentData {
  id: string;
  reference: string;
  status: string;
  weight_kg: number | null;
  trip_id: string | null;
  barcode: string | null;
}

const statusColors: Record<string, string> = {
  pending: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20',
  at_warehouse: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  picked_up: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
  in_transit: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  out_for_delivery: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  delivered: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  failed: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
  returned: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
};

const timelineStages = ['pending', 'picked_up', 'in_transit', 'delivered'];
const getStageIndex = (status: string) => {
  if (status === 'delivered') return 3;
  if (status === 'out_for_delivery' || status === 'in_transit') return 2;
  if (status === 'picked_up' || status === 'at_warehouse') return 1;
  return 0; // pending, failed, returned
};

export default function Shipments() {
  const { theme } = useThemeStore();
  const [shipments, setShipments] = useState<ShipmentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState({ description: '', weight_kg: '', barcode: '' });

  const fetchShipments = async () => {
    try {
      const res = await api.get('/shipments');
      setShipments(res.data.shipments);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchShipments(); }, []);

  const createShipment = async () => {
    try {
      await api.post('/shipments', {
        description: form.description,
        weight_kg: parseFloat(form.weight_kg) || null,
        barcode: form.barcode || undefined,
      });
      setShowCreate(false);
      setForm({ description: '', weight_kg: '', barcode: '' });
      fetchShipments();
    } catch (err) { console.error(err); }
  };

  const filtered = shipments.filter(s => {
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
    if (search && !s.reference.toLowerCase().includes(search.toLowerCase()) && !(s.barcode || '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto">
      <header className="flex justify-between items-center animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Shipment Tracking</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Cargo lifecycle from pickup to delivery</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className="flex items-center gap-2 px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
          <Plus size={16} /> New Shipment
        </button>
      </header>

      {/* Create Form */}
      {showCreate && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm animate-fade-in">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Create Shipment</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input type="text" placeholder="Description" value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="px-4 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500" />
            <input type="number" placeholder="Weight (kg)" value={form.weight_kg} onChange={e => setForm({...form, weight_kg: e.target.value})} className="px-4 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500" />
            <input type="text" placeholder="Barcode (optional)" value={form.barcode} onChange={e => setForm({...form, barcode: e.target.value})} className="px-4 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={createShipment} className="px-5 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-sm font-medium hover:opacity-90">Create</button>
            <button onClick={() => setShowCreate(false)} className="px-5 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-lg text-sm font-medium hover:opacity-90">Cancel</button>
          </div>
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex gap-3 items-center flex-wrap animate-fade-in" style={{ animationDelay: '0.05s' }}>
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input type="text" placeholder="Search by reference or barcode…" value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500" />
        </div>
        {['all', 'pending', 'in_transit', 'delivered', 'failed'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${statusFilter === s ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100' : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800'}`}>
            {s === 'all' ? 'All' : s === 'in_transit' ? 'In Transit' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Shipment Table */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden animate-fade-in" style={{ animationDelay: '0.1s' }}>
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
              <th className="text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider px-5 py-3">Reference</th>
              <th className="text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider px-5 py-3">Barcode</th>
              <th className="text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider px-5 py-3">Weight</th>
              <th className="text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider px-5 py-3">Status</th>
              <th className="text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider px-5 py-3">Trip</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {loading ? (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-zinc-500">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-zinc-500">No shipments found.</td></tr>
            ) : (
              filtered.map(s => {
                const currentStageIndex = getStageIndex(s.status);
                const isExpanded = expandedId === s.id;
                
                return (
                  <React.Fragment key={s.id}>
                    <tr 
                      className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : s.id)}
                    >
                      <td className="px-5 py-3.5 flex items-center gap-2">
                        <ChevronRight size={16} className={`text-zinc-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                        <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{s.reference}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs font-mono text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">{s.barcode || '—'}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-sm text-zinc-600 dark:text-zinc-400">{s.weight_kg ? `${s.weight_kg} kg` : '—'}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${statusColors[s.status] || statusColors.pending}`}>
                          {s.status === 'in_transit' ? 'In Transit' : s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs text-zinc-500">{s.trip_id ? 'Assigned' : 'Unassigned'}</span>
                      </td>
                    </tr>
                    
                    {isExpanded && (
                      <tr className="bg-zinc-50 dark:bg-zinc-950/30">
                        <td colSpan={5} className="px-10 py-5">
                          <div className="flex items-center justify-between relative">
                            {/* Line connecting stages */}
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-zinc-200 dark:bg-zinc-800 z-0"></div>
                            
                            {timelineStages.map((stage, idx) => {
                              const isActive = idx <= currentStageIndex;
                              const isCurrent = idx === currentStageIndex;
                              
                              return (
                                <div key={stage} className="relative z-10 flex flex-col items-center gap-2 bg-zinc-50 dark:bg-zinc-950/30 px-2">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${isActive ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-400'} ${isCurrent ? 'ring-4 ring-emerald-500/20' : ''}`}>
                                    <Package size={14} />
                                  </div>
                                  <span className={`text-xs font-semibold ${isActive ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400'}`}>
                                    {stage.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
