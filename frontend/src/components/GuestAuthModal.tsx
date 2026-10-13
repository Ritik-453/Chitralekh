import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Lock, Sparkles, LogIn, UserPlus, HardDrive, ArrowRight, CheckCircle2 } from 'lucide-react';

interface GuestAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  actionText?: string;
  onDownloadLocal?: () => void;
}

export const GuestAuthModal: React.FC<GuestAuthModalProps> = ({
  isOpen,
  onClose,
  title = 'Create an Account to Continue',
  description = 'You are currently exploring Chitralekh in Guest Mode. Please sign in or create an account to save your notes to the cloud and contribute to the Central Repository.',
  actionText = 'Sign in to unlock full cloud access',
  onDownloadLocal,
}) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-white dark:bg-secondary-900 border border-secondary-200 dark:border-secondary-700 rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-8 space-y-6">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-200 hover:bg-secondary-100 dark:hover:bg-secondary-800 transition"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon & Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-primary-500/10 dark:bg-primary-500/20 text-primary-600 dark:text-primary-400 border border-primary-500/30 mx-auto flex items-center justify-center shadow-inner">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-secondary-900 dark:text-white">
            {title}
          </h2>
          <p className="text-xs sm:text-sm text-secondary-500 dark:text-secondary-400 leading-relaxed">
            {description}
          </p>
        </div>

        {/* Perks list */}
        <div className="p-4 rounded-2xl bg-secondary-50 dark:bg-secondary-800/60 border border-secondary-200 dark:border-secondary-700/60 space-y-2.5 text-xs text-secondary-700 dark:text-secondary-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            <span>Store notes in cloud & sync across mobile and laptop</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            <span>Publish notes to Central Academic Repository</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            <span>Fork notes and contribute new versions for upcoming batches</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => {
              onClose();
              navigate('/register');
            }}
            className="w-full py-3 px-4 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-semibold text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-primary-600/30"
          >
            <UserPlus className="w-4 h-4" />
            <span>Create Free Account</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              navigate('/login');
            }}
            className="w-full py-2.5 px-4 rounded-xl border border-secondary-300 dark:border-secondary-700 bg-white dark:bg-secondary-800 hover:bg-secondary-50 dark:hover:bg-secondary-700 text-secondary-700 dark:text-secondary-200 font-medium text-sm transition flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            <span>Already have an account? Sign In</span>
          </button>

          {onDownloadLocal && (
            <button
              type="button"
              onClick={() => {
                onDownloadLocal();
                onClose();
              }}
              className="w-full py-2 px-3 text-xs text-secondary-500 hover:text-secondary-700 dark:hover:text-secondary-300 flex items-center justify-center gap-1.5 transition"
            >
              <HardDrive className="w-3.5 h-3.5 text-emerald-500" />
              <span>Or download note directly to local device as .md</span>
            </button>
          )}

          <div className="pt-1 text-center">
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-200 transition underline underline-offset-4"
            >
              Continue exploring as guest
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
