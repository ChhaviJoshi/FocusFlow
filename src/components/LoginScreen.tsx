
import React from 'react';
import { Brain, ArrowRight } from 'lucide-react';
import { getGoogleAuthUrl } from '../services/api';

interface LoginScreenProps {
  onLogin: () => void;
}

/**
 * Login screen — replaced fake form with real Google OAuth.
 * Clicking "Sign in with Google" navigates to the backend's /auth/google
 * endpoint, which redirects to Google's consent screen.
 * After consent, Google redirects back to /auth/google/callback,
 * which creates a session and redirects to the frontend.
 */
export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {

  const handleGoogleSignIn = () => {
    // Navigate to backend OAuth endpoint — this is a full page redirect, not a fetch
    window.location.href = getGoogleAuthUrl();
  };

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-violet-500/10 rounded-full blur-[100px]" />
      </div>

      <div className="max-w-md w-full bg-[#0b1221] rounded-2xl p-8 border border-slate-800/60 shadow-2xl shadow-black/50 relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-cyan-950/30 rounded-2xl mb-4 border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
            <Brain className="w-8 h-8 text-cyan-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">FocusFlow</h1>
          <p className="text-slate-400 text-sm">
            Your AI-powered executive assistant for context-aware prioritization.
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleGoogleSignIn}
            className="w-full bg-white hover:bg-gray-50 text-gray-800 font-semibold py-3.5 rounded-lg shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-3 group"
          >
            {/* Google "G" logo SVG */}
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Sign in with Google
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-700/50"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-[#0b1221] px-3 text-slate-500">secure enterprise auth</span>
            </div>
          </div>

          <p className="text-center text-xs text-slate-500 leading-relaxed">
            Signing in grants FocusFlow read-only access to your Gmail and 
            Google Calendar to analyze and prioritize your tasks.
            <br />
            <span className="text-slate-600">No data is stored permanently without your consent.</span>
          </p>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-800/60">
          <div className="flex items-center justify-center gap-6 text-[10px] text-slate-600 uppercase tracking-wider">
            <span>Gmail</span>
            <span className="w-1 h-1 rounded-full bg-slate-700" />
            <span>Calendar</span>
            <span className="w-1 h-1 rounded-full bg-slate-700" />
            <span>Slack</span>
            <span className="w-1 h-1 rounded-full bg-slate-700" />
            <span>Jira</span>
          </div>
        </div>
      </div>
    </div>
  );
};
