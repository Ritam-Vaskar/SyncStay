import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import api from '../services/api';

export const GuestInvitePage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [status, setStatus] = useState('loading'); // loading, success, error
  const [message, setMessage] = useState('Verifying your invitation...');
  const [eventData, setEventData] = useState(null);
  const hasProcessed = useRef(false);

  useEffect(() => {
    const handleInvitation = async () => {
      // Prevent multiple executions
      if (hasProcessed.current) {
        console.log('⏭️ Already processed, skipping...');
        return;
      }
      
      hasProcessed.current = true;

      try {
        console.log('🎫 Processing guest invitation token:', token);
        
        // Call the backend API to validate token and auto-login
        const response = await api.get(`/auth/guest-invite/${token}`);
        
        console.log('✅ API Response:', response);

        if (response.success) {
          const { user, token: authToken, refreshToken, event } = response.data;

          console.log('👤 User data:', user);
          console.log('🎟️ Event data:', event);

          // Store auth data
          localStorage.setItem('token', authToken);
          localStorage.setItem('refreshToken', refreshToken);
          localStorage.setItem('user', JSON.stringify(user));

          // Update auth store
          setAuth(user, authToken);

          setStatus('success');
          setMessage(`Welcome ${user.name}! Redirecting you to ${event.name}...`);
          setEventData(event);

          console.log('🔄 Redirecting to:', `/microsite/${event.micrositeSlug}`);

          // Redirect to microsite after 2 seconds
          setTimeout(() => {
            if (event.micrositeSlug) {
              navigate(`/microsite/${event.micrositeSlug}`, { replace: true });
            } else {
              navigate('/dashboard', { replace: true });
            }
          }, 2000);
        }
      } catch (error) {
        console.error('❌ Invitation error:', error);
        setStatus('error');
        setMessage(
          error.response?.data?.message || 
          'Invalid or expired invitation link. Please contact the event organizer.'
        );

        // Redirect to login page after 5 seconds
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 5000);
      }
    };

    if (token) {
      handleInvitation();
    } else {
      setStatus('error');
      setMessage('No invitation token provided');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          {/* Logo/Brand */}
          <div className="flex justify-center mb-6">
            <div className="bg-gradient-to-r from-primary-600 to-purple-600 p-4 rounded-2xl">
              <svg 
                className="w-12 h-12 text-white" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" 
                />
              </svg>
            </div>
          </div>

          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Event Invitation
          </h1>

          {/* Status Display */}
          <div className="my-8">
            {status === 'loading' && (
              <div className="flex flex-col items-center">
                <Loader2 className="h-16 w-16 text-primary-600 animate-spin mb-4" />
                <p className="text-gray-600">{message}</p>
              </div>
            )}

            {status === 'success' && (
              <div className="flex flex-col items-center">
                <div className="bg-green-100 rounded-full p-4 mb-4">
                  <CheckCircle className="h-16 w-16 text-green-600" />
                </div>
                <p className="text-gray-800 font-medium">{message}</p>
                {eventData && (
                  <div className="mt-4 p-4 bg-primary-50 rounded-lg">
                    <p className="text-sm text-gray-600">Event</p>
                    <p className="font-semibold text-primary-700">{eventData.name}</p>
                  </div>
                )}
              </div>
            )}

            {status === 'error' && (
              <div className="flex flex-col items-center">
                <div className="bg-red-100 rounded-full p-4 mb-4">
                  <XCircle className="h-16 w-16 text-red-600" />
                </div>
                <p className="text-gray-800 font-medium mb-2">Oops!</p>
                <p className="text-gray-600 text-sm">{message}</p>
                <button
                  onClick={() => navigate('/login')}
                  className="mt-6 btn btn-primary"
                >
                  Go to Login
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Powered by <span className="font-semibold text-primary-600">StaySync</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
