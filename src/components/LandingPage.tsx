import React from "react";
import {
  ArrowRight,
  Brain,
  Calendar,
  CheckSquare,
  Mail,
  MessageSquare,
} from "lucide-react";
import { getGoogleAuthUrl } from "../services/api";

export const LandingPage: React.FC = () => {
  const handleStart = () => {
    window.location.href = getGoogleAuthUrl();
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200">
      <header className="sticky top-0 z-40 border-b border-slate-800/60 bg-[#0b1221]/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-600 shadow-lg shadow-cyan-900/40">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">
              FocusFlow
            </span>
          </div>
          <button
            onClick={handleStart}
            className="rounded-lg border border-cyan-500/40 bg-cyan-600/20 px-4 py-2 text-sm font-semibold text-cyan-200 transition-colors hover:bg-cyan-500/30"
          >
            Continue with Google
          </button>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute -left-24 -top-20 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 right-0 h-80 w-80 rounded-full bg-teal-500/10 blur-3xl" />
          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8 lg:py-28">
            <div>
              <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-800 bg-cyan-950/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-300">
                AI Priority Engine
              </p>
              <h1 className="text-4xl font-extrabold leading-tight text-white sm:text-5xl">
                Stop triaging chaos.
                <br />
                Start executing what matters.
              </h1>
              <p className="mt-5 max-w-xl text-base text-slate-300 sm:text-lg">
                FocusFlow turns Gmail, Slack, Jira, and Calendar noise into a
                single ranked action queue, so teams spend less time sorting and
                more time shipping.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <button
                  onClick={handleStart}
                  className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 font-semibold text-slate-950 transition-colors hover:bg-cyan-400"
                >
                  Continue with Google
                  <ArrowRight className="h-4 w-4" />
                </button>
                <span className="text-sm text-slate-400">
                  No card required. Setup in under 2 minutes.
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800/70 bg-[#0b1221] p-6 shadow-2xl shadow-black/40">
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Today at a glance
              </p>
              <div className="space-y-3">
                <div className="rounded-lg border border-rose-900/40 bg-rose-950/20 p-3">
                  <p className="text-xs text-rose-300">Urgent</p>
                  <p className="text-sm font-semibold text-rose-200">
                    Customer escalation in Slack needs response in 15 min
                  </p>
                </div>
                <div className="rounded-lg border border-cyan-900/40 bg-cyan-950/20 p-3">
                  <p className="text-xs text-cyan-300">Important</p>
                  <p className="text-sm font-semibold text-cyan-200">
                    Jira blocker ticket affecting release scope
                  </p>
                </div>
                <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-3">
                  <p className="text-xs text-slate-400">Routine</p>
                  <p className="text-sm font-semibold text-slate-300">
                    Calendar sync and newsletter batch
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">
              How It Works
            </h2>
            <p className="mt-2 text-slate-400">
              Connect your stack, then let FocusFlow sort and score every
              incoming signal.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              icon={<Mail className="h-5 w-5 text-cyan-300" />}
              title="Gmail"
              body="Prioritize urgent email threads and client blockers automatically."
            />
            <FeatureCard
              icon={<MessageSquare className="h-5 w-5 text-violet-300" />}
              title="Slack"
              body="Promote high-impact channel messages while suppressing low-signal chatter."
            />
            <FeatureCard
              icon={<CheckSquare className="h-5 w-5 text-blue-300" />}
              title="Jira"
              body="Pull unresolved issues and rank by urgency and downstream impact."
            />
            <FeatureCard
              icon={<Calendar className="h-5 w-5 text-orange-300" />}
              title="Calendar"
              body="Blend meetings with work items so your schedule reflects true priorities."
            />
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-800 bg-[#0b1221]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 text-xs text-slate-500 sm:px-6 lg:px-8">
          <span>© {new Date().getFullYear()} FocusFlow, Inc.</span>
          <span>AI-assisted prioritization for modern teams</span>
        </div>
      </footer>
    </div>
  );
};

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  body: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, body }) => {
  return (
    <article className="rounded-xl border border-slate-800/70 bg-[#0b1221] p-5 shadow-lg shadow-black/30">
      <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900/80">
        {icon}
      </div>
      <h3 className="text-base font-bold text-white">{title}</h3>
      <p className="mt-2 text-sm text-slate-400">{body}</p>
    </article>
  );
};
