import { Link, useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import { useAppState } from "../state/AppState";
import type { Study } from "../lib/types";
import Waveform from "../components/Waveform";
import Icon from "../components/Icon";

function statusBadge(status: Study["status"]) {
  switch (status) {
    case "draft":
      return <span className="badge badge-neutral">Draft</span>;
    case "pending":
      return (
        <span className="badge badge-warn">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
          Interviewing
        </span>
      );
    case "complete":
      return (
        <span className="badge badge-success">
          <Icon name="check" size={10} />
          Ready
        </span>
      );
  }
}

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function StudyCard({ study }: { study: Study }) {
  const navigate = useNavigate();
  const dest = (() => {
    if (study.status === "complete") return `/study/${study.id}/report`;
    if (study.status === "pending") return `/study/${study.id}/pending`;
    return `/study/${study.id}/edit`;
  })();
  const audienceLabel = study.audience?.label
    ? study.audience.label
    : study.audience?.mode === "general"
    ? "General population"
    : "No audience set";
  const qCount = study.questions.length;
  const respondentCount = study.simulation?.respondents.length;

  return (
    <button
      onClick={() => navigate(dest)}
      className="card card-pad group flex w-full flex-col gap-3 text-left transition hover:-translate-y-0.5 hover:shadow-card"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-slate-900">
            {study.title || "Untitled study"}
          </div>
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-600">
            {study.description || "No description yet."}
          </p>
        </div>
        {statusBadge(study.status)}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs text-slate-500">
        <span className="inline-flex items-center gap-1">
          <Icon name="edit" size={11} />
          {qCount} question{qCount === 1 ? "" : "s"}
        </span>
        <span className="inline-flex items-center gap-1">
          <Icon name="users" size={11} />
          <span className="truncate max-w-[160px]">{audienceLabel}</span>
        </span>
        {respondentCount ? (
          <span className="inline-flex items-center gap-1">
            <Icon name="check-circle" size={11} />
            {respondentCount} interviews
          </span>
        ) : null}
        <span className="ml-auto">{formatRelative(study.updatedAt)}</span>
      </div>
    </button>
  );
}

export default function Home() {
  const { studies } = useAppState();
  const sorted = [...studies].sort((a, b) => b.updatedAt - a.updatedAt);

  const stats = {
    total: studies.length,
    pending: studies.filter((s) => s.status === "pending").length,
    complete: studies.filter((s) => s.status === "complete").length,
  };

  return (
    <AppShell>
      {/* ---------- Hero ---------- */}
      <section className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Studies
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Design a study in plain language. AI-moderated voice interviews
            run with real humans and ship as a synthesized report.
          </p>
        </div>
        <Link to="/create" className="btn-primary w-full sm:w-auto">
          <Icon name="plus" size={14} />
          New study
        </Link>
      </section>

      {/* ---------- Stats row ---------- */}
      <section className="mt-6 grid grid-cols-3 gap-3 sm:gap-4">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="In progress" value={stats.pending} tone="amber" />
        <StatCard label="Completed" value={stats.complete} tone="brand" />
      </section>

      {/* ---------- AI moderator callout ---------- */}
      <section className="mt-6 card overflow-hidden">
        <div className="grid grid-cols-1 gap-0 sm:grid-cols-[1fr_auto]">
          <div className="card-pad">
            <div className="text-2xs font-semibold uppercase tracking-wider text-brand-700">
              How it works
            </div>
            <div className="mt-1 text-lg font-semibold text-slate-900">
              Interviews are AI-moderated, end to end
            </div>
            <p className="mt-2 max-w-prose text-sm text-slate-600">
              Every respondent is spoken with by a warm, curious AI interviewer
              that probes, follows up, and adapts in real time. Preview exactly
              what they'll experience before you launch.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="chip">Probes follow-ups</span>
              <span className="chip">Adapts in real time</span>
              <span className="chip">Open, scale & choice</span>
            </div>
          </div>
          <div className="relative hidden items-center justify-center border-l border-slate-200 bg-gradient-to-br from-brand-50 via-white to-white px-6 sm:flex">
            <div className="relative grid h-20 w-20 place-items-center">
              <span className="absolute inset-0 rounded-full border border-brand-300 animate-pulse-ring" />
              <span
                className="absolute inset-3 rounded-full border border-brand-400 animate-pulse-ring"
                style={{ animationDelay: "600ms" }}
              />
              <span className="grid h-14 w-14 place-items-center rounded-full bg-brand-600 text-white shadow-soft">
                <Icon name="mic" size={22} />
              </span>
            </div>
          </div>
          <div className="sm:hidden">
            <div className="divider" />
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-xs text-slate-500">AI moderator</span>
              <Waveform bars={14} className="!h-7 w-28" />
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Studies list ---------- */}
      <section className="mt-8">
        <div className="flex items-baseline justify-between">
          <h2 className="section-title">Recent studies</h2>
          <span className="text-2xs text-slate-500">
            {sorted.length} total
          </span>
        </div>

        {sorted.length === 0 ? (
          <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-500">
              <Icon name="sparkles" size={18} />
            </div>
            <div className="mt-3 text-sm font-semibold text-slate-900">
              No studies yet
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Start by describing the decision you need to inform.
            </div>
            <Link to="/create" className="btn-primary mt-4 inline-flex">
              <Icon name="plus" size={14} />
              New study
            </Link>
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {sorted.map((s) => (
              <StudyCard key={s.id} study={s} />
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}

function StatCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "brand" | "amber";
}) {
  const valueColor =
    tone === "brand"
      ? "text-brand-700"
      : tone === "amber"
      ? "text-amber-700"
      : "text-slate-900";
  return (
    <div className="card card-pad">
      <div className="label">{label}</div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${valueColor}`}>
        {value}
      </div>
    </div>
  );
}
