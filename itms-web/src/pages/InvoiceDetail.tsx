import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { ArrowLeft, Printer, Download, Mail, Building, Phone, Mail as MailIcon, Globe, FileText, CheckCircle } from 'lucide-react';

// The issuing company is the operator running ITMS. Configure it in .env (see .env.example);
// any field left empty is simply not shown.
const env = import.meta.env;
const ISSUER = {
  name: (env.VITE_COMPANY_NAME as string) || 'Your Company',
  tagline: env.VITE_COMPANY_TAGLINE as string | undefined,
  address: env.VITE_COMPANY_ADDRESS as string | undefined,
  phone: env.VITE_COMPANY_PHONE as string | undefined,
  email: env.VITE_COMPANY_EMAIL as string | undefined,
  website: env.VITE_COMPANY_WEBSITE as string | undefined,
  vat: env.VITE_COMPANY_VAT as string | undefined,
  bankName: env.VITE_COMPANY_BANK_NAME as string | undefined,
  accountName: env.VITE_COMPANY_BANK_ACCOUNT_NAME as string | undefined,
  iban: env.VITE_COMPANY_IBAN as string | undefined,
  bic: env.VITE_COMPANY_BIC as string | undefined,
};

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<any>(null);
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const invRes = await api.get(`/invoices/${id}`);
        const invData = invRes.data.invoice;
        setInvoice(invData);
        
        if (invData.client_id) {
          const clientRes = await api.get(`/clients/${invData.client_id}`);
          setClient(clientRes.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <div className="p-8 text-center text-zinc-500 animate-pulse">Loading invoice document...</div>;
  if (!invoice) return <div className="p-8 text-center text-zinc-500">Invoice not found.</div>;

  // Red is reserved for invoices that are actually past due and unpaid.
  const isOverdue = invoice.status !== 'paid' && invoice.status !== 'cancelled'
    && new Date(invoice.due_date).getTime() < Date.now();

  return (
    <div className="flex-1 overflow-y-auto bg-zinc-100 dark:bg-zinc-950 p-4 sm:p-8 flex flex-col items-center print:bg-white print:p-0">
      
      {/* Actions Bar - Hidden when printing */}
      <div className="w-full max-w-4xl flex items-center justify-between mb-6 print:hidden">
        <button 
          onClick={() => navigate('/invoices')}
          className="flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
        >
          <ArrowLeft size={16} /> Back to Invoices
        </button>
        <div className="flex gap-3">
          {invoice.status === 'draft' && (
            <button className="flex items-center gap-1.5 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors">
              Mark as Issued
            </button>
          )}
          <button className="flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 shadow-sm transition-colors">
            <Mail size={16} /> Email
          </button>
          <button 
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-medium shadow-sm transition-colors"
          >
            <Printer size={16} /> Print / PDF
          </button>
        </div>
      </div>

      {/* Actual Invoice Document */}
      <div className="w-full max-w-4xl bg-white rounded-xl shadow-xl overflow-hidden print:shadow-none print:rounded-none text-zinc-800">
        
        {/* Header Ribbon */}
        <div className="h-4 bg-gradient-to-r from-primary via-blue-500 to-indigo-600 w-full"></div>

        <div className="p-10 sm:p-14">
          {/* Header Row */}
          <div className="flex justify-between items-start mb-12 border-b border-zinc-100 pb-10">
            {/* Company Info: the issuing company, from VITE_COMPANY_* settings */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-primary to-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                  <FileText size={24} />
                </div>
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-zinc-900 uppercase">{ISSUER.name}</h1>
                  {ISSUER.tagline && <p className="text-xs font-semibold text-primary tracking-widest uppercase">{ISSUER.tagline}</p>}
                </div>
              </div>
              <div className="text-sm text-zinc-500 space-y-1">
                {ISSUER.address && <p className="flex items-center gap-2"><Building size={14} /> {ISSUER.address}</p>}
                {ISSUER.phone && <p className="flex items-center gap-2"><Phone size={14} /> {ISSUER.phone}</p>}
                {ISSUER.email && <p className="flex items-center gap-2"><MailIcon size={14} /> {ISSUER.email}</p>}
                {ISSUER.website && <p className="flex items-center gap-2"><Globe size={14} /> {ISSUER.website}</p>}
                {ISSUER.vat && <p className="flex items-center gap-2">VAT No: <span className="font-mono">{ISSUER.vat}</span></p>}
              </div>
            </div>

            {/* Invoice Meta */}
            <div className="text-right">
              <h2 className="text-4xl font-black text-zinc-200 tracking-wider uppercase mb-2">Invoice</h2>
              <div className="font-mono text-lg font-bold text-zinc-800 mb-6">{invoice.invoice_number}</div>
              
              <div className="inline-grid grid-cols-2 gap-x-8 gap-y-2 text-sm text-left">
                <span className="text-zinc-500 text-right">Date of Issue:</span>
                <span className="font-medium">{new Date(invoice.issue_date).toLocaleDateString()}</span>
                
                <span className="text-zinc-500 text-right">Due Date:</span>
                <span className={`font-bold ${isOverdue ? 'text-red-600' : 'text-zinc-800'}`}>{new Date(invoice.due_date).toLocaleDateString()}</span>
                
                <span className="text-zinc-500 text-right">Booking Ref:</span>
                <span className="font-mono text-zinc-700 bg-zinc-100 px-1 rounded">{invoice.booking_reference}</span>
                
                <span className="text-zinc-500 text-right">Status:</span>
                <span className={`font-semibold uppercase tracking-wider text-xs flex items-center gap-1 ${invoice.status === 'paid' ? 'text-emerald-500' : invoice.status === 'draft' ? 'text-zinc-500' : 'text-blue-500'}`}>
                  {invoice.status === 'paid' && <CheckCircle size={12} />}
                  {invoice.status}
                </span>
              </div>
            </div>
          </div>

          {/* Bill To */}
          <div className="mb-12">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3 border-b border-zinc-100 pb-2">Bill To</h3>
            <div className="text-sm text-zinc-800">
              <p className="font-bold text-lg text-zinc-900 mb-1">{client?.company_name || invoice.client_name}</p>
              {client ? (
                <>
                  <p>{client.address_line1}</p>
                  {client.address_line2 && <p>{client.address_line2}</p>}
                  <p>{client.city}, {client.state} {client.postal_code}</p>
                  <p>{client.country}</p>
                  {client.vat_number && <p className="mt-2 text-zinc-500">VAT No: <span className="font-mono text-zinc-700">{client.vat_number}</span></p>}
                </>
              ) : null}
            </div>
          </div>

          {/* Line Items */}
          <div className="mb-12">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-zinc-50">
                  <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-widest rounded-l-lg">Description</th>
                  <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-widest text-center">Qty</th>
                  <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-widest text-right">Unit Price</th>
                  <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-widest text-right">Tax %</th>
                  <th className="py-3 px-4 text-xs font-bold text-zinc-900 uppercase tracking-widest text-right rounded-r-lg">Total Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {invoice.lines?.map((line: any) => (
                  <tr key={line.id}>
                    <td className="py-4 px-4 text-sm">
                      <p className="font-medium text-zinc-900">{line.description}</p>
                      {line.is_surcharge && <span className="text-xs text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded mt-1 inline-block">Surcharge</span>}
                    </td>
                    <td className="py-4 px-4 text-sm text-center text-zinc-600">{line.quantity}</td>
                    <td className="py-4 px-4 text-sm text-right text-zinc-600">{invoice.currency} {line.unit_price.toFixed(2)}</td>
                    <td className="py-4 px-4 text-sm text-right text-zinc-500">{line.vat_rate}%</td>
                    <td className="py-4 px-4 text-sm font-semibold text-right text-zinc-900">{invoice.currency} {line.amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals & Notes */}
          <div className="flex justify-between items-start">
            <div className="w-1/2 pr-8">
              {ISSUER.bankName && (
                <>
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3 border-b border-zinc-100 pb-2">Payment Details</h3>
                  <div className="text-xs text-zinc-600 space-y-1">
                    <p><span className="font-medium text-zinc-800">Bank:</span> {ISSUER.bankName}</p>
                    {ISSUER.accountName && <p><span className="font-medium text-zinc-800">Account Name:</span> {ISSUER.accountName}</p>}
                    {ISSUER.iban && <p><span className="font-medium text-zinc-800">IBAN:</span> {ISSUER.iban}</p>}
                    {ISSUER.bic && <p><span className="font-medium text-zinc-800">BIC:</span> {ISSUER.bic}</p>}
                    <p className="mt-4 italic text-zinc-500">Please include Invoice Number ({invoice.invoice_number}) in payment reference.</p>
                  </div>
                </>
              )}
            </div>

            <div className="w-1/2 max-w-sm ml-auto bg-zinc-50 rounded-xl p-6">
              <div className="flex justify-between text-sm mb-3">
                <span className="text-zinc-600 font-medium">Subtotal</span>
                <span className="text-zinc-900">{invoice.currency} {invoice.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm mb-4">
                <span className="text-zinc-600 font-medium">Tax / VAT</span>
                <span className="text-zinc-900">{invoice.currency} {invoice.vat_amount.toFixed(2)}</span>
              </div>
              <div className="border-t border-zinc-200 pt-4 flex justify-between items-center">
                <span className="text-base font-black text-zinc-900 uppercase">Total Due</span>
                <span className="text-xl font-black text-primary">{invoice.currency} {invoice.total_amount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-16 pt-8 border-t border-zinc-200 text-center text-xs text-zinc-400">
            <p className="font-medium text-zinc-600 mb-1">Thank you for your business.</p>
            {ISSUER.email && <p>Questions about this invoice: {ISSUER.email}</p>}
          </div>

        </div>
      </div>
    </div>
  );
}
