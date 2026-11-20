import api from './api';
import { Trip } from '../store/tripStore';

export const fetchTodayTrips = async (): Promise<Trip[]> => {
  const response = await api.get('/trips/today');
  return response.data.trips;
};

export const startTrip = async (tripId: string): Promise<void> => {
  await api.post(`/trips/${tripId}/start`);
};

export const completeTrip = async (tripId: string): Promise<void> => {
  await api.post(`/trips/${tripId}/complete`);
};
