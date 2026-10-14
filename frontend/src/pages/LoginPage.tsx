import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Mail, Lock, Eye, EyeOff, AlertCircle, Github, Globe, Sparkles } from 'lucide-react';
import { cn } from '../utils';
import { API_URL, setAccessToken } from '../services/api';
import { OAuthHelpModal } from '../components/OAuthHelpModal';
import toast from 'react-hot-toast';

export function LoginPage() {
  const navigate = useNavigate();
  const { login, loginAsGuest } = useAuth();
  const { resolvedTheme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [oauthStatus, setOauthStatus] = useState<{ google: boolean; github: boolean; microsoft: boolean }>({
    google: false,
    github: false,
    microsoft: false,
  });
  const [oauthHelpProvider, setOauthHelpProvider] = useState<'github' | 'google' | 'microsoft' | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/auth/oauth/status`)
      .then(res => res.json())
      .then(data => setOauthStatus(data))
      .catch(() => {});

    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const refresh = params.get('refresh');
    const oauthError = params.get('oauth_error');
    const provider = params.get('provider') as 'github' | 'google' | 'microsoft' | null;

    if (token) {
      const authTokens = { access_token: token, refresh_token: refresh || '', token_type: 'bearer' };
      localStorage.setItem('auth_tokens', JSON.stringify(authTokens));
      setAccessToken(token);
      toast.success('Successfully signed in with OAuth!');
      window.location.href = '/';
    } else if (oauthError) {
      toast.error(decodeURIComponent(oauthError), { duration: 6000 });
      if (provider) {
        setOauthHelpProvider(provider);
      }
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const validate = () => {
    const newErrors: { email?: string; password?: string } = {};
    if (!email) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = 'Invalid email format';
    if (!password) newErrors.password = 'Password is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    
    setIsLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Login failed';
      toast.error(message);
      if (message.includes('email')) setErrors({ email: message });
      if (message.includes('password')) setErrors({ password: message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthLogin = (provider: 'github' | 'google' | 'microsoft') => {
    if (!oauthStatus[provider]) {
      setOauthHelpProvider(provider);
      return;
    }
    window.location.href = `${API_URL}/auth/oauth/${provider}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary-50 dark:bg-secondary-900 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-4">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-primary-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-primary-600/30">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="flex flex-col text-left">
              <span className="text-2xl font-black bg-gradient-to-r from-primary-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">Chitralekh</span>
              <span className="text-[10px] -mt-1 font-semibold text-secondary-400 dark:text-secondary-500 tracking-wider">चित्रलेख • Visual Notes</span>
            </div>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-secondary-900 dark:text-white">Welcome back</h1>
          <p className="mt-1.5 text-xs sm:text-sm text-secondary-600 dark:text-secondary-400">Sign in to sync your personal notes & flowcharts</p>
        </div>

        <div className="card p-6 sm:p-8 space-y-6">
          {/* Continue as Guest Button */}
          <div>
            <button
              type="button"
              onClick={() => {
                loginAsGuest();
                navigate('/');
              }}
              className="w-full py-3 px-4 rounded-xl border-2 border-indigo-500/40 hover:border-indigo-500 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 hover:from-indigo-500/20 hover:to-purple-500/20 text-indigo-700 dark:text-indigo-300 font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-sm transform hover:scale-[1.01]"
            >
              <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
              <span>Continue as Guest (Try app instantly) 🚀</span>
            </button>
            <p className="text-[11px] text-center text-secondary-500 dark:text-secondary-400 mt-1.5">
              No registration needed to test Markdown, Mermaid charts & offline notes!
            </p>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-secondary-200 dark:border-secondary-700" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="px-3 bg-white dark:bg-secondary-800 text-secondary-500 font-semibold tracking-wider">
                Or Sign In With Account
              </span>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="label">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" aria-hidden="true" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className={cn('input pl-10', errors.email && 'input-error')}
                  placeholder="you@example.com"
                  autoComplete="email"
                  disabled={isLoading}
                  aria-invalid={errors.email ? 'true' : 'false'}
                  aria-describedby={errors.email ? 'email-error' : undefined}
                />
              </div>
              {errors.email && (
                <p id="email-error" className="mt-1 text-sm text-red-500 flex items-center gap-1" role="alert">
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
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className={cn('input pl-10 pr-10', errors.password && 'input-error')}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  disabled={isLoading}
                  aria-invalid={errors.password ? 'true' : 'false'}
                  aria-describedby={errors.password ? 'password-error' : undefined}
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
                <p id="password-error" className="mt-1 text-sm text-red-500 flex items-center gap-1" role="alert">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.password}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-secondary-700 dark:text-secondary-300">Remember me</span>
              </label>
              <Link to="/forgot-password" className="text-sm text-primary-600 hover:underline">
                Forgot password?
              </Link>
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
                  Signing in...
                </span>
              ) : (
                'Sign in'
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
                aria-label="Sign in with GitHub"
              >
                <Github className="w-5 h-5" />
                <span className="hidden sm:inline">GitHub</span>
              </button>
              <button
                type="button"
                onClick={() => handleOAuthLogin('google')}
                disabled={isLoading}
                className="btn-secondary flex items-center justify-center gap-2"
                aria-label="Sign in with Google"
              >
                <Globe className="w-5 h-5" />
                <span className="hidden sm:inline">Google</span>
              </button>
              <button
                type="button"
                onClick={() => handleOAuthLogin('microsoft')}
                disabled={isLoading}
                className="btn-secondary flex items-center justify-center gap-2"
                aria-label="Sign in with Microsoft"
              >
                <Globe className="w-5 h-5" />
                <span className="hidden sm:inline">Microsoft</span>
              </button>
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-secondary-600 dark:text-secondary-400">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary-600 hover:underline font-medium">
              Sign up
            </Link>
          </p>
        </div>
      </div>

      <OAuthHelpModal
        provider={oauthHelpProvider}
        onClose={() => setOauthHelpProvider(null)}
        onContinueGuest={() => {
          loginAsGuest();
          navigate('/');
        }}
      />
    </div>
  );
}

export default LoginPage;