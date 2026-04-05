
import React, { useState, useEffect } from 'react';
import { LoginScreen } from './components/LoginScreen';
import { PermissionScreen } from './components/PermissionScreen';
import { Dashboard } from './components/Dashboard';
import { ErrorBoundary } from './components/ErrorBoundary';
import { getCurrentUser } from './services/api';

type AppStep = 'LOADING' | 'LOGIN' | 'PERMISSIONS' | 'DASHBOARD';

interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

interface ConnectedIntegration {
  provider: string;
  connected: boolean;
}

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>('LOADING');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [integrations, setIntegrations] = useState<ConnectedIntegration[]>([]);

  // On mount, check if user is already authenticated via session cookie
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const data = await getCurrentUser();
      setUser(data.user);
      setIntegrations(data.integrations);

      // Google is always connected after OAuth login.
      // Check if Slack or Jira need setup.
      const hasNonGoogleIntegrations = data.integrations.some(
        (i) => i.provider !== 'google' && i.connected
      );

      // Go straight to dashboard — user can configure integrations from there
      setStep('DASHBOARD');
    } catch {
      // Not authenticated — show login
      setStep('LOGIN');
    }
  };

  const handleLoginSuccess = () => {
    // After Google OAuth redirect, the page reloads.
    // checkAuthStatus will run again on mount and pick up the session.
    checkAuthStatus();
  };

  const handlePermissionContinue = () => {
    setStep('DASHBOARD');
  };

  if (step === 'LOADING') {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Loading FocusFlow...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      {step === 'LOGIN' && (
        <LoginScreen onLogin={handleLoginSuccess} />
      )}
      
      {step === 'PERMISSIONS' && (
        <PermissionScreen onContinue={handlePermissionContinue} />
      )}

      {step === 'DASHBOARD' && user && (
        <Dashboard userName={user.name} integrations={integrations} />
      )}
    </ErrorBoundary>
  );
};

export default App;
