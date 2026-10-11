import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, User, Eye, EyeOff, AlertCircle, Github, Globe, CheckCircle } from 'lucide-react';
import { cn } from '../utils';
import { API_URL } from '../services/api';
import toast from 'react-hot-toast';

export function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    confirm_password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.full_name.trim()) newErrors.full_name = 'Name is required';
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Invalid email format';
    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 8) newErrors.password = 'Password must be at least 8 characters';
    else if (!/[A-Z]/.test(formData.password)) newErrors.password = 'Password must contain uppercase letter';
    else if (!/[a-z]/.test(formData.password)) newErrors.password = 'Password must contain lowercase letter';
    else if (!/[0-9]/.test(formData.password)) newErrors.password = 'Password must contain a number';
    if (formData.password !== formData.confirm_password) newErrors.confirm_password = 'Passwords do not match';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    
    setIsLoading(true);
    try {
      await register(formData.email, formData.password, formData.full_name);
      localStorage.setItem('notes_is_first_time_signup', 'true');
      localStorage.removeItem('notes_tour_completed');
      navigate('/');
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Registration failed';
      toast.error(message);
      if (message.includes('email')) setErrors({ email: message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthLogin = (provider: string) => {
    window.location.href = `${API_URL}/auth/oauth/${provider}`;
  };

  const passwordStrength = getPasswordStrength(formData.password);

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary-50 dark:bg-secondary-900 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span className="text-2xl font-bold text-secondary-900 dark:text-white">Notes</span>
          </Link>
          <h1 className="text-3xl font-bold text-secondary-900 dark:text-white">Create account</h1>
          <p className="mt-2 text-secondary-600 dark:text-secondary-400">Start organizing your notes today</p>
        </div>

        <div className="card p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="full_name" className="label">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" aria-hidden="true" />
                <input
                  id="full_name"
                  type="text"
                  value={formData.full_name}
                  onChange={e => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                  className={cn('input pl-10', errors.full_name && 'input-error')}
                  placeholder="John Doe"
                  autoComplete="name"
                  disabled={isLoading}
                  aria-invalid={errors.full_name ? 'true' : 'false'}
                />
              </div>
              {errors.full_name && (
                <p className="mt-1 text-sm text-red-500 flex items-center gap-1" role="alert">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.full_name}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="label">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" aria-hidden="true" />
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className={cn('input pl-10', errors.email && 'input-error')}
                  placeholder="you@example.com"
                  autoComplete="email"
                  disabled={isLoading}
                  aria-invalid={errors.email ? 'true' : 'false'}
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-500 flex items-center gap-1" role="alert">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.email}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="label">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" aria-hidden="true" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={e => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  className={cn('input pl-10 pr-10', errors.password && 'input-error')}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  disabled={isLoading}
                  aria-invalid={errors.password ? 'true' : 'false'}
                  aria-describedby="password-strength"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-400 hover:text-secondary-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-500 flex items-center gap-1" role="alert">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.password}
                </p>
              )}
              <div id="password-strength" className="mt-2" role="progressbar" aria-valuenow={passwordStrength} aria-valuemin={0} aria-valuemax={5} aria-label="Password strength">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(level => (
                    <div
                      key={level}
                      className="h-1.5 flex-1 rounded transition-colors"
                      style={{
                        backgroundColor: level <= passwordStrength
                          ? level <= 2 ? '#ef4444' : level <= 4 ? '#f59e0b' : '#22c55e'
                          : '#e2e8f0',
                      }}
                    />
                  ))}
                </div>
                <p className="mt-1 text-xs text-secondary-500">
                  {['Very weak', 'Weak', 'Fair', 'Strong', 'Very strong'][passwordStrength - 1] || 'Enter password'}
                </p>
              </div>
            </div>

            <div>
              <label htmlFor="confirm_password" className="label">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" aria-hidden="true" />
                <input
                  id="confirm_password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.confirm_password}
                  onChange={e => setFormData(prev => ({ ...prev, confirm_password: e.target.value }))}
                  className={cn('input pl-10', errors.confirm_password && 'input-error')}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  disabled={isLoading}
                  aria-invalid={errors.confirm_password ? 'true' : 'false'}
                />
              </div>
              {errors.confirm_password && (
                <p className="mt-1 text-sm text-red-500 flex items-center gap-1" role="alert">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.confirm_password}
                </p>
              )}
            </div>

            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="terms"
                required
                className="mt-1 rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="terms" className="text-sm text-secondary-600 dark:text-secondary-400">
                I agree to the{' '}
                <Link to="/terms" className="text-primary-600 hover:underline">Terms of Service</Link>
                {' '}and{' '}
                <Link to="/privacy" className="text-primary-600 hover:underline">Privacy Policy</Link>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-3"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating account...
                </span>
              ) : (
                'Create account'
              )}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-secondary-200 dark:border-secondary-700" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-secondary-800 text-secondary-500">Or continue with</span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => handleOAuthLogin('github')}
                disabled={isLoading}
                className="btn-secondary flex items-center justify-center gap-2"
                aria-label="Sign up with GitHub"
              >
                <Github className="w-5 h-5" />
                <span className="hidden sm:inline">GitHub</span>
              </button>
              <button
                type="button"
                onClick={() => handleOAuthLogin('google')}
                disabled={isLoading}
                className="btn-secondary flex items-center justify-center gap-2"
                aria-label="Sign up with Google"
              >
                <Globe className="w-5 h-5" />
                <span className="hidden sm:inline">Google</span>
              </button>
              <button
                type="button"
                onClick={() => handleOAuthLogin('microsoft')}
                disabled={isLoading}
                className="btn-secondary flex items-center justify-center gap-2"
                aria-label="Sign up with Microsoft"
              >
                <Globe className="w-5 h-5" />
                <span className="hidden sm:inline">Microsoft</span>
              </button>
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-secondary-600 dark:text-secondary-400">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;