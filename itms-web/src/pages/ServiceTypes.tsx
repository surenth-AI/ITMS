import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Plus, X, Tag, RefreshCw, Check, Edit3 } from 'lucide-react';

interface ServiceType {
  id: string;
  name: string;
  code: string;
  description: string | null;
  transit_days_min: number | null;
  transit_days_max: number | null;
  time_definite: boolean;
  requires_appointment: boolean;
  price_basis: string | null;
  base_rate: number | null;
  fuel_surcharge_pct: number;
  is_active: boolean;
  available_on_portal: boolean;
}

const PRICE_BASES = ['per_kg', 'per_m3', 'per_loading_metre', 'fixed', 'per_km'];

const blankForm = {
  name: '', code: '', description: '', transit_days_min: '', transit_days_max: '',
  time_definite: false, requires_appointment: false, price_basis: 'per_kg',
  base_rate: '', fuel_surcharge_pct: '0', available_on_portal: true
};

export default function ServiceTypes() {
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...blankForm });
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get('/service-types');
      setServiceTypes(res.data.service_types);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditId(null);
    setForm({ ...blankForm });
    setShowModal(true);
  };

  const openEdit = (st: ServiceType) => {
    setEditId(st.id);
    setForm({
      name: st.name, code: st.code, description: st.description || '',
      transit_days_min: st.transit_days_min?.toString() || '',
      transit_days_max: st.transit_days_max?.toString() || '',
      time_definite: st.time_definite, requires_appointment: st.requires_appointment,
      price_basis: st.price_basis || 'per_kg',
      base_rate: st.base_rate?.toString() || '',
      fuel_surcharge_pct: st.fuel_surcharge_pct.toString(),
      available_on_portal: st.available_on_portal
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        transit_days_min: form.transit_days_min ? Number(form.transit_days_min) : null,
        transit_days_max: form.transit_days_max ? Number(form.transit_days_max) : null,
        base_rate: form.base_rate ? Number(form.base_rate) : null,
        fuel_surcharge_pct: Number(form.fuel_surcharge_pct)
      };
      if (editId) {
        await api.put(`/service-types/${editId}`, payload);
      } else {
        await api.post('/service-types', payload);
      }
      setShowModal(false);
      load();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (st: ServiceType) => {
    try {
      await api.put(`/service-types/${st.id}`, { is_active: !st.is_active });
      load();
    } catch (err) { console.error(err); }
  };

  return (
    <div className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto animate-fade-in">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Tag size={22} className="text-primary" /> Service Types
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1 text-sm">Commercial service levels — Standard, Express, Economy, Time-Definite, Project</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-2 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={openCreate}
            className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-950 px-4 py-2.5 rounded-lg font-semibold transition-all shadow-sm text-sm">
            <Plus size={16} /> Add Service Type
          </button>
        </div>
      </header>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
                {['Code', 'Name', 'Transit Days', 'Price Basis', 'Base Rate', 'Fuel SC', 'Time-Definite', 'Portal', 'Status', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {loading ? (
                <tr><td colSpan={10} className="p-8 text-center text-zinc-400 animate-pulse">Loading...</td></tr>
              ) : serviceTypes.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-10 text-center">
                    <Tag size={28} className="text-zinc-300 dark:text-zinc-600 mx-auto mb-2" />
                    <p className="text-zinc-500 text-sm">No service types yet. Create one to enable booking.</p>
                  </td>
                </tr>
              ) : serviceTypes.map(st => (
                <tr key={st.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors group">
                  <td className="px-4 py-3">
                    <span className="font-mono font-bold text-sm bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2 py-0.5 rounded">{st.code}</span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">{st.name}</p>
                    {st.description && <p className="text-xs text-zinc-400 mt-0.5 truncate max-w-xs">{st.description}</p>}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">
                    {st.transit_days_min !== null && st.transit_days_max !== null
                      ? `${st.transit_days_min}–${st.transit_days_max} days`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400 capitalize">
                    {st.price_basis?.replace(/_/g, ' ') || '—'}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                    {st.base_rate !== null ? `${st.base_rate.toFixed(2)}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                    {st.fuel_surcharge_pct > 0 ? `+${st.fuel_surcharge_pct}%` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {st.time_definite
                      ? <span className="text-xs font-semibold text-blue-400 flex items-center gap-1"><Check size={11} /> Yes</span>
                      : <span className="text-xs text-zinc-400">No</span>}
                  </td>
                  <td className="px-4 py-3">
                    {st.available_on_portal
                      ? <span className="text-xs font-semibold text-emerald-500 flex items-center gap-1"><Check size={11} /> Yes</span>
                      : <span className="text-xs text-zinc-400">Hidden</span>}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleActive(st)}
                      className={`text-xs font-semibold px-2 py-0.5 rounded border transition-all ${
                        st.is_active
                          ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20'
                          : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20 hover:bg-zinc-500/20'
                      }`}>
                      {st.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => openEdit(st)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg">
                      <Edit3 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-2xl">
            <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
              <h2 className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Tag size={16} className="text-primary" /> {editId ? 'Edit Service Type' : 'New Service Type'}
              </h2>
              <button onClick={() => setShowModal(false)}><X size={18} className="text-zinc-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">Name *</label>
                  <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Standard Road"
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">Code *</label>
                  <input required value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="STD" maxLength={20}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-primary" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">Description</label>
                  <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2}
                    placeholder="Visible to client at booking..."
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">Min Transit Days</label>
                  <input type="number" min={0} value={form.transit_days_min} onChange={e => setForm({ ...form, transit_days_min: e.target.value })}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">Max Transit Days</label>
                  <input type="number" min={0} value={form.transit_days_max} onChange={e => setForm({ ...form, transit_days_max: e.target.value })}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">Price Basis</label>
                  <select value={form.price_basis} onChange={e => setForm({ ...form, price_basis: e.target.value })}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary">
                    {PRICE_BASES.map(p => <option key={p} value={p}>{p.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">Base Rate</label>
                  <input type="number" step="0.01" value={form.base_rate} onChange={e => setForm({ ...form, base_rate: e.target.value })} placeholder="0.00"
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">Fuel Surcharge %</label>
                  <input type="number" step="0.1" value={form.fuel_surcharge_pct} onChange={e => setForm({ ...form, fuel_surcharge_pct: e.target.value })}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary" />
                </div>
                <div className="flex gap-6 col-span-2 mt-1">
                  {[
                    { field: 'time_definite', label: 'Time-Definite Service' },
                    { field: 'requires_appointment', label: 'Requires Appointment' },
                    { field: 'available_on_portal', label: 'Available on Client Portal' },
                  ].map(({ field, label }) => (
                    <label key={field} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={(form as any)[field]} onChange={e => setForm({ ...form, [field]: e.target.checked })}
                        className="w-4 h-4 accent-primary" />
                      <span className="text-zinc-700 dark:text-zinc-300">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 text-sm font-semibold rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all">
                  Cancel
                </button>
                <button type="submit" disabled={submitting}
                  className="flex-1 py-2.5 text-sm font-semibold rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-white transition-all disabled:opacity-50">
                  {submitting ? 'Saving...' : editId ? 'Save Changes' : 'Create Service Type'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
