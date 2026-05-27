import { useState, type FormEvent } from "react";
import { Eye, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";
import loginHero from "../assets/images/stitch/auth-login-hero.jpg";

const AuthLoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || "Login failed");
      }

      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendReset = async () => {
    setResetMessage(null);

    if (!resetEmail) {
      setResetMessage("Enter the email address to reset.");
      return;
    }

    const response = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email: resetEmail }),
    });

    const payload = (await response.json()) as {
      message?: string;
      resetToken?: string;
    };

    if (payload.resetToken) {
      setResetToken(payload.resetToken);
    }

    setResetMessage(payload.message || "Reset token generated.");
  };

  const handleResetPassword = async () => {
    setResetMessage(null);

    if (!resetToken || !resetPassword) {
      setResetMessage("Token and new password are required.");
      return;
    }

    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ token: resetToken, password: resetPassword }),
    });

    const payload = (await response.json()) as {
      message?: string;
      error?: string;
    };

    if (!response.ok) {
      setResetMessage(payload.error || "Reset failed");
      return;
    }

    setResetMessage(payload.message || "Password updated.");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen items-center justify-center px-6 py-12">
        <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-md">
          <div className="relative h-40 bg-blue-950">
            <img
              src={loginHero}
              alt="Office skyline"
              className="absolute inset-0 h-full w-full object-cover opacity-40"
            />
            <div className="relative z-10 flex h-full items-center justify-center text-white">
              <div className="text-center">
                <p className="text-sm uppercase tracking-[0.3em] text-slate-200">
                  FocusFlow
                </p>
                <h1 className="text-2xl font-semibold">Welcome back</h1>
              </div>
            </div>
          </div>
          <div className="px-8 py-10">
            <p className="text-center text-sm text-slate-500">
              Don&apos;t have an account?{" "}
              <button
                type="button"
                className="font-semibold text-blue-600"
                onClick={() => navigate("/signup")}
              >
                Sign Up
              </button>
            </p>

            <button
              className="mt-6 w-full rounded-xl border border-slate-200 bg-slate-50 py-3 text-sm font-semibold text-slate-700 shadow-sm"
              onClick={() => {
                window.location.href = "/auth/google";
              }}
            >
              Continue with Google
            </button>

            <div className="my-6 flex items-center gap-3 text-xs font-semibold text-slate-400">
              <span className="h-px flex-1 bg-slate-200" />
              OR
              <span className="h-px flex-1 bg-slate-200" />
            </div>

            <form className="space-y-4" onSubmit={handleLogin}>
              <div>
                <label className="text-xs font-semibold uppercase text-slate-500">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/40"
                />
              </div>
              <div>
                <div className="flex items-center justify-between text-xs font-semibold uppercase text-slate-500">
                  <span>Password</span>
                  <button
                    type="button"
                    className="text-blue-600"
                    onClick={() => setShowReset((prev) => !prev)}
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative mt-2">
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/40"
                  />
                  <Eye className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
              </div>
              {error ? (
                <p className="rounded-xl bg-rose-50 px-4 py-2 text-sm text-rose-600">
                  {error}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white shadow-md disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? "Signing In..." : "Sign In"}
              </button>
            </form>

            {showReset ? (
              <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <Mail className="h-4 w-4 text-blue-600" />
                  Reset password
                </div>
                <div className="mt-3 space-y-3">
                  <input
                    type="email"
                    placeholder="email@company.com"
                    value={resetEmail}
                    onChange={(event) => setResetEmail(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/40"
                  />
                  <button
                    type="button"
                    className="w-full rounded-xl border border-blue-600/30 bg-white px-4 py-2 text-sm font-semibold text-blue-600"
                    onClick={handleSendReset}
                  >
                    Send Reset Token
                  </button>
                  <input
                    type="text"
                    placeholder="Reset token"
                    value={resetToken}
                    onChange={(event) => setResetToken(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/40"
                  />
                  <input
                    type="password"
                    placeholder="New password"
                    value={resetPassword}
                    onChange={(event) => setResetPassword(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/40"
                  />
                  <button
                    type="button"
                    className="w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
                    onClick={handleResetPassword}
                  >
                    Update Password
                  </button>
                  {resetMessage ? (
                    <p className="text-xs text-slate-500">{resetMessage}</p>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLoginPage;
