/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import Layout from './components/Layout';

import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import PendingActivationPage from './pages/PendingActivationPage';
import PosPage from './pages/PosPage';
import InventoryPage from './pages/InventoryPage';
import ReportsPage from './pages/ReportsPage';
import StaffPage from './pages/StaffPage';
import SettingsPage from './pages/SettingsPage';
import CustomersPage from './pages/CustomersPage';
import ExpensesPage from './pages/ExpensesPage';
import AdminDashboard from './pages/AdminDashboard';
import SalesHistoryPage from './pages/SalesHistoryPage';
import { Toaster } from 'sonner';
import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <Toaster position="top-center" richColors dir="rtl" />
      <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<AuthPage />} />
          <Route path="/pending" element={
            <ProtectedRoute requireActiveSubscription={false}>
              <PendingActivationPage />
            </ProtectedRoute>
          } />
          
          {/* Admin Dashboard */}
          <Route path="/admin" element={
            <ProtectedRoute requireActiveSubscription={false} requireAdmin={true}>
              <AdminDashboard />
            </ProtectedRoute>
          } />

          {/* App routes */}
          <Route element={<Layout />}>
            <Route path="/pos" element={
              <ProtectedRoute allowedRoles={['owner', 'cashier']}>
                <PosPage />
              </ProtectedRoute>
            } />
            <Route path="/inventory" element={
              <ProtectedRoute allowedRoles={['owner']}>
                <InventoryPage />
              </ProtectedRoute>
            } />
            <Route path="/reports" element={
              <ProtectedRoute allowedRoles={['owner']}>
                <ReportsPage />
              </ProtectedRoute>
            } />
            <Route path="/staff" element={
              <ProtectedRoute allowedRoles={['owner']}>
                <StaffPage />
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute allowedRoles={['owner']}>
                <SettingsPage />
              </ProtectedRoute>
            } />
            <Route path="/customers" element={
              <ProtectedRoute allowedRoles={['owner', 'cashier']}>
                <CustomersPage />
              </ProtectedRoute>
            } />
            <Route path="/expenses" element={
              <ProtectedRoute allowedRoles={['owner', 'cashier']}>
                <ExpensesPage />
              </ProtectedRoute>
            } />
            <Route path="/sales-history" element={
              <ProtectedRoute allowedRoles={['owner', 'cashier']}>
                <SalesHistoryPage />
              </ProtectedRoute>
            } />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </ErrorBoundary>
  );
}

