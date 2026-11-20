import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { FileText, ArrowRight, DollarSign, Calendar, Search, Filter, CheckCircle, Clock } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function InvoicesManager() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const res = await api.get('/invoices');
      setInvoices(res.data.invoices || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  const filteredInvoices = invoices.filter(inv => 
    inv.client_name.toLowerCase().includes(search.toLowerCase()) ||
    inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
    inv.booking_reference.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto animate-fade-in bg-zinc-50 dark:bg-zinc-950">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <FileText size={22} className="text-primary" /> Invoices
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1 text-sm">Manage client billing and generated invoices</p>
        </div>
      </header>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by client, invoice #, or booking ref..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary shadow-sm"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors shadow-sm">
          <Filter size={16} /> Filter
        </button>
      </div>

      {/* Grid */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm flex-1">
        <div className="overflow-x-auto h-full">
          {loading ? (
            <div className="p-8 text-center text-zinc-500">Loading invoices...</div>
          ) : filteredInvoices.length === 0 ? (
            <div className="p-12 flex flex-col items-center justify-center text-zinc-400">
              <FileText size={48} className="mb-4 opacity-20" />
              <p>No invoices found.</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-zinc-50/80 dark:bg-zinc-900/80 sticky top-0 border-b border-zinc-200 dark:border-zinc-800 backdrop-blur-sm z-10">
                <tr className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Invoice / Client</th>
                  <th className="px-6 py-4">Booking Ref</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Dates</th>
                  <th className="px-6 py-4 text-right">Total Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {filteredInvoices.map(inv => (
                  <tr key={inv.id} onClick={() => navigate(`/invoices/${inv.id}`)} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors group cursor-pointer">
                    <td className="px-6 py-4">
                      <div className="font-bold text-zinc-900 dark:text-zinc-100">{inv.invoice_number}</div>
                      <div className="text-sm text-zinc-500">{inv.client_name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded text-zinc-600 dark:text-zinc-400">
                        {inv.booking_reference}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {inv.status === 'draft' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"><Clock size={12} /> Draft</span>}
                      {inv.status === 'issued' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"><ArrowRight size={12} /> Issued</span>}
                      {inv.status === 'paid' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"><CheckCircle size={12} /> Paid</span>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-zinc-600 dark:text-zinc-400 flex flex-col gap-1">
                        <div className="flex gap-2">
                          <span className="w-12 text-zinc-400">Issued:</span>
                          <span>{inv.issue_date ? new Date(inv.issue_date).toLocaleDateString() : '-'}</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="w-12 text-zinc-400">Due:</span>
                          <span className="font-medium">{inv.due_date ? new Date(inv.due_date).toLocaleDateString() : '-'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center justify-end gap-1">
                        <DollarSign size={14} className="text-zinc-400" />
                        {inv.total_amount?.toFixed(2)} <span className="text-xs text-zinc-400 font-normal">{inv.currency}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
