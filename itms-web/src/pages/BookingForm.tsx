import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import {
  ArrowLeft, ArrowRight, Check, Package, User, DollarSign,
  Plus, Trash2, AlertTriangle, Thermometer, Zap, BookOpen,
  MapPin, Clock, Tag, Calculator, Loader, RefreshCw
} from 'lucide-react';

interface CargoLine {
  id?: string;
  description: string;
  quantity: number;
  unit_type: string;
  weight_kg_per_unit: number | '';
  loading_metres: number | '';
  length_cm: number | '';
  width_cm: number | '';
  height_cm: number | '';
  stackable: boolean;
  hazmat: boolean;
  hazmat_un_number: string;
  temperature_min_c: number | '';
  temperature_max_c: number | '';
  notes: string;
}

const UNIT_TYPES = ['pallet', 'box', 'drum', 'roll', 'bag', 'crate', 'loose', 'other'];
const VEHICLE_TYPES = ['any', 'van', 'rigid', 'articulated', 'refrigerated', 'flatbed'];
const CURRENCIES = ['EUR', 'GBP', 'DKK', 'USD', 'CHF'];
const BOOKING_SOURCES = ['internal', 'web_portal', 'phone', 'email', 'api', 'edi'];
const PRIORITIES = ['standard', 'urgent', 'critical'];
const PRICE_BASES = ['per_kg', 'per_m3', 'per_loading_metre', 'fixed', 'per_km', 'per_pallet'];

const defaultCargo = (): CargoLine => ({
  description: '', quantity: 1, unit_type: 'pallet',
  weight_kg_per_unit: '', loading_metres: '',
  length_cm: '', width_cm: '', height_cm: '',
  stackable: true, hazmat: false, hazmat_un_number: '',
  temperature_min_c: '', temperature_max_c: '', notes: ''
});

export default function BookingForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [calculatingPrice, setCalculatingPrice] = useState(false);

  // Reference data
  const [clients, setClients] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [serviceTypes, setServiceTypes] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [rateZones, setRateZones] = useState<any[]>([]);

  // Step 1 — Client & Service
  const [clientId, setClientId] = useState('');
  const [contactId, setContactId] = useState('');
  const [serviceTypeId, setServiceTypeId] = useState('');
  const [bookingSource, setBookingSource] = useState('internal');
  const [priority, setPriority] = useState('standard');
  const [incoterms, setIncoterms] = useState('');
  const [customerReference, setCustomerReference] = useState('');

  // Step 2 — Cargo & Logistics
  const [pickupLocationId, setPickupLocationId] = useState('');
  const [deliveryLocationId, setDeliveryLocationId] = useState('');
  const [pickupDate, setPickupDate] = useState('');
  const [pickupWindowStart, setPickupWindowStart] = useState('');
  const [pickupWindowEnd, setPickupWindowEnd] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryWindowStart, setDeliveryWindowStart] = useState('');
  const [deliveryWindowEnd, setDeliveryWindowEnd] = useState('');
  const [vehicleType, setVehicleType] = useState('any');
  const [requiresTailLift, setRequiresTailLift] = useState(false);
  const [requiresTwoMan, setRequiresTwoMan] = useState(false);
  const [cargoDescription, setCargoDescription] = useState('');
  const [specialRequirements, setSpecialRequirements] = useState('');
  const [cargoLines, setCargoLines] = useState<CargoLine[]>([defaultCargo()]);

  // Step 3 — Pricing & Notes
  const [quotedPrice, setQuotedPrice] = useState<number | ''>('');
  const [agreedPrice, setAgreedPrice] = useState<number | ''>('');
  const [currency, setCurrency] = useState('EUR');
  const [priceBasis, setPriceBasis] = useState('');
  const [vatRate, setVatRate] = useState<number | ''>('');
  const [vatAmount, setVatAmount] = useState<number>(0);
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [requiresManualPricing, setRequiresManualPricing] = useState(false);
  const [notesInternal, setNotesInternal] = useState('');
  const [notesDriver, setNotesDriver] = useState('');

  // Price result
  const [priceResult, setPriceResult] = useState<any>(null);

  useEffect(() => {
    const loadRef = async () => {
      const [clientRes, stRes, locRes, tmplRes] = await Promise.all([
        api.get('/clients'),
        api.get('/service-types'),
        api.get('/locations'),
        api.get('/booking-templates').catch(() => ({ data: { templates: [] } }))
      ]);
      setClients(clientRes.data.clients);
      setServiceTypes(stRes.data.service_types);
      setLocations(locRes.data.locations);
      setTemplates(tmplRes.data.templates);
    };
    loadRef();
  }, []);

  // Load contacts when client changes
  useEffect(() => {
    if (!clientId) { setContacts([]); return; }
    api.get('/booking-contacts', { params: { client_id: clientId } })
      .then(res => setContacts(res.data.contacts))
      .catch(() => setContacts([]));
  }, [clientId]);

  // Load edit data
  useEffect(() => {
    if (!editId) return;
    api.get(`/bookings/${editId}`).then(res => {
      const b = res.data;
      setClientId(b.client?.id || '');
      setContactId(b.contact?.id || '');
      setServiceTypeId(b.service_type?.id || '');
      setBookingSource(b.booking_source || 'internal');
      setPriority(b.priority || 'standard');
      setIncoterms(b.incoterms || '');
      setCustomerReference(b.customer_reference || '');
      setPickupLocationId(b.pickup_location?.id || '');
      setDeliveryLocationId(b.delivery_location?.id || '');
      setPickupDate(b.pickup_requested_date || '');
      setPickupWindowStart(b.pickup_time_window_start || '');
      setPickupWindowEnd(b.pickup_time_window_end || '');
      setDeliveryDate(b.delivery_requested_date || '');
      setDeliveryWindowStart(b.delivery_time_window_start || '');
      setDeliveryWindowEnd(b.delivery_time_window_end || '');
      setVehicleType(b.vehicle_type_required || 'any');
      setRequiresTailLift(b.requires_tail_lift || false);
      setRequiresTwoMan(b.requires_two_man_delivery || false);
      setCargoDescription(b.cargo_description || '');
      setSpecialRequirements(b.special_requirements || '');
      if (b.cargo_lines?.length > 0) {
        setCargoLines(b.cargo_lines.map((cl: any) => ({
          id: cl.id,
          description: cl.description || '',
          quantity: cl.quantity || 1,
          unit_type: cl.unit_type || 'pallet',
          weight_kg_per_unit: cl.weight_kg_per_unit || '',
          loading_metres: cl.loading_metres || '',
          length_cm: cl.length_cm || '',
          width_cm: cl.width_cm || '',
          height_cm: cl.height_cm || '',
          stackable: cl.stackable !== false,
          hazmat: cl.hazmat || false,
          hazmat_un_number: cl.hazmat_un_number || '',
          temperature_min_c: cl.temperature_min_c ?? '',
          temperature_max_c: cl.temperature_max_c ?? '',
          notes: cl.notes || ''
        })));
      }
      setAgreedPrice(b.agreed_price || '');
      setQuotedPrice(b.quoted_price || '');
      setCurrency(b.currency || 'EUR');
      setPriceBasis(b.price_basis || '');
      setVatRate(b.vat_rate || '');
      setVatAmount(b.vat_amount || 0);
      setTotalAmount(b.total_amount || 0);
      setRequiresManualPricing(b.requires_manual_pricing || false);
      setNotesInternal(b.notes_internal || '');
      setNotesDriver(b.notes_for_driver || '');
    });
  }, [editId]);

  // Compute VAT & total when price/rate changes
  useEffect(() => {
    const price = Number(agreedPrice) || 0;
    const vat = Number(vatRate) || 0;
    const va = price * (vat / 100);
    setVatAmount(Math.round(va * 100) / 100);
    setTotalAmount(Math.round((price + va) * 100) / 100);
  }, [agreedPrice, vatRate]);

  const totalWeight = cargoLines.reduce((acc, cl) => {
    const w = (Number(cl.quantity) || 0) * (Number(cl.weight_kg_per_unit) || 0);
    return acc + w;
  }, 0);

  const useTemplate = async (tmplId: string) => {
    try {
      const res = await api.post(`/booking-templates/${tmplId}/use`);
      const t = res.data;
      if (t.client_id) setClientId(t.client_id);
      if (t.service_type_id) setServiceTypeId(t.service_type_id);
      if (t.pickup_location_id) setPickupLocationId(t.pickup_location_id);
      if (t.delivery_location_id) setDeliveryLocationId(t.delivery_location_id);
      if (t.cargo_description) setCargoDescription(t.cargo_description);
      if (t.requires_tail_lift) setRequiresTailLift(t.requires_tail_lift);
      if (t.vehicle_type_required) setVehicleType(t.vehicle_type_required);
      if (t.notes_for_driver) setNotesDriver(t.notes_for_driver);
    } catch (err) { console.error(err); }
  };

  const calculatePrice = async () => {
    setCalculatingPrice(true);
    try {
      const res = await api.post('/rates/quote', {
        client_id: clientId,
        service_type_id: serviceTypeId,
        pickup_location_id: pickupLocationId,
        delivery_location_id: deliveryLocationId,
        total_weight_kg: totalWeight,
        cargo_lines: cargoLines
      });
      const quote = res.data.quote;
      setPriceResult(quote);
      setAgreedPrice(quote.total_amount);
      setQuotedPrice(quote.total_amount);
      setPriceBasis('system_quote');
      setVatRate(quote.vat_rate || 0);
      setVatAmount(quote.vat_amount);
      setTotalAmount(quote.total_amount);
      setRequiresManualPricing(false);
    } catch (err: any) {
      console.error(err);
      setRequiresManualPricing(true);
    } finally {
      setCalculatingPrice(false);
    }
  };

  const handleSubmit = async () => {
    if (!clientId) { alert('Client is required'); return; }
    setSubmitting(true);
    try {
      const payload = {
        client_id: clientId, contact_id: contactId || null,
        service_type_id: serviceTypeId || null,
        booking_source: bookingSource, priority,
        incoterms: incoterms || null, customer_reference: customerReference || null,
        pickup_location_id: pickupLocationId || null,
        delivery_location_id: deliveryLocationId || null,
        pickup_requested_date: pickupDate || null,
        pickup_time_window_start: pickupWindowStart || null,
        pickup_time_window_end: pickupWindowEnd || null,
        delivery_requested_date: deliveryDate || null,
        delivery_time_window_start: deliveryWindowStart || null,
        delivery_time_window_end: deliveryWindowEnd || null,
        vehicle_type_required: vehicleType,
        requires_tail_lift: requiresTailLift,
        requires_two_man_delivery: requiresTwoMan,
        cargo_description: cargoDescription || null,
        special_requirements: specialRequirements || null,
        cargo_lines: cargoLines.map(cl => ({
          ...cl,
          weight_kg_per_unit: cl.weight_kg_per_unit === '' ? null : Number(cl.weight_kg_per_unit),
          loading_metres: cl.loading_metres === '' ? null : Number(cl.loading_metres),
          length_cm: cl.length_cm === '' ? null : Number(cl.length_cm),
          width_cm: cl.width_cm === '' ? null : Number(cl.width_cm),
          height_cm: cl.height_cm === '' ? null : Number(cl.height_cm),
          temperature_min_c: cl.temperature_min_c === '' ? null : Number(cl.temperature_min_c),
          temperature_max_c: cl.temperature_max_c === '' ? null : Number(cl.temperature_max_c),
        })),
        quoted_price: quotedPrice === '' ? null : Number(quotedPrice),
        agreed_price: agreedPrice === '' ? null : Number(agreedPrice),
        currency, price_basis: priceBasis || null,
        vat_rate: Number(vatRate) || 0,
        vat_amount: vatAmount, total_amount: totalAmount,
        notes_internal: notesInternal || null,
        notes_for_driver: notesDriver || null,
        requires_manual_pricing: requiresManualPricing,
        amendment_reason: editId ? 'Updated via booking form' : undefined
      };

      if (editId) {
        await api.put(`/bookings/${editId}`, payload);
        navigate(`/bookings/${editId}`);
      } else {
        const res = await api.post('/bookings', payload);
        navigate(`/bookings/${res.data.id}`);
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to save booking');
    } finally {
      setSubmitting(false);
    }
  };

  const addCargoLine = () => setCargoLines([...cargoLines, defaultCargo()]);
  const removeCargoLine = (i: number) => setCargoLines(cargoLines.filter((_, idx) => idx !== i));
  const updateLine = (i: number, field: keyof CargoLine, val: any) => {
    setCargoLines(prev => prev.map((cl, idx) => idx === i ? { ...cl, [field]: val } : cl));
  };

  const STEPS = [
    { num: 1, label: 'Client & Service', icon: User },
    { num: 2, label: 'Cargo & Logistics', icon: Package },
    { num: 3, label: 'Pricing & Notes', icon: DollarSign },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <button onClick={() => navigate('/bookings')} className="p-2 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <BookOpen size={18} className="text-primary" />
            {editId ? 'Edit Booking' : 'New Transport Booking'}
          </h1>
          <p className="text-sm text-zinc-400 mt-0.5">Complete all 3 steps to create the booking</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-6 py-4">
        <div className="flex items-center gap-0 max-w-2xl">
          {STEPS.map((s, idx) => {
            const Icon = s.icon;
            const done = step > s.num;
            const active = step === s.num;
            return (
              <React.Fragment key={s.num}>
                <button
                  onClick={() => s.num < step && setStep(s.num)}
                  className={`flex items-center gap-2.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    active ? 'bg-primary/10 text-primary' :
                    done ? 'text-emerald-500 cursor-pointer hover:bg-emerald-500/10' :
                    'text-zinc-400 cursor-default'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    active ? 'bg-primary text-white' :
                    done ? 'bg-emerald-500 text-white' :
                    'bg-zinc-200 dark:bg-zinc-700 text-zinc-500'
                  }`}>
                    {done ? <Check size={12} /> : s.num}
                  </div>
                  {s.label}
                </button>
                {idx < STEPS.length - 1 && (
                  <div className={`flex-1 h-px mx-2 ${done ? 'bg-emerald-500' : 'bg-zinc-200 dark:bg-zinc-700'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Form content */}
      <div className="flex-1 overflow-y-auto p-6">

        {/* ========== STEP 1 ========== */}
        {step === 1 && (
          <div className="max-w-3xl flex flex-col gap-6">
            {/* Quick template load */}
            {templates.length > 0 && (
              <div className="bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                <p className="text-sm font-semibold text-blue-400 mb-2 flex items-center gap-1.5"><Zap size={13} /> Quick Load from Template</p>
                <div className="flex gap-2 flex-wrap">
                  {templates.slice(0, 6).map(t => (
                    <button key={t.id} onClick={() => useTemplate(t.id)}
                      className="text-xs px-3 py-1.5 bg-white dark:bg-zinc-900 border border-blue-500/20 text-blue-400 hover:bg-blue-500/10 rounded-lg font-medium transition-all">
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-5 flex items-center gap-2"><User size={15} /> Client Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">Client *</label>
                  <select value={clientId} onChange={e => setClientId(e.target.value)} required
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-primary">
                    <option value="">Select client...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">Booking Contact</label>
                  <select value={contactId} onChange={e => setContactId(e.target.value)}
                    disabled={!clientId}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-primary disabled:opacity-50">
                    <option value="">Select contact...</option>
                    {contacts.map(c => <option key={c.id} value={c.id}>{c.full_name} — {c.email}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">Booking Source</label>
                  <select value={bookingSource} onChange={e => setBookingSource(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-primary">
                    {BOOKING_SOURCES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">Priority</label>
                  <select value={priority} onChange={e => setPriority(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-primary">
                    {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-5 flex items-center gap-2"><Tag size={15} /> Service & Commercial</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">Service Type</label>
                  <select value={serviceTypeId} onChange={e => setServiceTypeId(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-primary">
                    <option value="">Select service type...</option>
                    {serviceTypes.map(st => (
                      <option key={st.id} value={st.id}>
                        [{st.code}] {st.name} — {st.transit_days_min}–{st.transit_days_max} days
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">Incoterms</label>
                  <input value={incoterms} onChange={e => setIncoterms(e.target.value)} placeholder="e.g. DAP, DDP, EXW..."
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">Customer PO / Reference</label>
                  <input value={customerReference} onChange={e => setCustomerReference(e.target.value)} placeholder="Client's own reference..."
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-primary" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========== STEP 2 ========== */}
        {step === 2 && (
          <div className="max-w-4xl flex flex-col gap-6">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-5 flex items-center gap-2"><MapPin size={15} /> Pickup</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-3">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">Pickup Location</label>
                  <select value={pickupLocationId} onChange={e => setPickupLocationId(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-primary">
                    <option value="">Select location...</option>
                    {locations.map(l => <option key={l.id} value={l.id}>{l.name}{l.city ? ` — ${l.city}` : ''}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">Pickup Date</label>
                  <input type="date" value={pickupDate} onChange={e => setPickupDate(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">Window From</label>
                  <input type="time" value={pickupWindowStart} onChange={e => setPickupWindowStart(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">Window To</label>
                  <input type="time" value={pickupWindowEnd} onChange={e => setPickupWindowEnd(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-primary" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-5 flex items-center gap-2"><MapPin size={15} className="text-primary" /> Delivery</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-3">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">Delivery Location</label>
                  <select value={deliveryLocationId} onChange={e => setDeliveryLocationId(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-primary">
                    <option value="">Select location...</option>
                    {locations.map(l => <option key={l.id} value={l.id}>{l.name}{l.city ? ` — ${l.city}` : ''}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">Delivery Date</label>
                  <input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">Window From</label>
                  <input type="time" value={deliveryWindowStart} onChange={e => setDeliveryWindowStart(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">Window To</label>
                  <input type="time" value={deliveryWindowEnd} onChange={e => setDeliveryWindowEnd(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-primary" />
                </div>
              </div>
            </div>

            {/* Vehicle & requirements */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-5 flex items-center gap-2"><Tag size={15} /> Vehicle & Requirements</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">Vehicle Type Required</label>
                  <select value={vehicleType} onChange={e => setVehicleType(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-primary">
                    {VEHICLE_TYPES.map(v => <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>)}
                  </select>
                </div>
                <div className="flex gap-6 items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={requiresTailLift} onChange={e => setRequiresTailLift(e.target.checked)} className="w-4 h-4 accent-primary" />
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">Tail Lift Required</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={requiresTwoMan} onChange={e => setRequiresTwoMan(e.target.checked)} className="w-4 h-4 accent-primary" />
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">Two-Man Delivery</span>
                  </label>
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">Cargo Description</label>
                  <input value={cargoDescription} onChange={e => setCargoDescription(e.target.value)} placeholder="General description of goods..."
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-primary" />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">Special Requirements</label>
                  <input value={specialRequirements} onChange={e => setSpecialRequirements(e.target.value)} placeholder="Temperature control, fragile, oversized..."
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-primary" />
                </div>
              </div>
            </div>

            {/* Cargo Lines */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2"><Package size={15} /> Cargo Lines</h3>
                <button onClick={addCargoLine}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-lg hover:bg-primary/20 transition-all">
                  <Plus size={13} /> Add Line
                </button>
              </div>
              <div className="flex flex-col gap-4">
                {cargoLines.map((cl, i) => (
                  <div key={i} className="border border-zinc-200 dark:border-zinc-700 rounded-xl p-4 relative group bg-zinc-50 dark:bg-zinc-950/50">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Line {i + 1}</span>
                      {cargoLines.length > 1 && (
                        <button onClick={() => removeCargoLine(i)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600 p-1 rounded">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="md:col-span-2">
                        <label className="text-xs text-zinc-400 block mb-1">Description</label>
                        <input value={cl.description} onChange={e => updateLine(i, 'description', e.target.value)} placeholder="What is this cargo?"
                          className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:border-primary" />
                      </div>
                      <div>
                        <label className="text-xs text-zinc-400 block mb-1">Qty</label>
                        <input type="number" min={1} value={cl.quantity} onChange={e => updateLine(i, 'quantity', Number(e.target.value))}
                          className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:border-primary" />
                      </div>
                      <div>
                        <label className="text-xs text-zinc-400 block mb-1">Unit Type</label>
                        <select value={cl.unit_type} onChange={e => updateLine(i, 'unit_type', e.target.value)}
                          className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:border-primary">
                          {UNIT_TYPES.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-zinc-400 block mb-1">kg/unit</label>
                        <input type="number" step="0.01" value={cl.weight_kg_per_unit} onChange={e => updateLine(i, 'weight_kg_per_unit', e.target.value)}
                          placeholder="0.00"
                          className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:border-primary" />
                      </div>
                      <div>
                        <label className="text-xs text-zinc-400 block mb-1">Loading m</label>
                        <input type="number" step="0.01" value={cl.loading_metres} onChange={e => updateLine(i, 'loading_metres', e.target.value)}
                          placeholder="0.00"
                          className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:border-primary" />
                      </div>
                      <div>
                        <label className="text-xs text-zinc-400 block mb-1">L × W × H (cm)</label>
                        <div className="flex gap-1">
                          {(['length_cm', 'width_cm', 'height_cm'] as const).map(field => (
                            <input key={field} type="number" step="1" value={cl[field]} onChange={e => updateLine(i, field, e.target.value)}
                              placeholder="—"
                              className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-1.5 py-2 text-xs focus:outline-none focus:border-primary text-center" />
                          ))}
                        </div>
                      </div>
                      {/* Flags */}
                      <div className="md:col-span-4 flex items-center gap-5 mt-1">
                        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                          <input type="checkbox" checked={cl.stackable} onChange={e => updateLine(i, 'stackable', e.target.checked)} className="w-3.5 h-3.5 accent-primary" />
                          <span className="text-zinc-600 dark:text-zinc-400">Stackable</span>
                        </label>
                        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                          <input type="checkbox" checked={cl.hazmat} onChange={e => updateLine(i, 'hazmat', e.target.checked)} className="w-3.5 h-3.5 accent-orange-500" />
                          <span className="text-zinc-600 dark:text-zinc-400 flex items-center gap-1"><AlertTriangle size={10} className="text-orange-500" /> Hazmat</span>
                        </label>
                        {cl.hazmat && (
                          <div className="flex items-center gap-1.5">
                            <label className="text-xs text-zinc-400">UN Number *</label>
                            <input value={cl.hazmat_un_number} onChange={e => updateLine(i, 'hazmat_un_number', e.target.value)}
                              placeholder="UN1234" maxLength={10}
                              className="bg-orange-500/10 border border-orange-500/30 rounded px-2 py-1 text-xs font-mono focus:outline-none focus:border-orange-500 w-24" />
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 ml-auto">
                          <Thermometer size={12} className="text-blue-400" />
                          <label className="text-xs text-zinc-400">Temp</label>
                          <input type="number" value={cl.temperature_min_c} onChange={e => updateLine(i, 'temperature_min_c', e.target.value)} placeholder="Min°C"
                            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded px-2 py-1 text-xs focus:outline-none w-16 text-center" />
                          <span className="text-zinc-400 text-xs">–</span>
                          <input type="number" value={cl.temperature_max_c} onChange={e => updateLine(i, 'temperature_max_c', e.target.value)} placeholder="Max°C"
                            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded px-2 py-1 text-xs focus:outline-none w-16 text-center" />
                        </div>
                      </div>
                    </div>
                    {/* Line weight display */}
                    {cl.quantity && cl.weight_kg_per_unit ? (
                      <div className="mt-2 text-right text-xs text-zinc-400">
                        Line total: <span className="font-bold text-zinc-600 dark:text-zinc-300">{(Number(cl.quantity) * Number(cl.weight_kg_per_unit)).toFixed(1)} kg</span>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
              {totalWeight > 0 && (
                <div className="mt-4 pt-3 border-t border-zinc-200 dark:border-zinc-700 text-right text-sm">
                  <span className="text-zinc-500">Total estimated weight: </span>
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">{totalWeight.toFixed(1)} kg</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========== STEP 3 ========== */}
        {step === 3 && (
          <div className="max-w-2xl flex flex-col gap-6">
            {/* Price lookup */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1 flex items-center gap-2"><Calculator size={15} /> Auto Price Lookup</h3>
              <p className="text-xs text-zinc-400 mb-5">Fetch standard contract rates automatically based on your selected pickup, delivery, and service type.</p>
              
              <button onClick={calculatePrice} disabled={calculatingPrice || !clientId || !pickupLocationId || !deliveryLocationId || !serviceTypeId}
                className="w-full mb-4 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-bold py-2.5 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors">
                {calculatingPrice ? <RefreshCw className="animate-spin" size={16} /> : <DollarSign size={16} />}
                Calculate System Quote
              </button>
              {priceResult && !requiresManualPricing && (
                <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-lg p-4 mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-semibold text-emerald-800 dark:text-emerald-400">Quote Successful</span>
                    <span className="font-bold text-lg text-emerald-700 dark:text-emerald-300">EUR {priceResult.total_amount?.toFixed(2)}</span>
                  </div>
                  <div className="text-xs text-emerald-600 dark:text-emerald-500 space-y-1">
                    <div className="flex justify-between"><span>Base Freight:</span> <span>EUR {priceResult.base_freight_amount?.toFixed(2)}</span></div>
                    {priceResult.surcharges && priceResult.surcharges.map((s: any, idx: number) => (
                      <div key={idx} className="flex justify-between"><span>{s.name}:</span> <span>EUR {s.amount?.toFixed(2)}</span></div>
                    ))}
                    <div className="flex justify-between font-semibold mt-1 pt-1 border-t border-emerald-200/50"><span>VAT:</span> <span>EUR {priceResult.vat_amount?.toFixed(2)}</span></div>
                  </div>
                </div>
              )}
              {requiresManualPricing && (
                <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg p-4 mb-4">
                  <p className="font-semibold text-amber-600 dark:text-amber-400 text-sm">System Rate Not Found</p>
                  <p className="text-zinc-500 mt-1 text-xs">A matching rate was not found for the selected locations and service type. You must request a manual price from pricing team.</p>
                </div>
              )}
            </div>

            {/* Pricing fields */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-5 flex items-center gap-2"><DollarSign size={15} /> Pricing</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">Quoted Price</label>
                  <input type="number" step="0.01" value={quotedPrice} onChange={e => setQuotedPrice(e.target.value as any)} placeholder="0.00"
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">Agreed Price</label>
                  <input type="number" step="0.01" value={agreedPrice} onChange={e => setAgreedPrice(e.target.value as any)} placeholder="0.00"
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">Currency</label>
                  <select value={currency} onChange={e => setCurrency(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary">
                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">Price Basis</label>
                  <select value={priceBasis} onChange={e => setPriceBasis(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary">
                    <option value="">—</option>
                    {PRICE_BASES.map(p => <option key={p} value={p}>{p.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">VAT %</label>
                  <input type="number" step="0.1" value={vatRate} onChange={e => setVatRate(e.target.value as any)} placeholder="0"
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary" />
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 flex flex-col gap-1">
                  <div className="flex justify-between text-xs text-zinc-500">
                    <span>VAT Amount</span><span>{currency} {vatAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-zinc-900 dark:text-zinc-100 pt-1 border-t border-zinc-200 dark:border-zinc-700 mt-1">
                    <span>Total</span><span>{currency} {totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
              <div className="mt-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={requiresManualPricing} onChange={e => setRequiresManualPricing(e.target.checked)} className="w-4 h-4 accent-amber-500" />
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">Flag for manual pricing (dispatcher will set price before confirmation)</span>
                </label>
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-5 flex items-center gap-2"><FileText size={15} /> Notes</h3>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">Internal Notes (not visible to client)</label>
                  <textarea value={notesInternal} onChange={e => setNotesInternal(e.target.value)} rows={3}
                    placeholder="Dispatcher notes, internal context..."
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 resize-none focus:outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">Driver Instructions (appears on driver app)</label>
                  <textarea value={notesDriver} onChange={e => setNotesDriver(e.target.value)} rows={3}
                    placeholder="Access codes, delivery instructions, contact on site..."
                    className="w-full bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 rounded-lg px-3 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 resize-none focus:outline-none focus:border-amber-500" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer nav */}
      <div className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-4 flex justify-between items-center">
        <div>
          {step > 1 && (
            <button onClick={() => setStep(step - 1)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 transition-all">
              <ArrowLeft size={15} /> Previous
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/bookings')}
            className="px-4 py-2.5 text-sm font-semibold rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all">
            Cancel
          </button>
          {step < 3 ? (
            <button
              onClick={() => { if (step === 1 && !clientId) { alert('Please select a client first'); return; } setStep(step + 1); }}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-950 transition-all shadow-sm"
            >
              Next <ArrowRight size={15} />
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={submitting}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg bg-primary hover:bg-primary-dark text-white transition-all shadow-sm disabled:opacity-50">
              {submitting ? <><Loader size={14} className="animate-spin" /> Saving...</> : <><Check size={14} /> {editId ? 'Save Changes' : 'Create Booking'}</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// We need to import this
function FileText({ size, className }: { size: number; className?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>;
}
