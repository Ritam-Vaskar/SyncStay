import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { authService } from '@/services/apiServices';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import toast from 'react-hot-toast';
import { LogIn, Sun, Moon } from 'lucide-react';

export const LoginPage = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const { isDark, toggleTheme } = useThemeStore();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();

  const onSubmit = async (data) => {
    try {
      const response = await authService.login(data);
      setAuth(response.data.user, response.data.token);
      toast.success('Login successful!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.message || 'Login failed');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950 px-4 relative">
      <button
        onClick={toggleTheme}
        className="absolute top-4 right-4 p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>
      <div className="w-full max-w-md">
        <div className="card">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-primary-600">StaySync</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Sign in to your account</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email
              </label>
              <input
                type="email"
                {...register('email', { required: 'Email is required' })}
                className="input"
                placeholder="you@example.com"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Password
              </label>
              <input
                type="password"
                {...register('password', { required: 'Password is required' })}
                className="input"
                placeholder="••••••••"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary w-full flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <span>Signing in...</span>
              ) : (
                <>
                  <LogIn className="h-5 w-5" />
                  Sign In
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Don't have an account?{' '}
              <Link to="/register" className="font-medium text-primary-600 hover:text-primary-700">
                Register
              </Link>
            </p>
          </div>

          {/* Demo Credentials */}
          <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-6">
            <p className="text-xs text-gray-500 dark:text-gray-500 mb-2 font-semibold">Demo Credentials:</p>
            <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
              <p>Admin: admin@example.com / password123</p>
              <p>Planner: planner@example.com / password123</p>
              <p>Hotel: hotel1@example.com / password123</p>
              <p>Guest: guest1@example.com / password123</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
