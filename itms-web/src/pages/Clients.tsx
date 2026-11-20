import React, { useEffect, useState } from 'react';
import { Building, Mail, Globe, ChevronRight, Target, Package, TrendingUp } from 'lucide-react';
import api from '../services/api';

interface Client {
  id: string;
  company_name: string;
  contact_name: string;
  country: string;
  sla_on_time_pct: number;
}

interface ShipmentData {
  id: string;
  reference: string;
  status: string;
  weight_kg: number | null;
  barcode: string | null;
}

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [shipments, setShipments] = useState<ShipmentData[]>([]);

  useEffect(() => { loadClients(); }, []);

  const loadClients = async () => {
    try {
      const response = await api.get('/clients');
      setClients(response.data.clients);
    } catch (e) { console.error(e); }
  };

  const selectClient = async (c: Client) => {
    setSelectedClient(c);
    try {
      const res = await api.get('/shipments');
      setShipments(res.data.shipments.filter((s: any) => s.trip_id)); // show all for now
    } catch (e) { console.error(e); }
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20',
    in_transit: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    delivered: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    failed: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
  };

  return (
    <div className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto">
      <header className="animate-fade-in">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Client Management</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Transport buyers, SLA compliance & shipment history</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 animate-fade-in" style={{ animationDelay: '0.05s' }}>
        {/* Client List */}
        <div className="space-y-3">
          {clients.map(c => (
            <button key={c.id} onClick={() => selectClient(c)}
              className={`w-full text-left bg-white dark:bg-zinc-900 border rounded-xl p-5 shadow-sm transition-all hover:shadow-md ${selectedClient?.id === c.id ? 'border-blue-500 dark:border-blue-400 ring-1 ring-blue-500/20' : 'border-zinc-200 dark:border-zinc-800'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center">
                    <Building size={18} className="text-zinc-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{c.company_name}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">{c.contact_name} · {c.country}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${c.sla_on_time_pct >= 95 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'}`}>
                    {c.sla_on_time_pct}% SLA
                  </span>
                  <ChevronRight size={16} className="text-zinc-400" />
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Client Detail */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {!selectedClient ? (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-12 text-center flex-1 flex flex-col items-center justify-center">
              <Building size={40} className="text-zinc-300 dark:text-zinc-700 mb-4" />
              <p className="text-zinc-500 text-sm">Select a client to view details</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-zinc-100 dark:bg-zinc-800 rounded-xl flex items-center justify-center">
                    <Building size={24} className="text-zinc-600 dark:text-zinc-300" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{selectedClient.company_name}</h2>
                    <p className="text-sm text-zinc-500 mt-0.5">{selectedClient.contact_name} · {selectedClient.country}</p>
                  </div>
                </div>
              </div>

              {/* SLA & Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm text-center">
                  <Target size={18} className="text-emerald-500 mx-auto mb-2" />
                  <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider mb-1">SLA Target</p>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{selectedClient.sla_on_time_pct}%</p>
                </div>
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm text-center">
                  <Package size={18} className="text-blue-500 mx-auto mb-2" />
                  <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider mb-1">Shipments</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{shipments.length}</p>
                </div>
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm text-center">
                  <TrendingUp size={18} className="text-amber-500 mx-auto mb-2" />
                  <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider mb-1">Delivered</p>
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{shipments.filter(s => s.status === 'delivered').length}</p>
                </div>
              </div>

              {/* Shipment History */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden">
                <div className="p-5 border-b border-zinc-200 dark:border-zinc-800">
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Recent Shipments</h3>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
                      <th className="text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider px-5 py-3">Reference</th>
                      <th className="text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider px-5 py-3">Barcode</th>
                      <th className="text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider px-5 py-3">Weight</th>
                      <th className="text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider px-5 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {shipments.length === 0 ? (
                      <tr><td colSpan={4} className="px-5 py-8 text-center text-sm text-zinc-500">No shipments found.</td></tr>
                    ) : (
                      shipments.map(s => (
                        <tr key={s.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                          <td className="px-5 py-3 text-sm font-bold text-zinc-900 dark:text-zinc-100">{s.reference}</td>
                          <td className="px-5 py-3"><span className="text-xs font-mono text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">{s.barcode || '—'}</span></td>
                          <td className="px-5 py-3 text-sm text-zinc-600 dark:text-zinc-400">{s.weight_kg ? `${s.weight_kg} kg` : '—'}</td>
                          <td className="px-5 py-3">
                            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${statusColors[s.status] || statusColors.pending}`}>
                              {s.status === 'in_transit' ? 'In Transit' : s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
