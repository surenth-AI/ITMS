import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
  Plus, BookOpen, Filter, Search, ChevronRight, ArrowRight,
  Package, CheckCircle, Clock, Truck, XCircle, AlertTriangle,
  RefreshCw, TrendingUp, DollarSign, Calendar
} from 'lucide-react';

interface Booking {
  id: string;
  reference: string;
  status: string;
  priority: string;
  booking_source: string;
  client_name: string;
  service_type: string | null;
  service_type_code: string | null;
  pickup_location: string | null;
  pickup_city: string | null;
  delivery_location: string | null;
  delivery_city: string | null;
  pickup_requested_date: string | null;
  delivery_requested_date: string | null;
  total_weight_kg: number;
  agreed_price: number | null;
  currency: string;
  cargo_line_count: number;
  customer_reference: string | null;
  requires_manual_pricing: boolean;
  created_at: string;
}

interface Stats {
  total: number;
  draft: number;
  pending: number;
  confirmed: number;
  allocated: number;
  in_progress: number;
  completed: number;
  cancelled: number;
}

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  draft:                { label: 'Draft',             cls: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' },
  pending_confirmation: { label: 'Pending',           cls: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  confirmed:            { label: 'Confirmed',         cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  allocated:            { label: 'Allocated',         cls: 'bg-violet-500/10 text-violet-400 border-violet-500/20' },
  in_progress:          { label: 'In Progress',       cls: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
  completed:            { label: 'Completed',         cls: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  cancelled:            { label: 'Cancelled',         cls: 'bg-red-500/10 text-red-400 border-red-500/20' },
  failed:               { label: 'Failed',            cls: 'bg-red-700/10 text-red-600 border-red-700/20' },
};

const PRIORITY_CONFIG: Record<string, { label: string; dot: string }> = {
  standard: { label: 'Standard', dot: 'bg-zinc-400' },
  urgent:   { label: 'Urgent',   dot: 'bg-amber-400' },
  critical: { label: 'Critical', dot: 'bg-red-500' },
};

const SOURCE_ICONS: Record<string, string> = {
  web_portal: '🌐', edi: '⚡', email: '📧', phone: '📞', api: '🔌', internal: '🏢',
};

export default function Bookings() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, draft: 0, pending: 0, confirmed: 0, allocated: 0, in_progress: 0, completed: 0, cancelled: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (filterStatus) params.status = filterStatus;
      if (filterPriority) params.priority = filterPriority;
      const res = await api.get('/bookings', { params });
      setBookings(res.data.bookings);
      setStats(res.data.stats);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [filterStatus, filterPriority]);

  const filtered = bookings.filter(b => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      b.reference.toLowerCase().includes(q) ||
      (b.client_name || '').toLowerCase().includes(q) ||
      (b.customer_reference || '').toLowerCase().includes(q) ||
      (b.pickup_city || '').toLowerCase().includes(q) ||
      (b.delivery_city || '').toLowerCase().includes(q)
    );
  });

  const getStatusBadge = (status: string) => {
    const cfg = STATUS_CONFIG[status] || { label: status, cls: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' };
    return (
      <span className={`px-2.5 py-0.5 rounded text-xs font-semibold uppercase tracking-wider border ${cfg.cls}`}>
        {cfg.label}
      </span>
    );
  };

  const getPriorityDot = (priority: string) => {
    const cfg = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.standard;
    return (
      <span className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
        <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
        {cfg.label}
      </span>
    );
  };

  const kpis = [
    { label: 'Total Bookings', value: stats.total, icon: BookOpen, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Pending Confirm.', value: stats.pending, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { label: 'Confirmed', value: stats.confirmed, icon: CheckCircle, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Allocated', value: stats.allocated, icon: Truck, color: 'text-violet-400', bg: 'bg-violet-500/10' },
    { label: 'In Progress', value: stats.in_progress, icon: TrendingUp, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    { label: 'Completed', value: stats.completed, icon: Package, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  ];

  return (
    <div className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto animate-fade-in">
      {/* Header */}
      <header className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <BookOpen size={22} className="text-primary" />
            Booking Management
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1 text-sm">
            Transport requests — the commercial front door of every shipment
          </p>
        </div>
        <button
          onClick={() => navigate('/bookings/new')}
          className="bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-950 px-4 py-2.5 rounded-lg font-semibold transition-all flex items-center gap-2 shadow-sm hover:shadow-md"
        >
          <Plus size={18} />
          New Booking
        </button>
      </header>

      {/* KPI Strip */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map(kpi => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col gap-2 shadow-sm">
              <div className={`w-8 h-8 rounded-lg ${kpi.bg} flex items-center justify-center`}>
                <Icon size={16} className={kpi.color} />
              </div>
              <div>
                <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{kpi.value}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{kpi.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search reference, client, city..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-primary transition-all"
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:border-primary transition-all"
        >
          <option value="">All Statuses</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <select
          value={filterPriority}
          onChange={e => setFilterPriority(e.target.value)}
          className="text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:border-primary transition-all"
        >
          <option value="">All Priorities</option>
          <option value="standard">Standard</option>
          <option value="urgent">Urgent</option>
          <option value="critical">Critical</option>
        </select>
        <button
          onClick={loadData}
          className="flex items-center gap-1.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm flex-1 flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
                <th className="p-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Reference</th>
                <th className="p-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Client</th>
                <th className="p-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Route</th>
                <th className="p-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Dates</th>
                <th className="p-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Service</th>
                <th className="p-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Cargo</th>
                <th className="p-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Price</th>
                <th className="p-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Status</th>
                <th className="p-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={9} className="p-10 text-center text-zinc-400 animate-pulse">Loading bookings...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-10 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <BookOpen size={32} className="text-zinc-300 dark:text-zinc-600" />
                      <p className="text-zinc-500 dark:text-zinc-400">No bookings found.</p>
                      <button
                        onClick={() => navigate('/bookings/new')}
                        className="text-primary text-sm font-semibold hover:underline"
                      >
                        Create your first booking →
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map(b => (
                  <tr
                    key={b.id}
                    onClick={() => navigate(`/bookings/${b.id}`)}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer group"
                  >
                    {/* Reference */}
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{SOURCE_ICONS[b.booking_source] || '📦'}</span>
                        <div>
                          <p className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">{b.reference}</p>
                          {b.customer_reference && (
                            <p className="text-xs text-zinc-400 mt-0.5">PO: {b.customer_reference}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    {/* Client */}
                    <td className="p-4">
                      <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{b.client_name || '—'}</p>
                      {getPriorityDot(b.priority)}
                    </td>
                    {/* Route */}
                    <td className="p-4">
                      <div className="flex items-center gap-1.5 text-sm">
                        <span className="text-zinc-700 dark:text-zinc-300 font-medium">{b.pickup_city || b.pickup_location || '—'}</span>
                        <ArrowRight size={12} className="text-zinc-400 flex-shrink-0" />
                        <span className="text-zinc-700 dark:text-zinc-300 font-medium">{b.delivery_city || b.delivery_location || '—'}</span>
                      </div>
                    </td>
                    {/* Dates */}
                    <td className="p-4">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1 text-xs text-zinc-500">
                          <Calendar size={11} />
                          <span>Pickup: {b.pickup_requested_date ? new Date(b.pickup_requested_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—'}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-zinc-400">
                          <Calendar size={11} />
                          <span>Delivery: {b.delivery_requested_date ? new Date(b.delivery_requested_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—'}</span>
                        </div>
                      </div>
                    </td>
                    {/* Service */}
                    <td className="p-4">
                      {b.service_type_code ? (
                        <span className="text-xs font-mono font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-2 py-0.5 rounded">
                          {b.service_type_code}
                        </span>
                      ) : (
                        <span className="text-zinc-400 text-xs">—</span>
                      )}
                    </td>
                    {/* Cargo */}
                    <td className="p-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                          {b.total_weight_kg ? `${b.total_weight_kg.toFixed(0)} kg` : '—'}
                        </span>
                        <span className="text-xs text-zinc-400">{b.cargo_line_count} line{b.cargo_line_count !== 1 ? 's' : ''}</span>
                      </div>
                    </td>
                    {/* Price */}
                    <td className="p-4">
                      {b.requires_manual_pricing ? (
                        <span className="flex items-center gap-1 text-xs text-amber-500 font-semibold">
                          <AlertTriangle size={11} /> Manual
                        </span>
                      ) : b.agreed_price ? (
                        <div>
                          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                            {b.currency} {b.agreed_price.toLocaleString('en', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      ) : (
                        <span className="text-zinc-400 text-xs">Not set</span>
                      )}
                    </td>
                    {/* Status */}
                    <td className="p-4">{getStatusBadge(b.status)}</td>
                    {/* Action */}
                    <td className="p-4 text-right">
                      <ChevronRight
                        size={18}
                        className="text-zinc-300 dark:text-zinc-600 group-hover:text-zinc-700 dark:group-hover:text-zinc-300 transition-colors ml-auto"
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* Footer count */}
        {!loading && filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-zinc-100 dark:border-zinc-800 text-xs text-zinc-400">
            Showing {filtered.length} of {bookings.length} bookings
          </div>
        )}
      </div>
    </div>
  );
}
