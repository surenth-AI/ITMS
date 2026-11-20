import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
  ArrowLeft, CheckCircle, XCircle, Truck, Package,
  Edit3, Clock, AlertTriangle, FileText, History,
  Activity, Radio, MapPin, User, Tag, DollarSign,
  Thermometer, Zap, ChevronDown, ChevronUp, Plus, X
} from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  draft:                { label: 'Draft',       cls: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' },
  pending_confirmation: { label: 'Pending',     cls: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  confirmed:            { label: 'Confirmed',   cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  allocated:            { label: 'Allocated',   cls: 'bg-violet-500/10 text-violet-400 border-violet-500/20' },
  in_progress:          { label: 'In Progress', cls: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
  completed:            { label: 'Completed',   cls: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  cancelled:            { label: 'Cancelled',   cls: 'bg-red-500/10 text-red-400 border-red-500/20' },
};

type Tab = 'overview' | 'cargo' | 'amendments' | 'events';

export default function BookingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [actionLoading, setActionLoading] = useState(false);

  // Cancel modal
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  // Allocate modal
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [trips, setTrips] = useState<any[]>([]);
  const [selectedTrip, setSelectedTrip] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/bookings/${id}`);
      setBooking(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleConfirm = async () => {
    try {
      setActionLoading(true);
      await api.post(`/bookings/${id}/confirm`);
      load();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Confirmation failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) { alert('Please provide a cancellation reason.'); return; }
    try {
      setActionLoading(true);
      await api.post(`/bookings/${id}/cancel`, { reason: cancelReason });
      setShowCancelModal(false);
      load();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Cancellation failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAllocate = async () => {
    if (!selectedTrip) { alert('Select a trip.'); return; }
    try {
      setActionLoading(true);
      await api.post(`/bookings/${id}/allocate`, { trip_id: selectedTrip });
      setShowAllocateModal(false);
      load();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Allocation failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenerateInvoice = async () => {
    try {
      setActionLoading(true);
      await api.post('/invoices/generate', { booking_id: id });
      load();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.response?.data?.error || 'Invoice generation failed');
    } finally {
      setActionLoading(false);
    }
  };

  const openAllocate = async () => {
    const res = await api.get('/trips');
    setTrips(res.data.trips.filter((t: any) => ['draft', 'scheduled'].includes(t.status)));
    setShowAllocateModal(true);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-zinc-400 animate-pulse">Loading booking...</div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-zinc-400">Booking not found.</div>
      </div>
    );
  }

  const b = booking;
  const statusCfg = STATUS_CONFIG[b.status] || STATUS_CONFIG.draft;
  const canConfirm = ['draft', 'pending_confirmation'].includes(b.status);
  const canAllocate = b.status === 'confirmed';
  const canCancel = !['completed', 'cancelled'].includes(b.status);
  const canEdit = !['completed', 'cancelled'].includes(b.status);

  const EVENT_ICONS: Record<string, any> = {
    created: FileText, confirmed: CheckCircle, amended: Edit3, allocated: Truck,
    in_progress: Activity, completed: CheckCircle, cancelled: XCircle,
    notification_sent: Radio, price_updated: DollarSign, portal_viewed: User
  };

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'overview', label: 'Overview', icon: FileText },
    { id: 'cargo', label: `Cargo (${b.cargo_lines?.length || 0})`, icon: Package },
    { id: 'amendments', label: `Amendments (${b.amendments?.length || 0})`, icon: History },
    { id: 'events', label: `Event Log (${b.events?.length || 0})`, icon: Activity },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/bookings')}
            className="p-2 rounded-lg text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{b.reference}</h1>
              <span className={`px-2.5 py-0.5 rounded text-xs font-semibold uppercase tracking-wider border ${statusCfg.cls}`}>
                {statusCfg.label}
              </span>
              {b.priority === 'critical' && (
                <span className="px-2 py-0.5 rounded text-xs font-bold uppercase bg-red-500/10 text-red-500 border border-red-500/20">
                  ⚡ Critical
                </span>
              )}
              {b.priority === 'urgent' && (
                <span className="px-2 py-0.5 rounded text-xs font-bold uppercase bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  Urgent
                </span>
              )}
              {b.requires_manual_pricing && (
                <span className="px-2 py-0.5 rounded text-xs font-bold uppercase bg-orange-500/10 text-orange-500 border border-orange-500/20 flex items-center gap-1">
                  <AlertTriangle size={10} /> Manual Pricing
                </span>
              )}
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
              {b.client?.company_name} · {b.booking_source?.replace('_', ' ')} · Created {b.created_at ? new Date(b.created_at).toLocaleDateString() : '—'}
            </p>
          </div>
        </div>
        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {!b.invoiced && !['draft', 'cancelled'].includes(b.status) && (
            <button
              onClick={handleGenerateInvoice}
              disabled={actionLoading}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-all disabled:opacity-50 shadow-sm"
            >
              <FileText size={14} /> Generate Invoice
            </button>
          )}
          {b.invoiced && (
            <button
              onClick={() => navigate('/invoices')}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 transition-all shadow-sm"
            >
              <FileText size={14} /> View Invoice
            </button>
          )}
          {canEdit && (
            <button
              onClick={() => navigate(`/bookings/new?edit=${id}`)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 transition-all"
            >
              <Edit3 size={14} /> Edit
            </button>
          )}
          {canConfirm && (
            <button
              onClick={handleConfirm}
              disabled={actionLoading}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-all disabled:opacity-50 shadow-sm"
            >
              <CheckCircle size={14} /> Confirm Booking
            </button>
          )}
          {canAllocate && (
            <button
              onClick={openAllocate}
              disabled={actionLoading}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition-all disabled:opacity-50 shadow-sm"
            >
              <Truck size={14} /> Allocate to Trip
            </button>
          )}
          {canCancel && (
            <button
              onClick={() => setShowCancelModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg text-red-500 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-900/30 transition-all"
            >
              <XCircle size={14} /> Cancel
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-6">

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Left column */}
            <div className="lg:col-span-2 flex flex-col gap-5">
              {/* Route card */}
              <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm">
                <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <MapPin size={13} /> Route & Dates
                </h3>
                <div className="flex gap-6 items-start">
                  <div className="flex-1">
                    <p className="text-xs text-zinc-400 uppercase tracking-wider mb-1">Pickup</p>
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100">{b.pickup_location?.name || '—'}</p>
                    <p className="text-sm text-zinc-500">{b.pickup_location?.address || b.pickup_location?.city || ''}</p>
                    <div className="mt-2 flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                      <Clock size={13} />
                      <span>{b.pickup_requested_date ? new Date(b.pickup_requested_date).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }) : 'Not set'}</span>
                      {b.pickup_time_window_start && (
                        <span className="text-zinc-400">· {b.pickup_time_window_start}–{b.pickup_time_window_end}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-1 pt-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <div className="w-px h-8 bg-zinc-200 dark:bg-zinc-700" />
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-zinc-400 uppercase tracking-wider mb-1">Delivery</p>
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100">{b.delivery_location?.name || '—'}</p>
                    <p className="text-sm text-zinc-500">{b.delivery_location?.address || b.delivery_location?.city || ''}</p>
                    <div className="mt-2 flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                      <Clock size={13} />
                      <span>{b.delivery_requested_date ? new Date(b.delivery_requested_date).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }) : 'Not set'}</span>
                      {b.delivery_time_window_start && (
                        <span className="text-zinc-400">· {b.delivery_time_window_start}–{b.delivery_time_window_end}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Service & cargo summary */}
              <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm">
                <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Tag size={13} /> Service & Cargo Summary
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Service', value: b.service_type?.name || '—' },
                    { label: 'Vehicle', value: b.vehicle_type_required || 'Any' },
                    { label: 'Total Weight', value: b.total_weight_kg ? `${b.total_weight_kg.toFixed(1)} kg` : '—' },
                    { label: 'Volume', value: b.total_volume_m3 ? `${b.total_volume_m3.toFixed(2)} m³` : '—' },
                    { label: 'Loading Metres', value: b.total_loading_metres ? `${b.total_loading_metres.toFixed(2)} lm` : '—' },
                    { label: 'Transit', value: b.service_type ? `${b.service_type.transit_days_min}–${b.service_type.transit_days_max} days` : '—' },
                    { label: 'Tail Lift', value: b.requires_tail_lift ? '✓ Required' : 'Not required' },
                    { label: 'Two-Man Delivery', value: b.requires_two_man_delivery ? '✓ Required' : 'Not required' },
                  ].map(item => (
                    <div key={item.label}>
                      <p className="text-xs text-zinc-400 uppercase tracking-wider">{item.label}</p>
                      <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mt-0.5">{item.value}</p>
                    </div>
                  ))}
                </div>
                {b.hazmat_class && (
                  <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-orange-500 bg-orange-500/10 border border-orange-500/20 rounded-lg px-3 py-2">
                    <AlertTriangle size={14} /> Hazardous Material — Class {b.hazmat_class}
                  </div>
                )}
                {b.special_requirements && (
                  <div className="mt-3 p-3 bg-zinc-50 dark:bg-zinc-950 rounded-lg text-sm text-zinc-600 dark:text-zinc-400">
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">Special Requirements: </span>
                    {b.special_requirements}
                  </div>
                )}
              </div>

              {/* Notes */}
              {(b.notes_internal || b.notes_for_driver) && (
                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm">
                  <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-4">Notes</h3>
                  {b.notes_internal && (
                    <div className="mb-3">
                      <p className="text-xs text-zinc-400 mb-1">Internal (not visible to client)</p>
                      <p className="text-sm text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-950 rounded p-3">{b.notes_internal}</p>
                    </div>
                  )}
                  {b.notes_for_driver && (
                    <div>
                      <p className="text-xs text-zinc-400 mb-1">Driver Instructions</p>
                      <p className="text-sm text-zinc-700 dark:text-zinc-300 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/20 rounded p-3">{b.notes_for_driver}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right column */}
            <div className="flex flex-col gap-5">
              {/* Pricing card */}
              <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm">
                <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <DollarSign size={13} /> Pricing
                </h3>
                <div className="flex flex-col gap-3">
                  {b.quoted_price && (
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-500">Quoted</span>
                      <span className="text-zinc-700 dark:text-zinc-300">{b.currency} {Number(b.quoted_price).toLocaleString('en', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Agreed Price</span>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {b.agreed_price ? `${b.currency} ${Number(b.agreed_price).toLocaleString('en', { minimumFractionDigits: 2 })}` : '—'}
                    </span>
                  </div>
                  {b.vat_rate > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-500">VAT ({b.vat_rate}%)</span>
                      <span className="text-zinc-600 dark:text-zinc-400">{b.currency} {Number(b.vat_amount || 0).toLocaleString('en', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  <div className="border-t border-zinc-200 dark:border-zinc-700 pt-3 flex justify-between">
                    <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Total</span>
                    <span className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                      {b.currency} {Number(b.total_amount || 0).toLocaleString('en', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  {b.price_basis && (
                    <p className="text-xs text-zinc-400">Basis: {b.price_basis?.replace('_', ' ')}</p>
                  )}
                  {b.incoterms && (
                    <p className="text-xs text-zinc-400">Incoterms: <span className="font-bold">{b.incoterms}</span></p>
                  )}
                </div>
              </div>

              {/* Client & Contact */}
              <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm">
                <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <User size={13} /> Client & Contact
                </h3>
                <p className="font-semibold text-zinc-900 dark:text-zinc-100 mb-3">{b.client?.company_name}</p>
                {b.contact ? (
                  <div className="text-sm space-y-1">
                    <p className="text-zinc-800 dark:text-zinc-200 font-medium">{b.contact.full_name}</p>
                    <p className="text-zinc-500">{b.contact.email}</p>
                    <p className="text-zinc-500">{b.contact.phone}</p>
                  </div>
                ) : (
                  <p className="text-sm text-zinc-400">No contact assigned</p>
                )}
                {b.customer_reference && (
                  <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                    <p className="text-xs text-zinc-400">Customer Ref</p>
                    <p className="text-sm font-mono font-bold text-zinc-700 dark:text-zinc-300 mt-0.5">{b.customer_reference}</p>
                  </div>
                )}
              </div>

              {/* Allocation */}
              {b.allocated_trip_id && (
                <div className="bg-violet-500/5 dark:bg-violet-500/10 rounded-xl border border-violet-500/20 p-4">
                  <p className="text-xs font-semibold text-violet-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Truck size={12} /> Allocated Trip
                  </p>
                  <button
                    onClick={() => navigate(`/trips/${b.allocated_trip_id}`)}
                    className="text-sm font-semibold text-violet-500 hover:text-violet-400 hover:underline"
                  >
                    View Trip →
                  </button>
                </div>
              )}

              {/* EDI logs */}
              {b.edi_logs?.length > 0 && (
                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm">
                  <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Zap size={13} /> EDI Import
                  </h3>
                  {b.edi_logs.map((log: any) => (
                    <div key={log.id} className="text-sm flex items-center justify-between">
                      <span className="text-zinc-600 dark:text-zinc-400">{log.format?.toUpperCase()}</span>
                      <span className={`text-xs font-semibold ${log.status === 'success' ? 'text-emerald-500' : log.status === 'failed' ? 'text-red-500' : 'text-amber-500'}`}>
                        {log.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* CARGO TAB */}
        {activeTab === 'cargo' && (
          <div className="flex flex-col gap-4">
            {/* Totals strip */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Total Weight', value: b.total_weight_kg ? `${b.total_weight_kg.toFixed(1)} kg` : '—' },
                { label: 'Total Volume', value: b.total_volume_m3 ? `${b.total_volume_m3.toFixed(3)} m³` : '—' },
                { label: 'Loading Metres', value: b.total_loading_metres ? `${b.total_loading_metres.toFixed(2)} lm` : '—' },
              ].map(item => (
                <div key={item.label} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm">
                  <p className="text-xs text-zinc-400 uppercase tracking-wider">{item.label}</p>
                  <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">{item.value}</p>
                </div>
              ))}
            </div>

            {/* Cargo lines table */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
              <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
                  Cargo Lines ({b.cargo_lines?.length || 0})
                </h3>
              </div>
              {b.cargo_lines?.length === 0 ? (
                <div className="p-8 text-center text-zinc-400 text-sm">No cargo lines yet. Booking cannot be confirmed without cargo.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-xs font-semibold text-zinc-400 uppercase tracking-wider border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
                        <th className="px-4 py-3">#</th>
                        <th className="px-4 py-3">Description</th>
                        <th className="px-4 py-3">Qty / Type</th>
                        <th className="px-4 py-3">Weight</th>
                        <th className="px-4 py-3">Volume</th>
                        <th className="px-4 py-3">Loading m</th>
                        <th className="px-4 py-3">Flags</th>
                        <th className="px-4 py-3">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {b.cargo_lines?.map((cl: any) => (
                        <tr key={cl.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                          <td className="px-4 py-3 text-sm font-mono text-zinc-500">{cl.line_number}</td>
                          <td className="px-4 py-3 text-sm text-zinc-800 dark:text-zinc-200 max-w-xs">{cl.description || '—'}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className="font-semibold text-zinc-900 dark:text-zinc-100">{cl.quantity}×</span>
                            <span className="text-zinc-500 ml-1 capitalize">{cl.unit_type}</span>
                          </td>
                          <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">
                            {cl.total_weight_kg ? `${cl.total_weight_kg.toFixed(1)} kg` : '—'}
                            {cl.weight_kg_per_unit && <span className="text-xs text-zinc-400 ml-1">({cl.weight_kg_per_unit}/unit)</span>}
                          </td>
                          <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">
                            {cl.volume_m3 ? `${cl.volume_m3.toFixed(3)} m³` : '—'}
                          </td>
                          <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">
                            {cl.loading_metres ? `${cl.loading_metres.toFixed(2)}` : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1 flex-wrap">
                              {cl.hazmat && (
                                <span className="text-xs bg-orange-500/10 text-orange-500 border border-orange-500/20 rounded px-1.5 py-0.5 font-semibold">
                                  ☢ {cl.hazmat_un_number || 'HAZMAT'}
                                </span>
                              )}
                              {(cl.temperature_min_c !== null || cl.temperature_max_c !== null) && (
                                <span className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded px-1.5 py-0.5 font-semibold flex items-center gap-0.5">
                                  <Thermometer size={10} /> {cl.temperature_min_c}°–{cl.temperature_max_c}°C
                                </span>
                              )}
                              {!cl.stackable && (
                                <span className="text-xs bg-zinc-500/10 text-zinc-500 border border-zinc-500/20 rounded px-1.5 py-0.5">Non-stack</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-zinc-400 max-w-xs">{cl.notes || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* AMENDMENTS TAB */}
        {activeTab === 'amendments' && (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">Amendment Audit Trail</h3>
              <p className="text-xs text-zinc-400 mt-0.5">Immutable — cannot be edited or deleted by any user</p>
            </div>
            {b.amendments?.length === 0 ? (
              <div className="p-8 text-center text-zinc-400 text-sm">No amendments recorded.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-xs font-semibold text-zinc-400 uppercase tracking-wider border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
                      <th className="px-4 py-3">Timestamp</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Field</th>
                      <th className="px-4 py-3">Before</th>
                      <th className="px-4 py-3">After</th>
                      <th className="px-4 py-3">Reason</th>
                      <th className="px-4 py-3">By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {b.amendments?.map((a: any) => (
                      <tr key={a.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                        <td className="px-4 py-3 text-xs text-zinc-500">{a.created_at ? new Date(a.created_at).toLocaleString() : '—'}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-2 py-0.5 rounded capitalize">
                            {a.amendment_type?.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-zinc-500">{a.field_changed}</td>
                        <td className="px-4 py-3 text-xs text-red-400 max-w-xs truncate">{a.value_before || '—'}</td>
                        <td className="px-4 py-3 text-xs text-emerald-400 max-w-xs truncate">{a.value_after || '—'}</td>
                        <td className="px-4 py-3 text-xs text-zinc-500 max-w-xs">{a.reason}</td>
                        <td className="px-4 py-3 text-xs text-zinc-600 dark:text-zinc-400">{a.amended_by}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* EVENTS TAB */}
        {activeTab === 'events' && (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">Booking Event Log</h3>
              <p className="text-xs text-zinc-400 mt-0.5">Immutable audit trail of all booking events</p>
            </div>
            {b.events?.length === 0 ? (
              <div className="p-8 text-center text-zinc-400 text-sm">No events yet.</div>
            ) : (
              <div className="p-4 flex flex-col gap-0">
                {b.events?.map((e: any, idx: number) => {
                  const Icon = EVENT_ICONS[e.event_type] || Activity;
                  const isLast = idx === (b.events?.length - 1);
                  return (
                    <div key={e.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0">
                          <Icon size={14} className="text-zinc-500 dark:text-zinc-400" />
                        </div>
                        {!isLast && <div className="w-px flex-1 bg-zinc-200 dark:bg-zinc-700 my-1" />}
                      </div>
                      <div className="pb-4 flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 capitalize">{e.event_type?.replace('_', ' ')}</span>
                          <span className="text-xs text-zinc-400">{e.triggered_by}</span>
                        </div>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">{e.description}</p>
                        <div className="flex items-center gap-3 mt-1">
                          {e.user_name && <span className="text-xs text-zinc-500">by {e.user_name}</span>}
                          <span className="text-xs text-zinc-400">{e.created_at ? new Date(e.created_at).toLocaleString() : ''}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-2xl">
            <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
              <h2 className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <XCircle size={16} className="text-red-500" /> Cancel Booking
              </h2>
              <button onClick={() => setShowCancelModal(false)}><X size={18} className="text-zinc-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">This action cannot be undone. Please provide a reason.</p>
              <textarea
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                rows={4}
                placeholder="Cancellation reason (required)..."
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 text-sm text-zinc-900 dark:text-zinc-100 resize-none focus:outline-none focus:border-red-500"
              />
            </div>
            <div className="p-5 border-t border-zinc-200 dark:border-zinc-800 flex gap-3">
              <button onClick={() => setShowCancelModal(false)} className="flex-1 py-2 text-sm font-semibold rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all">Keep Booking</button>
              <button onClick={handleCancel} disabled={actionLoading || !cancelReason.trim()} className="flex-1 py-2 text-sm font-semibold rounded-lg bg-red-600 hover:bg-red-500 text-white transition-all disabled:opacity-50">
                {actionLoading ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Allocate Modal */}
      {showAllocateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-2xl">
            <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
              <h2 className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Truck size={16} className="text-violet-500" /> Allocate to Trip
              </h2>
              <button onClick={() => setShowAllocateModal(false)}><X size={18} className="text-zinc-400" /></button>
            </div>
            <div className="p-5">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Select Trip</label>
              <select
                value={selectedTrip}
                onChange={e => setSelectedTrip(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-primary"
              >
                <option value="">Select a trip...</option>
                {trips.map((t: any) => (
                  <option key={t.id} value={t.id}>{t.reference} — {t.status}</option>
                ))}
              </select>
              {trips.length === 0 && (
                <p className="text-xs text-zinc-400 mt-2">No available trips. Create a trip first.</p>
              )}
            </div>
            <div className="p-5 border-t border-zinc-200 dark:border-zinc-800 flex gap-3">
              <button onClick={() => setShowAllocateModal(false)} className="flex-1 py-2 text-sm font-semibold rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700">Cancel</button>
              <button onClick={handleAllocate} disabled={actionLoading || !selectedTrip} className="flex-1 py-2 text-sm font-semibold rounded-lg bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-50 transition-all">
                {actionLoading ? 'Allocating...' : 'Allocate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
