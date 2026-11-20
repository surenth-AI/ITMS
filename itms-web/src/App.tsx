import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Trips from './pages/Trips';
import Clients from './pages/Clients';
import Drivers from './pages/Drivers';
import Vehicles from './pages/Vehicles';
import Alerts from './pages/Alerts';
import Warehouses from './pages/Warehouses';
import Shipments from './pages/Shipments';
import TripDetail from './pages/TripDetail';
import LiveTracking from './pages/LiveTracking';
import Locations from './pages/Locations';
import Users from './pages/Users';
import Settings from './pages/Settings';
import Notifications from './pages/Notifications';
import Attendance from './pages/Attendance';
import AIAudit from './pages/AIAudit';
import TrackingPortal from './pages/TrackingPortal';
import Layout from './components/Layout';
import Bookings from './pages/Bookings';
import BookingDetail from './pages/BookingDetail';
import BookingForm from './pages/BookingForm';
import ServiceTypes from './pages/ServiceTypes';
import PriceLists from './pages/PriceLists';
import QuotesManager from './pages/QuotesManager';
import InvoicesManager from './pages/InvoicesManager';
import InvoiceDetail from './pages/InvoiceDetail';
import PodOutstanding from './pages/PodOutstanding';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { token } = useAuthStore();
  if (!token) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/track" element={<TrackingPortal />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/bookings" element={<ProtectedRoute><Bookings /></ProtectedRoute>} />
        <Route path="/bookings/new" element={<ProtectedRoute><BookingForm /></ProtectedRoute>} />
        <Route path="/bookings/:id" element={<ProtectedRoute><BookingDetail /></ProtectedRoute>} />
        <Route path="/service-types" element={<ProtectedRoute><ServiceTypes /></ProtectedRoute>} />
        <Route path="/price-lists" element={<ProtectedRoute><PriceLists /></ProtectedRoute>} />
        <Route path="/quotes" element={<ProtectedRoute><QuotesManager /></ProtectedRoute>} />
        <Route path="/invoices" element={<ProtectedRoute><InvoicesManager /></ProtectedRoute>} />
        <Route path="/invoices/:id" element={<ProtectedRoute><InvoiceDetail /></ProtectedRoute>} />
        <Route path="/pod-outstanding" element={<ProtectedRoute><PodOutstanding /></ProtectedRoute>} />
        <Route path="/trips" element={<ProtectedRoute><Trips /></ProtectedRoute>} />
        <Route path="/trips/:id" element={<ProtectedRoute><TripDetail /></ProtectedRoute>} />
        <Route path="/trips/:id/track" element={<ProtectedRoute><LiveTracking /></ProtectedRoute>} />
        <Route path="/clients" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
        <Route path="/drivers" element={<ProtectedRoute><Drivers /></ProtectedRoute>} />
        <Route path="/users" element={<ProtectedRoute><Users /></ProtectedRoute>} />
        <Route path="/fleet" element={<ProtectedRoute><Vehicles /></ProtectedRoute>} />
        <Route path="/alerts" element={<ProtectedRoute><Alerts /></ProtectedRoute>} />
        <Route path="/warehouses" element={<ProtectedRoute><Warehouses /></ProtectedRoute>} />
        <Route path="/shipments" element={<ProtectedRoute><Shipments /></ProtectedRoute>} />
        <Route path="/locations" element={<ProtectedRoute><Locations /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
        <Route path="/attendance" element={<ProtectedRoute><Attendance /></ProtectedRoute>} />
        <Route path="/ai-audit" element={<ProtectedRoute><AIAudit /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
