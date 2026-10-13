import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, Search, Plus, Bell, Moon, Sun, Monitor, User, LogOut, Settings, ChevronDown, Command, Key } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useTourStatus } from '../hooks/useTourStatus';
import { cn } from '../utils';

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user, isGuest, logout } = useAuth();
  const { theme, resolvedTheme, toggleTheme, setTheme } = useTheme();
  const { isCompleted: isTourCompleted } = useTourStatus();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  const [autoSaveEnabled, setAutoSaveEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('notes_autosave_enabled');
    return saved !== null ? saved === 'true' : true;
  });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };

    const syncAutosave = () => {
      const saved = localStorage.getItem('notes_autosave_enabled');
      setAutoSaveEnabled(saved !== null ? saved === 'true' : true);
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('storage', syncAutosave);
    window.addEventListener('notes-autosave-changed' as any, syncAutosave);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('storage', syncAutosave);
      window.removeEventListener('notes-autosave-changed' as any, syncAutosave);
    };
  }, []);

  const toggleAutoSave = () => {
    const next = !autoSaveEnabled;
    setAutoSaveEnabled(next);
    localStorage.setItem('notes_autosave_enabled', String(next));
    window.dispatchEvent(new CustomEvent('notes-autosave-changed', { detail: { enabled: next } }));
  };

  const handleStartTour = () => {
    window.dispatchEvent(new CustomEvent('start-newbie-tour'));
  };

  const handleNewNote = () => {
    navigate(`/notes/new?fresh=${Date.now()}`);
  };

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
  };

  return (
    <header className="sticky top-0 z-30 bg-white/80 dark:bg-secondary-900/80 backdrop-blur-sm border-b border-secondary-200 dark:border-secondary-700">
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="lg:hidden btn-ghost p-2"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          <div className="relative hidden sm:block" data-tour="search-bar">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400 pointer-events-none" aria-hidden="true" />
            <input
              type="text"
              placeholder="Search notes..."
              className="input pl-10 pr-14 w-64 sm:w-80 md:w-96"
              aria-label="Search notes"
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  navigate(`/search?q=${encodeURIComponent(e.currentTarget.value)}`);
                }
              }}
            />
            <kbd className="hidden md:inline-flex items-center gap-1 px-1.5 py-0.5 bg-secondary-100 dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 rounded text-[10px] text-secondary-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <Command className="w-3 h-3" />
              <span>K</span>
            </kbd>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Autosave Toggle in Topbar */}
          <button
            type="button"
            data-tour="autosave-toggle"
            onClick={toggleAutoSave}
            className={cn(
              "hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer shadow-2xs",
              autoSaveEnabled
                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700"
                : "bg-secondary-100 dark:bg-secondary-800 text-secondary-600 dark:text-secondary-400 border-secondary-300 dark:border-secondary-700"
            )}
            title={autoSaveEnabled ? "Autosave is ON (Click to toggle)" : "Autosave is OFF (Click to toggle)"}
          >
            <span className={cn("w-2 h-2 rounded-full", autoSaveEnabled ? "bg-emerald-500 animate-pulse" : "bg-secondary-400")} />
            <span>Autosave: {autoSaveEnabled ? "ON" : "OFF"}</span>
          </button>

          {!isTourCompleted && (
            <button
              type="button"
              onClick={handleStartTour}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1.5 transition shrink-0 cursor-pointer"
              title="Start Feature Tour"
            >
              <span>📌</span>
              <span className="hidden md:inline">Feature Tour</span>
            </button>
          )}

          <button
            onClick={handleNewNote}
            data-tour="new-note-header"
            className="btn-primary hidden sm:flex items-center gap-2"
            aria-label="Create new note"
          >
            <Plus className="w-4 h-4" />
            <span>New Note</span>
          </button>
          <button
            onClick={handleNewNote}
            className="btn-primary sm:hidden p-2"
            aria-label="Create new note"
          >
            <Plus className="w-5 h-5" />
          </button>

          <div className="relative" ref={notificationsRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="btn-ghost p-2 relative"
              aria-label="Notifications"
              aria-expanded={showNotifications}
            >
              <Bell className="w-5 h-5 text-secondary-600 dark:text-secondary-400" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-secondary-800 rounded-lg shadow-lg border border-secondary-200 dark:border-secondary-700 animate-fade-in">
                <div className="p-3 border-b border-secondary-200 dark:border-secondary-700">
                  <h3 className="font-medium text-secondary-900 dark:text-white">Notifications</h3>
                </div>
                <div className="p-4 text-center text-secondary-500">
                  No notifications yet
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1" data-tour="theme-profile">
            <button
              onClick={toggleTheme}
              className="btn-ghost p-2"
              aria-label={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {resolvedTheme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {isGuest && (
              <div className="hidden sm:flex items-center gap-1.5">
                <Link
                  to="/login"
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-secondary-300 dark:border-secondary-700 text-secondary-700 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-800 transition"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  className="px-2.5 py-1 text-xs font-bold rounded-lg bg-primary-600 text-white hover:bg-primary-500 transition shadow-xs"
                >
                  Sign Up
                </Link>
              </div>
            )}

            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors"
                aria-label="User menu"
                aria-expanded={showUserMenu}
              >
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt="" className="w-7 h-7 rounded-full" />
                ) : (
                  <div className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs',
                    isGuest
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-400/50'
                      : 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                  )}>
                    {isGuest ? '👀' : (user?.full_name?.charAt(0).toUpperCase() || user?.email.charAt(0).toUpperCase())}
                  </div>
                )}
                <ChevronDown className="w-4 h-4 text-secondary-500 hidden sm:block" />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-60 bg-white dark:bg-secondary-800 rounded-2xl shadow-xl border border-secondary-200 dark:border-secondary-700 animate-fade-in z-50 overflow-hidden">
                  {isGuest ? (
                    <div className="p-3.5 border-b border-secondary-200 dark:border-secondary-700 bg-amber-500/10">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-amber-800 dark:text-amber-300">Guest Mode</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-400/20 text-amber-700 dark:text-amber-300 font-semibold">Demo</span>
                      </div>
                      <p className="text-[11px] text-secondary-600 dark:text-secondary-400 mt-1">
                        Notes are stored in browser memory.
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        <Link
                          to="/register"
                          onClick={() => setShowUserMenu(false)}
                          className="flex-1 py-1.5 px-2 text-center rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-bold text-xs shadow-xs transition"
                        >
                          Sign Up
                        </Link>
                        <Link
                          to="/login"
                          onClick={() => setShowUserMenu(false)}
                          className="flex-1 py-1.5 px-2 text-center rounded-xl border border-secondary-300 dark:border-secondary-700 hover:bg-secondary-100 dark:hover:bg-secondary-700 text-secondary-800 dark:text-secondary-200 font-medium text-xs transition"
                        >
                          Sign In
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 border-b border-secondary-200 dark:border-secondary-700">
                      <p className="font-medium text-secondary-900 dark:text-white truncate">{user?.full_name || 'User'}</p>
                      <p className="text-sm text-secondary-500 truncate">{user?.email}</p>
                    </div>
                  )}
                  {!isTourCompleted && (
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        handleStartTour();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors text-left"
                    >
                      <span>📌</span>
                      <span>Restart Feature Tour</span>
                    </button>
                  )}
                  <NavLink
                    to="/profile"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-secondary-700 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-700"
                  >
                    <User className="w-4 h-4" />
                    Profile
                  </NavLink>
                  <NavLink
                    to="/settings"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-secondary-700 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-700"
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                  </NavLink>
                  <hr className="my-1 border-secondary-200 dark:border-secondary-700" />
                  <div className="px-2 py-1 space-y-1">
                    <p className="px-3 py-1 text-xs font-medium text-secondary-500 uppercase">Theme</p>
                    {(['light', 'dark', 'system'] as const).map(t => (
                      <button
                        key={t}
                        onClick={() => handleThemeChange(t)}
                        className={cn(
                          'w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors',
                          theme === t
                            ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                            : 'text-secondary-700 hover:bg-secondary-100 dark:text-secondary-300 dark:hover:bg-secondary-700'
                        )}
                      >
                        {t === 'light' && <Sun className="w-4 h-4" />}
                        {t === 'dark' && <Moon className="w-4 h-4" />}
                        {t === 'system' && <Monitor className="w-4 h-4" />}
                        <span className="capitalize">{t}</span>
                        {theme === t && <span className="ml-auto text-primary-600">✓</span>}
                      </button>
                    ))}
                  </div>
                  <hr className="my-1 border-secondary-200 dark:border-secondary-700" />
                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    {isGuest ? 'Exit Guest Mode' : 'Logout'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}