import { useState, type FormEvent } from "react";
import { ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import signupHero from "../assets/images/stitch/auth-signup-hero.jpg";

const AuthSignupPage = () => {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const displayName = `${firstName} ${lastName}`.trim();

    try {
      setIsSubmitting(true);
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email,
          password,
          displayName: displayName || undefined,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || "Registration failed");
      }

      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col overflow-hidden rounded-xl bg-white shadow-md md:my-10 md:flex-row">
        <div className="relative hidden w-1/2 items-center justify-center bg-slate-900 md:flex">
          <img
            src={signupHero}
            alt="Futuristic operations center"
            className="absolute inset-0 h-full w-full object-cover opacity-30"
          />
          <div className="relative z-10 px-10 text-center text-white">
            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h2 className="text-3xl font-semibold">The Future of Flow</h2>
            <p className="mt-3 text-sm text-slate-200">
              Turn workplace noise into focused action with precision ranking.
            </p>
          </div>
        </div>
        <div className="flex flex-1 flex-col justify-center px-8 py-12 md:px-12">
          <div className="mb-8">
            <h1 className="text-3xl font-semibold">Create an account</h1>
            <p className="mt-2 text-sm text-slate-500">
              Already have an account?{" "}
              <button
                type="button"
                className="text-blue-600"
                onClick={() => navigate("/login")}
              >
                Log In
              </button>
            </p>
          </div>

          <button
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 shadow-sm"
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

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase text-slate-500">
                  First Name
                </label>
                <input
                  type="text"
                  placeholder="John"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/40"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-slate-500">
                  Last Name
                </label>
                <input
                  type="text"
                  placeholder="Doe"
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/40"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-slate-500">
                Email Address
              </label>
              <input
                type="email"
                placeholder="john@company.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/40"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-slate-500">
                Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/40"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-slate-500">
                Confirm Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/40"
              />
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
              {isSubmitting ? "Creating Account..." : "Create Account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AuthSignupPage;
