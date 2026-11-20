import React, { useEffect, useState } from 'react';
import { useThemeStore } from '../store/themeStore';
import { Building, Calendar, Clock, ChevronRight } from 'lucide-react';
import api from '../services/api';

interface DockSlotData {
  id: string;
  dock_number: number;
  slot_start: string | null;
  slot_end: string | null;
  status: string;
  trip_id: string | null;
}

interface WarehouseData {
  id: string;
  name: string;
  address: string;
  total_docks: number;
  status: string;
  dock_slots: DockSlotData[];
}

const slotColors: Record<string, string> = {
  available: 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20',
  booked: 'bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20',
  in_use: 'bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20',
  completed: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700',
  blocked: 'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20',
};

export default function Warehouses() {
  const { theme } = useThemeStore();
  const [warehouses, setWarehouses] = useState<WarehouseData[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<WarehouseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingSlot, setBookingSlot] = useState<DockSlotData | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/warehouses');
        setWarehouses(res.data.warehouses);
        if (res.data.warehouses.length > 0) setSelectedWarehouse(res.data.warehouses[0]);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const formatTime = (iso: string | null) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  // Build dock grid: group slots by dock_number
  const buildGrid = (wh: WarehouseData) => {
    const docks: Record<number, DockSlotData[]> = {};
    wh.dock_slots.forEach(s => {
      if (!docks[s.dock_number]) docks[s.dock_number] = [];
      docks[s.dock_number].push(s);
    });
    return docks;
  };

  return (
    <div className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto">
      <header className="flex justify-between items-center animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Warehouse Management</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Dock scheduling and warehouse operations</p>
        </div>
      </header>

      {/* Warehouse Selector */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in" style={{ animationDelay: '0.05s' }}>
        {warehouses.map(wh => (
          <button key={wh.id} onClick={() => setSelectedWarehouse(wh)}
            className={`text-left bg-white dark:bg-zinc-900 border rounded-xl p-5 shadow-sm transition-all hover:shadow-md ${selectedWarehouse?.id === wh.id ? 'border-blue-500 dark:border-blue-400 ring-1 ring-blue-500/20' : 'border-zinc-200 dark:border-zinc-800'}`}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center">
                <Building size={18} className="text-zinc-500 dark:text-zinc-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{wh.name}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{wh.total_docks} docks</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${wh.status === 'active' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20'}`}>
                {wh.status.charAt(0).toUpperCase() + wh.status.slice(1)}
              </span>
              <span className="text-xs text-zinc-400">{wh.dock_slots.length} slots</span>
            </div>
          </button>
        ))}
      </div>

      {/* Dock Slot Grid */}
      {selectedWarehouse && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-5 flex items-center gap-2">
            <Calendar size={18} className="text-primary" />
            Dock Schedule — {selectedWarehouse.name}
          </h3>

          {selectedWarehouse.dock_slots.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-8">No dock slots configured for this warehouse.</p>
          ) : (
            <div className="space-y-4">
              {Object.entries(buildGrid(selectedWarehouse)).sort(([a], [b]) => Number(a) - Number(b)).map(([dockNum, slots]) => (
                <div key={dockNum}>
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Dock {dockNum}</p>
                  <div className="flex gap-2 flex-wrap">
                    {slots.map(slot => (
                      <button 
                        key={slot.id} 
                        onClick={() => slot.status === 'available' ? setBookingSlot(slot) : null}
                        disabled={slot.status !== 'available'}
                        className={`px-4 py-3 rounded-lg border text-center min-w-[140px] transition-transform ${slot.status === 'available' ? 'hover:scale-105 cursor-pointer' : 'opacity-70 cursor-not-allowed'} ${slotColors[slot.status] || slotColors.available}`}
                      >
                        <div className="flex items-center gap-1.5 justify-center mb-1">
                          <Clock size={12} />
                          <span className="text-xs font-bold">{formatTime(slot.slot_start)} – {formatTime(slot.slot_end)}</span>
                        </div>
                        <p className="text-xs font-semibold capitalize">{slot.status}</p>
                        {slot.trip_id && <p className="text-xs mt-0.5 opacity-75">Trip assigned</p>}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Legend */}
          <div className="flex gap-4 mt-6 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            {Object.entries(slotColors).map(([status, cls]) => (
              <div key={status} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded border ${cls}`} />
                <span className="text-xs text-zinc-500 capitalize">{status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Booking Modal */}
      {bookingSlot && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-xl max-w-md w-full p-6 border border-zinc-200 dark:border-zinc-800 shadow-xl">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Book Dock Slot</h2>
            <p className="text-sm text-zinc-500 mb-6">Confirm booking for Dock {bookingSlot.dock_number} at {formatTime(bookingSlot.slot_start)}.</p>
            
            <div className="flex justify-end gap-3">
              <button onClick={() => setBookingSlot(null)} className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg">Cancel</button>
              <button 
                onClick={() => {
                  alert(`Mock Booking Confirmed for Slot ${bookingSlot.id}`);
                  setBookingSlot(null);
                }} 
                className="px-4 py-2 text-sm font-bold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
              >
                Confirm Booking
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
