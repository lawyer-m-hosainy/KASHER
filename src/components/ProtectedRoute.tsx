import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: ('owner' | 'cashier')[];
  requireActiveSubscription?: boolean;
  requireAdmin?: boolean;
}

export const ProtectedRoute = ({ children, allowedRoles, requireActiveSubscription = true, requireAdmin = false }: ProtectedRouteProps) => {
  const { user, appUser, shop, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">جاري التحميل...</div>;
  }

  if (!user || !appUser) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && !appUser.isAdmin) {
    return <Navigate to="/pos" replace />;
  }

  // Admin bypass
  if (appUser.isAdmin) {
      return <>{children}</>;
  }

  if (requireActiveSubscription && shop?.subscriptionStatus !== 'active') {
    return <Navigate to="/pending" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(appUser.role)) {
    return <Navigate to="/pos" replace />;
  }

  return <>{children}</>;
};
