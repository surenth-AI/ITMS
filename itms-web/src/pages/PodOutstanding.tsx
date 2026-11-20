import { useEffect, useRef, useState } from 'react';
import { FileWarning, Phone, Paperclip, CheckCircle, ChevronDown, ChevronRight } from 'lucide-react';
import api from '../services/api';

interface ChaseEntry {
  at: string;
  note: string;
}

interface OutstandingItem {
  shipment_id: string;
  shipment_reference: string;
  booking_id: string | null;
  booking_reference: string | null;
  customer_reference: string | null;
  client_name: string | null;
  from_city: string | null;
  to_city: string | null;
  delivered_on: string | null;
  days_open: number;
  state: 'outstanding' | 'overdue';
  chase_log: ChaseEntry[];
}

interface ClosedInfo {
  podReference: string;
  invoices: string[];
}

// Status colours carry meaning: amber = POD outstanding, red = overdue only, green = invoiced only.
const STATE_STYLE = {
  outstanding: { text: 'text-[#C9852E]', bg: 'bg-[#C9852E]/10', border: 'border-l-[#C9852E]', ring: 'border-[#C9852E]/30' },
  overdue: { text: 'text-[#DF5A4E]', bg: 'bg-[#DF5A4E]/10', border: 'border-l-[#DF5A4E]', ring: 'border-[#DF5A4E]/30' },
};

const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

const dayOf = (isoDate: string | null) =>
  isoDate
    ? new Date(isoDate + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
    : '';

const nowHHMM = () => new Date().toTimeString().slice(0, 5);

// Turn "HH:MM" (today, local time) into an ISO timestamp for the chase log.
const todayAt = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};

export default function PodOutstanding() {
  const [items, setItems] = useState<OutstandingItem[]>([]);
  const [overdueDays, setOverdueDays] = useState(2);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);
  const [closed, setClosed] = useState<Record<string, ClosedInfo>>({});
  const [note, setNote] = useState('');
  const [noteTime, setNoteTime] = useState(nowHHMM());
  const [receivedBy, setReceivedBy] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = async () => {
    try {
      const res = await api.get('/pod/outstanding', { params: { as_of: new Date().toISOString() } });
      setItems(res.data.items);
      setOverdueDays(res.data.overdue_days);
    } catch (err) {
      console.error('Failed to load outstanding PODs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggle = (id: string) => {
    setOpen(open === id ? null : id);
    setNote('');
    setNoteTime(nowHHMM());
    setReceivedBy('');
    setError(null);
  };

  const addLog = async (item: OutstandingItem, text: string, at: string = new Date().toISOString()) => {
    const res = await api.post(`/pod/outstanding/${item.shipment_id}/chase`, { note: text, at });
    setItems(prev => prev.map(i =>
      i.shipment_id === item.shipment_id ? { ...i, chase_log: [...i.chase_log, res.data] } : i));
  };

  const logAction = async (item: OutstandingItem) => {
    if (!note.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await addLog(item, note.trim(), todayAt(noteTime));
      setNote('');
      setNoteTime(nowHHMM());
    } catch {
      setError('Could not save the log entry.');
    } finally {
      setBusy(false);
    }
  };

  const attachSignedCopy = async (item: OutstandingItem, file: File) => {
    setBusy(true);
    setError(null);
    let res;
    try {
      const form = new FormData();
      form.append('document', file, file.name);
      const doc = await api.post(`/v1/shipments/${item.shipment_id}/pod/document`, form);
      res = await api.post(`/v1/shipments/${item.shipment_id}/pod/submit`, {
        document_url: doc.data.document_url,
        recipient_name: receivedBy || null,
        was_offline: false,
      });
    } catch {
      setError('Could not attach the signed copy.');
      setBusy(false);
      if (fileInput.current) fileInput.current.value = '';
      return;
    }
    // The POD is saved and the job is closed from here on. Writing the chase log is
    // secondary: a failure there must not report the attach as failed (or invite a retry).
    const invoices: string[] = res.data.invoices_raised || [];
    setClosed(prev => ({ ...prev, [item.shipment_id]: { podReference: res.data.pod_reference, invoices } }));
    try {
      await addLog(item, `Signed copy received and attached (${res.data.pod_reference})`);
      if (invoices.length) await addLog(item, `Invoice out: ${invoices.join(', ')}`);
    } catch {
      setError(`Signed copy attached (${res.data.pod_reference}), but the chase log could not be updated.`);
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const openCount = items.filter(i => !closed[i.shipment_id]).length;
  const overdueCount = items.filter(i => !closed[i.shipment_id] && i.state === 'overdue').length;

  return (
    <div className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto">
      <header className="flex justify-between items-center animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">POD outstanding</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Delivered jobs with no proof of delivery, oldest first. Overdue after {overdueDays} days.
          </p>
        </div>
        <div className="flex gap-3">
          <div className="bg-[#C9852E]/10 border border-[#C9852E]/30 px-4 py-2 rounded-lg">
            <span className="text-xs font-medium text-[#C9852E]">{openCount} Outstanding</span>
          </div>
          {overdueCount > 0 && (
            <div className="bg-[#DF5A4E]/10 border border-[#DF5A4E]/30 px-4 py-2 rounded-lg">
              <span className="text-xs font-medium text-[#DF5A4E]">{overdueCount} Overdue</span>
            </div>
          )}
        </div>
      </header>

      <div className="space-y-3 animate-fade-in" style={{ animationDelay: '0.05s' }}>
        {loading ? (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-12 text-center">
            <p className="text-sm text-zinc-500">Loading…</p>
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-12 text-center">
            <CheckCircle size={32} className="text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
            <p className="text-sm text-zinc-500">Every delivered job has its POD.</p>
          </div>
        ) : (
          items.map(item => {
            const done = closed[item.shipment_id];
            const st = STATE_STYLE[item.state];
            const isOpen = open === item.shipment_id;
            return (
              <div key={item.shipment_id}
                className={`bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 border-l-4 ${done ? 'border-l-emerald-500' : st.border} rounded-xl shadow-sm`}>
                <button onClick={() => toggle(item.shipment_id)} className="w-full text-left p-5 flex items-center gap-4">
                  {isOpen ? <ChevronDown size={18} className="text-zinc-400" /> : <ChevronRight size={18} className="text-zinc-400" />}
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${done ? 'bg-emerald-50 dark:bg-emerald-500/10' : st.bg}`}>
                    {done ? <CheckCircle size={18} className="text-emerald-600" /> : <FileWarning size={18} className={st.text} />}
                  </div>
                  <div className="flex-1 min-w-0 grid grid-cols-4 gap-4 items-center">
                    <div>
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{item.booking_reference || item.shipment_reference}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">Ref {item.customer_reference || 'n/a'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-zinc-800 dark:text-zinc-200">{item.from_city} to {item.to_city}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">{item.client_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-zinc-800 dark:text-zinc-200">Delivered {dayOf(item.delivered_on)}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">Status delivered, no POD</p>
                    </div>
                    <div className="flex justify-end">
                      {done ? (
                        <span className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                          Invoiced
                        </span>
                      ) : (
                        <span className={`px-3 py-1.5 text-xs font-semibold rounded-lg border ${st.bg} ${st.text} ${st.ring}`}>
                          {item.days_open === 0 ? 'Today' : `Day ${item.days_open}`}{item.state === 'overdue' ? ', overdue' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 pl-[4.75rem] space-y-4">
                    <div className="border-t border-zinc-100 dark:border-zinc-800 pt-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Chase log</p>
                      {item.chase_log.length === 0 ? (
                        <p className="text-sm text-zinc-400">No actions logged yet.</p>
                      ) : (
                        <ul className="space-y-1.5">
                          {item.chase_log.map((e, i) => (
                            <li key={i} className="flex gap-4 text-sm">
                              <span className="font-mono text-zinc-500 w-12 flex-shrink-0">{timeOf(e.at)}</span>
                              <span className="text-zinc-800 dark:text-zinc-200">{e.note}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {!done && (
                      <div className="flex flex-wrap items-end gap-3">
                        <label className="text-xs text-zinc-500">
                          Time
                          <input type="time" value={noteTime} onChange={e => setNoteTime(e.target.value)}
                            className="block mt-1 px-2 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950" />
                        </label>
                        <label className="text-xs text-zinc-500 flex-1 min-w-[16rem]">
                          Action
                          <input value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Driver called"
                            onKeyDown={e => { if (e.key === 'Enter') logAction(item); }}
                            className="block w-full mt-1 px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950" />
                        </label>
                        <button disabled={busy || !note.trim()} onClick={() => logAction(item)}
                          className="px-4 py-2 text-sm font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 flex items-center gap-2">
                          <Phone size={14} /> Log
                        </button>
                        <div className="w-px self-stretch bg-zinc-200 dark:bg-zinc-800 mx-1" />
                        <label className="text-xs text-zinc-500">
                          Received by
                          <input value={receivedBy} onChange={e => setReceivedBy(e.target.value)} placeholder="Name on signed copy"
                            className="block mt-1 px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950" />
                        </label>
                        <input ref={fileInput} type="file" accept="image/*,application/pdf" className="hidden"
                          onChange={e => { const f = e.target.files?.[0]; if (f) attachSignedCopy(item, f); }} />
                        <button disabled={busy} onClick={() => fileInput.current?.click()}
                          className="px-4 py-2 text-sm font-semibold rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 disabled:opacity-50 flex items-center gap-2">
                          <Paperclip size={14} /> Attach signed copy
                        </button>
                      </div>
                    )}

                    {done && (
                      <p className="text-sm text-emerald-700 dark:text-emerald-400">
                        POD {done.podReference} attached. {done.invoices.length ? `Invoice out: ${done.invoices.join(', ')}.` : ''}
                      </p>
                    )}
                    {error && <p className="text-sm text-[#DF5A4E]">{error}</p>}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
