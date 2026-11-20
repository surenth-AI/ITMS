import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { io, Socket } from 'socket.io-client';

export interface Stop {
  lat: number;
  lng: number;
  name: string;
  address?: string;
  time_window?: string;
}

export interface TripTrackingData {
  trip_id: string;
  driver_name: string;
  vehicle_reg: string;
  origin: Stop;
  destination: Stop;
  stops: Stop[];
  current_lat: number;
  current_lng: number;
  current_speed: number;
}

interface TripTrackerProps {
  tripData: TripTrackingData;
  onStatsUpdate: (stats: { speed: number; remainingKm: number; etaMins: number | null; lastPing: Date }) => void;
}

export default function TripTracker({ tripData, onStatsUpdate }: TripTrackerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const driverMarker = useRef<L.Marker | null>(null);
  const completedPolyline = useRef<L.Polyline | null>(null);
  const remainingPolyline = useRef<L.Polyline | null>(null);
  const fullRouteCoords = useRef<[number, number][]>([]);
  const closestPointIndex = useRef(0);
  const totalDistanceKm = useRef(0);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // Initialize Map
    if (!mapInstance.current) {
      mapInstance.current = L.map(mapRef.current, {
        zoomControl: true,
        scrollWheelZoom: true,
        attributionControl: true,
      }).setView([tripData.origin.lat, tripData.origin.lng], 13);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(mapInstance.current);

      setTimeout(() => {
        if (mapInstance.current) {
          mapInstance.current.invalidateSize();
        }
      }, 100);
    }

    const map = mapInstance.current;

    // Fetch Route from OSRM
    const fetchRoute = async () => {
      const waypoints = [tripData.origin, ...tripData.stops, tripData.destination];
      const coordString = waypoints.map(p => `${p.lng},${p.lat}`).join(';');
      const url = `http://router.project-osrm.org/route/v1/driving/${coordString}?overview=full&geometries=geojson&steps=false`;

      try {
        const res = await fetch(url);
        const data = await res.json();
        
        if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
          console.error('OSRM routing failed:', data.message);
          return;
        }

        const route = data.routes[0];
        const leafletCoords = route.geometry.coordinates.map((coord: number[]) => [coord[1], coord[0]] as [number, number]);
        
        fullRouteCoords.current = leafletCoords;
        closestPointIndex.current = 0;
        totalDistanceKm.current = Math.round(route.distance / 1000);

        // Draw Polylines
        if (remainingPolyline.current) remainingPolyline.current.remove();
        if (completedPolyline.current) completedPolyline.current.remove();

        remainingPolyline.current = L.polyline(leafletCoords, {
          color: '#CBD5E1',
          weight: 5,
          opacity: 1,
        }).addTo(map);

        completedPolyline.current = L.polyline([], {
          color: '#4F46E5',
          weight: 5,
          opacity: 1,
        }).addTo(map);

        // Draw Markers
        L.circleMarker([tripData.origin.lat, tripData.origin.lng], {
          radius: 10,
          fillColor: '#22C55E',
          color: '#ffffff',
          weight: 3,
          fillOpacity: 1,
        }).bindPopup('<strong>Origin</strong><br>Trip start location').addTo(map);

        L.circleMarker([tripData.destination.lat, tripData.destination.lng], {
          radius: 10,
          fillColor: '#EF4444',
          color: '#ffffff',
          weight: 3,
          fillOpacity: 1,
        }).bindPopup('<strong>Destination</strong><br>Final delivery point').addTo(map);

        tripData.stops.forEach((stop, index) => {
          L.circleMarker([stop.lat, stop.lng], {
            radius: 7,
            fillColor: '#F59E0B',
            color: '#ffffff',
            weight: 2,
            fillOpacity: 1,
          }).bindPopup(`<strong>Stop ${index + 1}: ${stop.name}</strong><br>${stop.address || ''}`).addTo(map);
        });

        map.fitBounds(L.latLngBounds(leafletCoords).pad(0.08));

        // Create Driver Marker
        const truckIcon = L.divIcon({
          html: `
            <div style="
              background: #4F46E5;
              border: 3px solid #ffffff;
              border-radius: 50%;
              width: 24px;
              height: 24px;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 0 0 3px rgba(79,70,229,0.3);
            ">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z"/>
                <circle cx="5.5" cy="18.5" r="2.5"/>
                <circle cx="18.5" cy="18.5" r="2.5"/>
              </svg>
            </div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
          className: '',
        });

        if (driverMarker.current) driverMarker.current.remove();
        
        driverMarker.current = L.marker([tripData.current_lat, tripData.current_lng], {
          icon: truckIcon,
          zIndexOffset: 1000,
        }).bindPopup(`<strong>${tripData.driver_name}</strong><br>Vehicle: ${tripData.vehicle_reg}`).addTo(map);

        updateDriverPosition(tripData.current_lat, tripData.current_lng, tripData.current_speed, new Date());
      } catch (err) {
        console.error('OSRM fetch error:', err);
      }
    };

    fetchRoute();

    // Connect WebSocket
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    socketRef.current = io(apiUrl, { transports: ['websocket'] });

    socketRef.current.on('connect', () => {
      socketRef.current?.emit('join_trip_room', { trip_id: tripData.trip_id });
    });

    socketRef.current.on('vehicle_position', (data: any) => {
      if (data.trip_id !== tripData.trip_id) return;
      updateDriverPosition(data.lat, data.lng, data.speed_kmh, new Date(data.timestamp));
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [tripData.trip_id]);

  const updateDriverPosition = (lat: number, lng: number, speedKmh: number, timestamp: Date) => {
    if (!driverMarker.current || !completedPolyline.current || !remainingPolyline.current) return;
    
    const newLatLng: [number, number] = [lat, lng];
    driverMarker.current.setLatLng(newLatLng);

    const searchFrom = Math.max(0, closestPointIndex.current - 3);
    let closestIdx = closestPointIndex.current;
    let closestDist = Infinity;

    for (let i = searchFrom; i < fullRouteCoords.current.length; i++) {
      const routePoint = L.latLng(fullRouteCoords.current[i]);
      const dist = routePoint.distanceTo(L.latLng(newLatLng));
      if (dist < closestDist) {
        closestDist = dist;
        closestIdx = i;
      }
      if (i > closestPointIndex.current + 50 && dist > closestDist) break;
    }

    closestPointIndex.current = closestIdx;

    completedPolyline.current.setLatLngs(fullRouteCoords.current.slice(0, closestPointIndex.current + 1));
    remainingPolyline.current.setLatLngs(fullRouteCoords.current.slice(closestPointIndex.current));

    const totalPoints = fullRouteCoords.current.length;
    const remainingFrac = totalPoints > 0 ? 1 - (closestPointIndex.current / totalPoints) : 0;
    const remainingKm = Math.round(remainingFrac * totalDistanceKm.current);
    const etaMins = speedKmh > 5 ? Math.round((remainingKm / speedKmh) * 60) : null;

    onStatsUpdate({
      speed: Math.round(speedKmh),
      remainingKm,
      etaMins,
      lastPing: timestamp
    });
  };

  return <div ref={mapRef} style={{ height: '560px', width: '100%', zIndex: 1 }} className="rounded-xl overflow-hidden shadow-sm border border-zinc-200 dark:border-zinc-800" />;
}
