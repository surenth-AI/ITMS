import React, { useEffect, useState, useRef } from 'react';
import api from '../services/api';
import { Upload, DollarSign, RefreshCw, FileText, Download } from 'lucide-react';

interface RateCard {
  id: string;
  name: string;
  currency: string;
  mode: string;
  valid_from: string;
}

interface RateLine {
  id: string;
  rate_card_id: string;
  origin_zone_name: string;
  destination_zone_name: string;
  service_type_name: string;
  weight_min_kg: number | null;
  weight_max_kg: number | null;
  rate: number;
  rate_basis: string;
  minimum_charge: number;
}

export default function RatesManager() {
  const [rateCards, setRateCards] = useState<RateCard[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string>('');
  const [lines, setLines] = useState<RateLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadCards = async () => {
    try {
      setLoading(true);
      const res = await api.get('/rates/cards');
      setRateCards(res.data.cards || []);
      if (res.data.cards?.length > 0 && !selectedCardId) {
        setSelectedCardId(res.data.cards[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadLines = async (cardId: string) => {
    if (!cardId) return;
    try {
      const res = await api.get(`/rates/lines?rate_card_id=${cardId}`);
      setLines(res.data.lines || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadCards();
  }, []);

  useEffect(() => {
    if (selectedCardId) {
      loadLines(selectedCardId);
    }
  }, [selectedCardId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!selectedCardId) {
      alert("Please select a Rate Card first to upload into.");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('rate_card_id', selectedCardId);

    try {
      const res = await api.post('/rates/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert(res.data.message);
      loadLines(selectedCardId);
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to upload file");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDownloadTemplate = () => {
    const csvContent = "Origin Zone,Destination Zone,Service Type,Min Weight,Max Weight,Rate,Rate Basis,Minimum Charge\nNorth Italy,Germany,STD,0,100,0.45,per_kg,50\n";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "rate_upload_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto animate-fade-in bg-zinc-50 dark:bg-zinc-950">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <DollarSign size={22} className="text-primary" /> Rates Manager
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1 text-sm">Manage contract rates, zones, and bulk upload tariffs</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => handleDownloadTemplate()} className="flex items-center gap-2 px-3 py-2 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-all text-sm font-medium">
            <Download size={16} /> Template
          </button>
          <button onClick={() => loadCards()} className="p-2 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-all">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          
          <input type="file" accept=".csv" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} disabled={uploading || !selectedCardId}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2.5 rounded-lg font-semibold transition-all shadow-sm text-sm disabled:opacity-50">
            {uploading ? <RefreshCw size={16} className="animate-spin" /> : <Upload size={16} />}
            Upload CSV Rates
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Panel: Rate Cards */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm flex flex-col">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
            <h2 className="font-semibold text-sm text-zinc-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-2">
              <FileText size={16} /> Rate Cards
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {rateCards.map(c => (
              <button key={c.id} onClick={() => setSelectedCardId(c.id)}
                className={`w-full text-left px-4 py-3 rounded-lg mb-1 transition-all ${selectedCardId === c.id ? 'bg-primary/10 border border-primary/20 text-primary' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-transparent'}`}>
                <div className="font-bold text-sm">{c.name}</div>
                <div className="text-xs opacity-70 mt-1">{c.currency} · {c.mode}</div>
              </button>
            ))}
            {rateCards.length === 0 && !loading && (
              <div className="text-center p-4 text-sm text-zinc-500">No Rate Cards Found</div>
            )}
          </div>
        </div>

        {/* Right Panel: Lines Table */}
        <div className="lg:col-span-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm flex flex-col min-h-[500px]">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/50">
            <h2 className="font-semibold text-sm text-zinc-800 dark:text-zinc-200">Tariff Lines</h2>
            <div className="text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-2.5 py-1 rounded-md">
              {lines.length} lines
            </div>
          </div>
          
          <div className="flex-1 overflow-auto">
            {lines.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-zinc-400 p-8">
                <FileText size={32} className="mb-2 opacity-50" />
                <p>No rates populated for this card.</p>
                <p className="text-sm mt-1">Click "Upload CSV Rates" to import them.</p>
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50 dark:bg-zinc-900/80 sticky top-0 border-b border-zinc-200 dark:border-zinc-800">
                  <tr className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    <th className="px-4 py-3">Origin</th>
                    <th className="px-4 py-3">Destination</th>
                    <th className="px-4 py-3">Service</th>
                    <th className="px-4 py-3">Weight Band</th>
                    <th className="px-4 py-3">Rate</th>
                    <th className="px-4 py-3">Basis</th>
                    <th className="px-4 py-3">Min Charge</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {lines.map(l => (
                    <tr key={l.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                      <td className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">{l.origin_zone_name}</td>
                      <td className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">{l.destination_zone_name}</td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{l.service_type_name}</td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                        {l.weight_min_kg ?? 0}kg - {l.weight_max_kg ? `${l.weight_max_kg}kg` : '∞'}
                      </td>
                      <td className="px-4 py-3 font-bold text-zinc-900 dark:text-zinc-100">{l.rate.toFixed(2)}</td>
                      <td className="px-4 py-3 text-zinc-500 capitalize">{l.rate_basis.replace('_', ' ')}</td>
                      <td className="px-4 py-3 text-zinc-500">{l.minimum_charge ? l.minimum_charge.toFixed(2) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
