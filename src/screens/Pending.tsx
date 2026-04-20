import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import AppShell from "../components/AppShell";
import Icon from "../components/Icon";
import Waveform from "../components/Waveform";
import { useAppState } from "../state/AppState";
import { simulateStudy } from "../lib/gemini";

const NAMES = [
  "Maya K.",
  "Devon P.",
  "Priya S.",
  "Lucas M.",
  "Emma T.",
  "Yuki O.",
  "Sam R.",
  "Ana L.",
  "Noah W.",
  "Zara H.",
];
const VERBS = [
  "completed their interview",
  "joined the session",
  "shared a 2-minute answer",
  "was probed on pricing",
  "finished without drop-off",
  "gave an unusual counter-example",
];

interface ActivityEntry {
  name: string;
  verb: string;
  at: number;
}

function fmtAgo(ts: number): string {
  const diff = Date.now() - ts;
  const s = Math.max(1, Math.round(diff / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

export default function Pending() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { apiKey, getStudy, setStatus, setSimulation } = useAppState();
  const study = id ? getStudy(id) : undefined;

  const target = study?.audience?.target ?? 50;
  const [completed, setCompleted] = useState(() =>
    Math.min(target, Math.max(6, Math.floor(target * 0.12)))
  );
  const [activity, setActivity] = useState<ActivityEntry[]>(() =>
    Array.from({ length: 3 }).map((_, i) => ({
      name: NAMES[i % NAMES.length],
      verb: VERBS[i % VERBS.length],
      at: Date.now() - (i + 1) * 90_000,
    }))
  );
  const [nowTick, setNowTick] = useState(0);
  const [simulating, setSimulating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const counterRef = useRef(completed);
  counterRef.current = completed;

  // Bump fake counter every ~4s, append to activity feed
  useEffect(() => {
    const i = setInterval(() => {
      setCompleted((c) => {
        if (c >= target - 1) return c;
        const next = c + 1;
        const name = NAMES[next % NAMES.length];
        const verb = VERBS[next % VERBS.length];
        setActivity((a) => [{ name, verb, at: Date.now() }, ...a].slice(0, 8));
        return next;
      });
    }, 4000);
    return () => clearInterval(i);
  }, [target]);

  // Re-render every 15s to refresh "Xs ago" labels
  useEffect(() => {
    const i = setInterval(() => setNowTick((n) => n + 1), 15_000);
    return () => clearInterval(i);
  }, []);

  // Ensure status is pending on enter
  useEffect(() => {
    if (study && study.status !== "pending" && study.status !== "complete") {
      setStatus(study.id, "pending");
    }
  }, [study, setStatus]);

  if (!study) return <Navigate to="/" replace />;

  async function runSimulation() {
    if (!study || !apiKey) return;
    setSimulating(true);
    setError(null);
    try {
      const sim = await simulateStudy(apiKey, study, study.audience);
      setSimulation(study.id, sim);
      navigate(`/study/${study.id}/report`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to simulate.");
      setSimulating(false);
    }
  }

  const pct = Math.round((completed / target) * 100);

  return (
    <AppShell
      back="/"
      title={study.title}
      subtitle="Interviews in progress"
      actions={
        <button
          onClick={() => navigate(`/study/${study.id}/preview`)}
          className="btn-secondary hidden sm:inline-flex"
        >
          <Icon name="play" size={12} />
          Preview
        </button>
      }
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <section className="card overflow-hidden">
            <div className="card-pad">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="relative grid h-10 w-10 place-items-center rounded-lg bg-amber-50 text-amber-700">
                    <Icon name="clock" size={18} />
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900">
                      Collecting interviews
                    </div>
                    <div className="truncate text-2xs text-slate-500">
                      {study.audience?.label ?? "General population"} · goal {target}
                    </div>
                  </div>
                </div>
                <span className="badge badge-warn">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
                  Live
                </span>
              </div>
              <div className="mt-5 flex items-end justify-between gap-4">
                <div>
                  <div className="text-4xl font-semibold tabular-nums text-slate-900 sm:text-5xl">
                    {completed}
                    <span className="text-lg font-normal text-slate-400">
                      {" "}
                      / {target}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">
                    interviews completed
                  </div>
                </div>
                <Waveform bars={14} className="!h-10 w-28" />
              </div>
              <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-brand-600 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="mt-1.5 flex justify-between text-2xs text-slate-500">
                <span>In progress</span>
                <span>{pct}%</span>
              </div>
            </div>

            <div className="border-t border-slate-200 bg-slate-50 p-4">
              <button
                onClick={runSimulation}
                disabled={simulating}
                className="btn-primary w-full !py-3"
              >
                {simulating ? (
                  <>
                    <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                    Synthesizing report...
                  </>
                ) : (
                  <>
                    <Icon name="sparkles" size={14} />
                    Simulate mock responses
                  </>
                )}
              </button>
              <p className="mt-2 text-center text-2xs text-slate-500">
                Demo: fabricates a contextually plausible report using your
                Gemini key. Real studies produce real transcripts.
              </p>
            </div>
          </section>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              <Icon name="alert" size={14} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <section className="card">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div className="text-sm font-semibold text-slate-900">
                Live activity
              </div>
              <span className="text-2xs text-slate-500">
                AI-moderated interviews
              </span>
            </div>
            <ul className="divide-y divide-slate-100" key={nowTick}>
              {activity.map((a, i) => (
                <li
                  key={`${a.at}-${i}`}
                  className="flex items-center gap-3 px-4 py-2.5 text-xs"
                >
                  <span className="relative grid h-6 w-6 place-items-center rounded-full bg-slate-100 text-2xs font-semibold text-slate-700">
                    {a.name
                      .split(" ")
                      .map((p) => p[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </span>
                  <span className="truncate text-slate-700">
                    <span className="font-medium text-slate-900">{a.name}</span>{" "}
                    {a.verb}
                  </span>
                  <span className="ml-auto text-2xs text-slate-400">
                    {fmtAgo(a.at)}
                  </span>
                </li>
              ))}
              {activity.length === 0 && (
                <li className="px-4 py-6 text-center text-xs text-slate-500">
                  Waiting for respondents...
                </li>
              )}
            </ul>
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <section className="card card-pad">
            <div className="label">Study</div>
            <div className="mt-1.5 text-sm font-semibold text-slate-900">
              {study.title}
            </div>
            <p className="mt-1 text-xs text-slate-600">{study.description}</p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <InfoRow label="Questions" value={study.questions.length} />
              <InfoRow label="Audience" value={study.audience?.label ?? "General"} />
            </div>
          </section>

          <section className="card card-pad">
            <div className="flex items-center gap-2">
              <Icon name="mic" size={14} className="text-brand-700" />
              <div className="text-sm font-semibold text-slate-900">
                AI-moderated
              </div>
            </div>
            <p className="mt-1.5 text-xs text-slate-600">
              Every interview is conducted by an adaptive AI moderator that
              probes, follows up, and adjusts to each respondent.
            </p>
            <button
              onClick={() => navigate(`/study/${study.id}/preview`)}
              className="btn-secondary mt-3 w-full"
            >
              <Icon name="play" size={12} />
              Preview the interview
            </button>
          </section>
        </aside>
      </div>
    </AppShell>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-md border border-slate-200 p-2">
      <div className="text-2xs text-slate-500">{label}</div>
      <div className="mt-0.5 truncate text-sm font-semibold text-slate-900">
        {value}
      </div>
    </div>
  );
}
