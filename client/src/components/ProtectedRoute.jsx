import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

export const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    console.log('🔒 ProtectedRoute check:', {
      path: location.pathname,
      isAuthenticated,
      user: user ? { id: user._id, role: user.role, email: user.email } : null,
      allowedRoles
    });
  }, [isAuthenticated, user, location.pathname, allowedRoles]);

  if (!isAuthenticated) {
    console.log('❌ Not authenticated, redirecting...');
    // For microsite routes, redirect back to the microsite page
    if (location.pathname.startsWith('/microsite/')) {
      const slug = location.pathname.split('/')[2];
      toast.error('Please login to access the dashboard');
      return <Navigate to={`/microsite/${slug}`} replace />;
    }
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    console.log(`❌ User role ${user.role} not in allowed roles:`, allowedRoles);
    toast.error('You do not have permission to access this page');
    return <Navigate to="/unauthorized" replace />;
  }

  console.log('✅ Access granted!');
  return <>{children}</>;
};
