import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { authService } from '@/services/apiServices';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import toast from 'react-hot-toast';
import { UserPlus, Sun, Moon } from 'lucide-react';

export const RegisterPage = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const { isDark, toggleTheme } = useThemeStore();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();

  const onSubmit = async (data) => {
    try {
      const response = await authService.register(data);
      setAuth(response.data.user, response.data.token);
      toast.success('Registration successful!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.message || 'Registration failed');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950 px-4 py-12 relative">
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
            <p className="mt-2 text-gray-600 dark:text-gray-400">Create your account</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Name</label>
              <input
                type="text"
                {...register('name', { required: 'Name is required' })}
                className="input"
                placeholder="John Doe"
              />
              {errors.name && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email</label>
              <input
                type="email"
                {...register('email', { required: 'Email is required' })}
                className="input"
                placeholder="you@example.com"
              />
              {errors.email && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Password</label>
              <input
                type="password"
                {...register('password', {
                  required: 'Password is required',
                  minLength: { value: 6, message: 'Password must be at least 6 characters' },
                })}
                className="input"
                placeholder="••••••••"
              />
              {errors.password && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.password.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Role</label>
              <select {...register('role', { required: 'Role is required' })} className="input">
                <option value="guest">Guest / Attendee</option>
                <option value="planner">Event Planner</option>
                <option value="hotel">Hotel / Supplier</option>
              </select>
              {errors.role && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.role.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Phone (Optional)</label>
              <input type="tel" {...register('phone')} className="input" placeholder="+1 555 0100" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Organization (Optional)</label>
              <input
                type="text"
                {...register('organization')}
                className="input"
                placeholder="Your Company"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary w-full flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <span>Creating account...</span>
              ) : (
                <>
                  <UserPlus className="h-5 w-5" />
                  Create Account
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-primary-600 hover:text-primary-700">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
