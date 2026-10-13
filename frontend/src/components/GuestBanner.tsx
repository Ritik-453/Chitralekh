import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight, X, UserPlus, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const GuestBanner: React.FC = () => {
  const { isGuest } = useAuth();
  const [isDismissed, setIsDismissed] = useState(false);

  if (!isGuest || isDismissed) return null;

  return (
    <aside
      aria-label="Guest Mode Notification"
      className="bg-gradient-to-r from-amber-500 via-orange-500 to-indigo-600 text-white px-3 sm:px-4 py-2 text-xs font-medium shadow-sm flex items-center justify-between gap-3 relative z-30"
    >
      <div className="flex items-center gap-2 truncate">
        <span className="p-1 rounded-full bg-white/20 flex-shrink-0 animate-pulse">
          <Sparkles className="w-3.5 h-3.5 text-amber-200" />
        </span>
        <span className="truncate">
          <strong className="font-bold">Guest Mode:</strong> You're trying Chitralekh without an account. Notes are local to this device.
        </span>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <Link
          to="/register"
          className="px-2.5 py-1 rounded-lg bg-white text-secondary-900 hover:bg-white/90 font-bold text-[11px] transition shadow-xs flex items-center gap-1"
        >
          <UserPlus className="w-3 h-3 text-primary-600" />
          <span className="hidden sm:inline">Sign Up Free</span>
          <span className="sm:hidden">Sign Up</span>
        </Link>
        <Link
          to="/login"
          className="px-2.5 py-1 rounded-lg bg-black/20 hover:bg-black/30 text-white text-[11px] font-semibold transition"
        >
          Log In
        </Link>
        <button
          type="button"
          onClick={() => setIsDismissed(true)}
          className="p-1 rounded-md hover:bg-white/20 transition text-white/80 hover:text-white"
          title="Dismiss banner"
          aria-label="Dismiss guest banner"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </aside>
  );
};
