import React, { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Dashboard } from "./components/Dashboard";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { IntegrationsHub } from "./components/IntegrationsHub";
import { LandingPage } from "./components/LandingPage";
import { getCurrentUser } from "./services/api";

type ThemeMode = "light" | "dark";
const THEME_STORAGE_KEY = "focusflow-theme";

interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

const App: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    return savedTheme === "light" ? "light" : "dark";
  });
  const [integrations, setIntegrations] = useState<
    Array<{ provider: string; connected: boolean }>
  >([]);

  useEffect(() => {
    void checkAuthStatus();
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  };

  const checkAuthStatus = async () => {
    setLoading(true);

    try {
      const data = await getCurrentUser();
      setUser(data.user);
      setIntegrations(data.integrations);
    } catch {
      setUser(null);
      setIntegrations([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] dark:bg-[#0F172A] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-[#1D4ED8] dark:border-[#3B82F6] border-t-transparent rounded-full animate-spin" />
          <p className="text-[#111827] dark:text-[#FFFFFF] text-sm">
            Loading FocusFlow...
          </p>
        </div>
      </div>
    );
  }

  const RequireAuth: React.FC<{ children: React.ReactNode }> = ({
    children,
  }) => {
    if (!user) {
      return <Navigate to="/" replace />;
    }

    return <>{children}</>;
  };

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              user ? <Navigate to="/dashboard" replace /> : <LandingPage />
            }
          />
          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <Dashboard
                  userName={user?.name || ""}
                  integrations={integrations}
                  theme={theme}
                  onToggleTheme={toggleTheme}
                />
              </RequireAuth>
            }
          />
          <Route
            path="/settings/integrations"
            element={
              <RequireAuth>
                <IntegrationsHub userName={user?.name || ""} />
              </RequireAuth>
            }
          />
          <Route
            path="*"
            element={<Navigate to={user ? "/dashboard" : "/"} replace />}
          />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;
