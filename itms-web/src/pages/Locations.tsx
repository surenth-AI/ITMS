import React, { useEffect, useState } from 'react';
import { useThemeStore } from '../store/themeStore';
import { MapPin, Search } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import api from '../services/api';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface LocationData {
  id: string;
  type: string;
  name: string;
  address: string | null;
  city: string | null;
  lat: number | null;
  lng: number | null;
  client_id: string | null;
}

const typeColors: Record<string, string> = {
  pickup: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  delivery: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  warehouse: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  depot: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  client_site: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
};

export default function Locations() {
  const { theme } = useThemeStore();
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedLoc, setSelectedLoc] = useState<LocationData | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/locations');
        setLocations(res.data.locations);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const filtered = locations.filter(l => {
    if (typeFilter !== 'all' && l.type !== typeFilter) return false;
    if (search && !l.name.toLowerCase().includes(search.toLowerCase()) && !(l.city || '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const geoLocations = filtered.filter(l => l.lat && l.lng);
  const center: [number, number] = geoLocations.length > 0 ? [geoLocations[0].lat!, geoLocations[0].lng!] : [55.6761, 12.5683];

  return (
    <div className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto">
      <header className="flex justify-between items-center animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Location Library</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">All pickup, delivery, depot and warehouse locations</p>
        </div>
      </header>

      {/* Search & Filters */}
      <div className="flex gap-3 items-center flex-wrap animate-fade-in" style={{ animationDelay: '0.05s' }}>
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input type="text" placeholder="Search by name or city…" value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500" />
        </div>
        {['all', 'pickup', 'delivery', 'depot', 'warehouse', 'client_site'].map(t => (
          <button key={t} onClick={() => setTypeFilter(t)}
            className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${typeFilter === t ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100' : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800'}`}>
            {t === 'all' ? 'All' : t === 'client_site' ? 'Client Site' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Main Content: Map + List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 animate-fade-in" style={{ animationDelay: '0.1s' }}>
        {/* Map */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm" style={{ minHeight: 400 }}>
          <MapContainer center={center} zoom={5} style={{ height: '100%', width: '100%', zIndex: 0 }}>
            <TileLayer
              url={theme === 'dark' ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'}
              attribution='&copy; OpenStreetMap contributors'
            />
            {geoLocations.map(loc => (
              <Marker key={loc.id} position={[loc.lat!, loc.lng!]}>
                <Popup>
                  <strong>{loc.name}</strong><br />
                  <span style={{ textTransform: 'capitalize' }}>{loc.type}</span><br />
                  {loc.city && <span>{loc.city}</span>}
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        {/* List */}
        <div className="space-y-3 overflow-y-auto" style={{ maxHeight: 600 }}>
          {loading ? (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-8 text-center">
              <p className="text-sm text-zinc-500">Loading…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-8 text-center">
              <p className="text-sm text-zinc-500">No locations match.</p>
            </div>
          ) : (
            filtered.map(loc => (
              <div key={loc.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <MapPin size={18} className="text-zinc-500 dark:text-zinc-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{loc.name}</p>
                      {loc.address && <p className="text-xs text-zinc-500 mt-0.5">{loc.address}</p>}
                      {loc.city && <p className="text-xs text-zinc-400 mt-0.5">{loc.city}</p>}
                      {loc.lat && loc.lng && (
                        <p className="text-xs font-mono text-zinc-400 mt-1">{loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}</p>
                      )}
                    </div>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border capitalize ${typeColors[loc.type] || typeColors.pickup}`}>
                    {loc.type === 'client_site' ? 'Client Site' : loc.type}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
