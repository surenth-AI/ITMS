import React, { useState } from 'react';
import { Search, Map as MapIcon, Package, CheckCircle, Truck, Clock } from 'lucide-react';

export default function TrackingPortal() {
  const [ref, setRef] = useState('');
  const [tracking, setTracking] = useState(false);

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (ref.trim()) setTracking(true);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center p-6">
      <div className="w-full max-w-2xl mt-12 mb-8 text-center">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Track Your Shipment</h1>
        <p className="text-zinc-500 dark:text-zinc-400">Enter your shipment reference number to see real-time status.</p>
      </div>

      <div className="w-full max-w-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden p-6 mb-8">
        <form onSubmit={handleTrack} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
            <input 
              type="text" 
              placeholder="e.g. SHP-2023-XYZ" 
              value={ref}
              onChange={e => setRef(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button type="submit" className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors">
            Track
          </button>
        </form>
      </div>

      {tracking && (
        <div className="w-full max-w-2xl space-y-6 animate-fade-in">
          {/* Status Header */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-1">Status</p>
              <h2 className="text-2xl font-bold text-amber-600 dark:text-amber-500 flex items-center gap-2">
                <Truck size={28} /> In Transit
              </h2>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-1">Estimated Delivery</p>
              <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Today, 14:30</p>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 shadow-sm">
            <div className="relative">
              {/* Vertical Line */}
              <div className="absolute left-5 top-8 bottom-8 w-1 bg-zinc-200 dark:bg-zinc-800"></div>

              {/* Steps */}
              <div className="space-y-8">
                
                <div className="relative flex gap-6">
                  <div className="w-11 h-11 bg-white dark:bg-zinc-900 border-4 border-emerald-500 rounded-full flex items-center justify-center z-10 flex-shrink-0 text-emerald-500">
                    <CheckCircle size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-lg">Order Created</h3>
                    <p className="text-zinc-500 text-sm">Yesterday at 09:12</p>
                  </div>
                </div>

                <div className="relative flex gap-6">
                  <div className="w-11 h-11 bg-white dark:bg-zinc-900 border-4 border-emerald-500 rounded-full flex items-center justify-center z-10 flex-shrink-0 text-emerald-500">
                    <Package size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-lg">Picked Up</h3>
                    <p className="text-zinc-500 text-sm">Yesterday at 15:45 - London Depot</p>
                  </div>
                </div>

                <div className="relative flex gap-6">
                  <div className="w-11 h-11 bg-amber-100 dark:bg-amber-900/30 border-4 border-amber-500 rounded-full flex items-center justify-center z-10 flex-shrink-0 text-amber-600 dark:text-amber-500 ring-4 ring-amber-500/20">
                    <Truck size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-amber-600 dark:text-amber-500 text-lg">In Transit</h3>
                    <p className="text-zinc-500 text-sm">Currently out for delivery with driver.</p>
                  </div>
                </div>

                <div className="relative flex gap-6">
                  <div className="w-11 h-11 bg-white dark:bg-zinc-900 border-4 border-zinc-300 dark:border-zinc-700 rounded-full flex items-center justify-center z-10 flex-shrink-0 text-zinc-400">
                    <MapIcon size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-zinc-400 text-lg">Delivered</h3>
                    <p className="text-zinc-400 text-sm">Pending</p>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
