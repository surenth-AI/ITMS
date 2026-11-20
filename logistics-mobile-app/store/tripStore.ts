import { create } from 'zustand';

export interface Trip {
  id: string;
  reference: string;
  status: 'draft' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'failed';
  planned_start: string;
  client_id: string;
  stops?: number;
  vehicle_id?: string;
}

interface TripState {
  todayTrips: Trip[];
  activeTrip: Trip | null;
  setTrips: (trips: Trip[]) => void;
  setActiveTrip: (trip: Trip | null) => void;
  updateTripStatus: (tripId: string, status: Trip['status']) => void;
}

export const useTripStore = create<TripState>((set) => ({
  todayTrips: [],
  activeTrip: null,
  setTrips: (trips) => set({ todayTrips: trips }),
  setActiveTrip: (trip) => set({ activeTrip: trip }),
  updateTripStatus: (tripId, status) => set((state) => ({
    todayTrips: state.todayTrips.map(t => t.id === tripId ? { ...t, status } : t),
    activeTrip: state.activeTrip?.id === tripId ? { ...state.activeTrip, status } : state.activeTrip
  }))
}));
