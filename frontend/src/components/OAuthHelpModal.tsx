import React, { useState } from 'react';
import { Copy, Check, ExternalLink, X, ShieldAlert, Sparkles, ArrowRight } from 'lucide-react';
import { API_URL } from '../services/api';

interface OAuthHelpModalProps {
  provider: 'github' | 'google' | null;
  onClose: () => void;
  onContinueGuest: () => void;
}

export const OAuthHelpModal: React.FC<OAuthHelpModalProps> = ({
  provider,
  onClose,
  onContinueGuest,
}) => {
  const [copied, setCopied] = useState(false);

  if (!provider) return null;

  const callbackUrl = `https://chitralekh-backend-fj80.onrender.com/api/v1/auth/oauth/${provider}/callback`;

  const providerConfigs = {
    github: {
      name: 'GitHub',
      color: 'bg-gray-900 text-white',
      badgeColor: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
      consoleUrl: 'https://github.com/settings/developers',
      consoleName: 'GitHub Developer Settings',
      clientIdKey: 'GITHUB_CLIENT_ID',
      clientSecretKey: 'GITHUB_CLIENT_SECRET',
      instructions: [
        'Click "New OAuth App" in GitHub Developer Settings.',
        'Set Application Name to "Chitralekh" and Homepage URL to "https://chitralekh-frontend.onrender.com".',
        'Paste the Callback URL below into "Authorization callback URL".',
        'Click "Register application", then generate a Client Secret.',
        'Add the Client ID and Client Secret in Render Environment variables.',
      ],
    },
    google: {
      name: 'Google',
      color: 'bg-red-600 text-white',
      badgeColor: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300',
      consoleUrl: 'https://console.cloud.google.com/apis/credentials',
      consoleName: 'Google Cloud Console (Credentials)',
      clientIdKey: 'GOOGLE_CLIENT_ID',
      clientSecretKey: 'GOOGLE_CLIENT_SECRET',
      instructions: [
        'Open Google Cloud Console > APIs & Services > Credentials.',
        'Click "+ CREATE CREDENTIALS" > "OAuth client ID".',
        'Select Application type: "Web application".',
        'Add "https://chitralekh-frontend.onrender.com" to Authorized JavaScript origins.',
        'Paste the Callback URL below into Authorized redirect URIs.',
        'Add the generated Client ID and Client Secret in Render Environment variables.',
      ],
    },
  };

  const config = providerConfigs[provider];

  const handleCopy = () => {
    navigator.clipboard.writeText(callbackUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white dark:bg-secondary-800 rounded-2xl shadow-2xl border border-secondary-200 dark:border-secondary-700 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-secondary-200 dark:border-secondary-700 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-secondary-900 dark:text-white text-base">
                Configure {config.name} OAuth
              </h3>
              <p className="text-xs text-secondary-500">Render Environment Setup Required</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-200 hover:bg-secondary-100 dark:hover:bg-secondary-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          <p className="text-sm text-secondary-600 dark:text-secondary-300">
            To enable 1-click {config.name} sign-in on your live Render deployment, the application needs your OAuth client keys.
          </p>

          {/* Callback URL Card */}
          <div className="p-3.5 bg-secondary-50 dark:bg-secondary-900/60 rounded-xl border border-secondary-200 dark:border-secondary-700">
            <span className="text-xs font-semibold text-secondary-500 uppercase tracking-wider block mb-1.5">
              1. Authorized Redirect Callback URL
            </span>
            <div className="flex items-center gap-2">
              <code className="text-xs font-mono bg-white dark:bg-secondary-950 px-2.5 py-1.5 rounded-lg border border-secondary-200 dark:border-secondary-800 text-secondary-800 dark:text-secondary-200 flex-1 truncate">
                {callbackUrl}
              </code>
              <button
                type="button"
                onClick={handleCopy}
                className="btn-secondary py-1 px-2.5 text-xs flex items-center gap-1.5 flex-shrink-0"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Quick Steps */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-secondary-500 uppercase tracking-wider block">
              2. Steps to Configure
            </span>
            <ol className="space-y-2 text-xs text-secondary-600 dark:text-secondary-300">
              {config.instructions.map((step, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-primary-100 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 font-bold flex items-center justify-center flex-shrink-0 text-[10px] mt-0.5">
                    {idx + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Environment Variables on Render */}
          <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
            <span className="text-xs font-semibold text-indigo-900 dark:text-indigo-300 block mb-1.5">
              3. Set in Render Dashboard &gt; chitralekh-backend &gt; Environment:
            </span>
            <div className="space-y-1 font-mono text-[11px] text-indigo-800 dark:text-indigo-200">
              <div className="bg-white/80 dark:bg-secondary-900/80 px-2 py-1 rounded border border-indigo-100 dark:border-indigo-900/40">
                <span className="font-bold">{config.clientIdKey}</span> = &lt;your_client_id&gt;
              </div>
              <div className="bg-white/80 dark:bg-secondary-900/80 px-2 py-1 rounded border border-indigo-100 dark:border-indigo-900/40">
                <span className="font-bold">{config.clientSecretKey}</span> = &lt;your_client_secret&gt;
              </div>
            </div>
          </div>

          {/* Direct link to developer console */}
          <a
            href={config.consoleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline"
          >
            <span>Open {config.consoleName}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 bg-secondary-50 dark:bg-secondary-900/50 border-t border-secondary-200 dark:border-secondary-700 flex flex-col sm:flex-row gap-2.5 justify-between">
          <button
            type="button"
            onClick={() => {
              onClose();
              onContinueGuest();
            }}
            className="btn-primary py-2 text-xs flex items-center justify-center gap-2"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Continue as Guest (No setup needed)</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary py-2 text-xs flex-1 sm:flex-initial"
            >
              Sign In with Email
            </button>
            <a
              href={`${API_URL}/auth/oauth/${provider}`}
              className="btn-secondary py-2 text-xs text-secondary-500 hover:text-secondary-700 dark:hover:text-secondary-200 flex items-center gap-1"
            >
              <span>Try OAuth anyway</span>
              <ArrowRight className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
