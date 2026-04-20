import { Navigate, useNavigate, useParams } from "react-router-dom";
import AppShell from "../components/AppShell";
import Icon from "../components/Icon";
import { useAppState } from "../state/AppState";
import type { Respondent, Study } from "../lib/types";
import Waveform from "../components/Waveform";

export default function Report() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getStudy } = useAppState();
  const study = id ? getStudy(id) : undefined;

  if (!study) return <Navigate to="/" replace />;
  if (!study.simulation) {
    return <Navigate to={`/study/${study.id}/pending`} replace />;
  }

  const { respondents, interviews, report } = study.simulation;
  const respondentMap = new Map(respondents.map((r) => [r.id, r]));

  const sentSum =
    (report.sentiment.positive ?? 0) +
    (report.sentiment.neutral ?? 0) +
    (report.sentiment.negative ?? 0) || 1;
  const pct = (n: number) => Math.round((n / sentSum) * 100);

  const studyId = study.id;
  function openReplay(respondentId: string) {
    navigate(`/study/${studyId}/preview?respondentId=${respondentId}`);
  }

  return (
    <AppShell
      back="/"
      title={study.title}
      subtitle="Synthesized report"
      wide
      actions={
        <span className="badge badge-success">
          <Icon name="check" size={10} />
          Ready
        </span>
      }
    >
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          {/* ---------- Executive summary ---------- */}
          <section className="card card-pad">
            <div className="label">Executive summary</div>
            <p className="mt-2 text-base leading-relaxed text-slate-900">
              {report.summary}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <Icon name="users" size={12} />
                {respondents.length} respondents
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Icon name="mic" size={12} />
                {interviews.length} AI-moderated interviews
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Icon name="clock" size={12} />
                Generated{" "}
                {new Date(study.simulation.generatedAt).toLocaleDateString()}
              </span>
            </div>
          </section>

          {/* ---------- Sentiment + Key metrics ---------- */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="card card-pad">
              <div className="label">Sentiment</div>
              <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="bg-brand-500"
                  style={{ width: `${pct(report.sentiment.positive)}%` }}
                />
                <div
                  className="bg-slate-400"
                  style={{ width: `${pct(report.sentiment.neutral)}%` }}
                />
                <div
                  className="bg-amber-500"
                  style={{ width: `${pct(report.sentiment.negative)}%` }}
                />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <SentItem
                  label="Positive"
                  value={pct(report.sentiment.positive)}
                  color="text-brand-700"
                />
                <SentItem
                  label="Neutral"
                  value={pct(report.sentiment.neutral)}
                  color="text-slate-700"
                />
                <SentItem
                  label="Negative"
                  value={pct(report.sentiment.negative)}
                  color="text-amber-700"
                />
              </div>
            </div>

            <div className="card card-pad">
              <div className="label">Participation</div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <Stat label="Interviews" value={interviews.length} />
                <Stat
                  label="Avg. answers"
                  value={Math.round(
                    interviews.reduce((n, i) => n + i.answers.length, 0) /
                      Math.max(1, interviews.length)
                  )}
                />
              </div>
            </div>
          </section>

          {/* ---------- Themes ---------- */}
          <section>
            <div className="flex items-baseline justify-between px-1">
              <h2 className="section-title">Themes</h2>
              <span className="text-2xs text-slate-500">
                {report.themes.length} identified
              </span>
            </div>
            <div className="mt-3 space-y-3">
              {report.themes.map((t, ti) => (
                <article key={ti} className="card card-pad">
                  <div className="flex items-center gap-2">
                    <span className="grid h-7 w-7 place-items-center rounded-md bg-brand-50 text-xs font-semibold text-brand-700">
                      {ti + 1}
                    </span>
                    <div className="text-sm font-semibold text-slate-900">
                      {t.title}
                    </div>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-slate-700">
                    {t.description}
                  </p>
                  <div className="mt-3 space-y-2">
                    {t.quotes.map((q, qi) => {
                      const r = respondentMap.get(q.respondentId);
                      return (
                        <button
                          key={qi}
                          onClick={() => openReplay(q.respondentId)}
                          className="group w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-left transition hover:border-brand-300 hover:bg-white"
                        >
                          <p className="text-sm leading-relaxed text-slate-800">
                            "{q.text}"
                          </p>
                          <div className="mt-2 flex items-center gap-2 text-2xs text-slate-500">
                            {r && (
                              <>
                                <span className="font-semibold text-slate-700">
                                  {r.name}
                                </span>
                                <span>· {r.age}</span>
                                <span className="truncate">· {r.role}</span>
                              </>
                            )}
                            <span className="ml-auto inline-flex items-center gap-1 font-medium text-brand-700">
                              Replay
                              <Icon name="play" size={10} />
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </article>
              ))}
            </div>
          </section>

          {/* ---------- Surprises / recommendations ---------- */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {report.surprises.length > 0 && (
              <div className="card card-pad">
                <div className="label">What surprised us</div>
                <ul className="mt-3 space-y-2.5">
                  {report.surprises.map((s, i) => (
                    <li key={i} className="flex gap-2 text-sm text-slate-700">
                      <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md bg-amber-50 text-amber-700">
                        <Icon name="info" size={11} />
                      </span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {report.recommendations.length > 0 && (
              <div className="card card-pad">
                <div className="label">Recommended next steps</div>
                <ul className="mt-3 space-y-2.5">
                  {report.recommendations.map((r, i) => (
                    <li key={i} className="flex gap-2 text-sm text-slate-700">
                      <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md bg-brand-50 text-brand-700">
                        <Icon name="arrow-right" size={11} />
                      </span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </div>

        {/* ---------- Respondents sidebar ---------- */}
        <aside className="xl:sticky xl:top-20 xl:self-start">
          <div className="card">
            <div className="border-b border-slate-200 px-4 py-3">
              <div className="section-title">Real human interviews</div>
              <div className="text-2xs text-slate-500">
                Tap to replay any respondent's AI-moderated session
              </div>
            </div>
            <ul className="max-h-[70vh] divide-y divide-slate-100 overflow-y-auto">
              {respondents.map((r) => (
                <li key={r.id}>
                  <RespondentRow
                    study={study}
                    respondent={r}
                    onOpen={() => openReplay(r.id)}
                  />
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-slate-200 p-2.5">
      <div className="text-2xs text-slate-500">{label}</div>
      <div className="mt-0.5 text-lg font-semibold tabular-nums text-slate-900">
        {value}
      </div>
    </div>
  );
}

function SentItem({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div>
      <div className={color}>{label}</div>
      <div className="font-semibold tabular-nums text-slate-900">{value}%</div>
    </div>
  );
}

function RespondentRow({
  study,
  respondent,
  onOpen,
}: {
  study: Study;
  respondent: Respondent;
  onOpen: () => void;
}) {
  const iv = study.simulation?.interviews.find(
    (i) => i.respondentId === respondent.id
  );
  const initials = respondent.name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <button
      onClick={onOpen}
      className="group block w-full px-4 py-3 text-left transition hover:bg-slate-50"
    >
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
          {initials}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-slate-900">
            {respondent.name}
            <span className="ml-1 font-normal text-slate-400">
              · {respondent.age}
            </span>
          </div>
          <div className="truncate text-2xs text-slate-500">
            {respondent.role} · {respondent.location}
          </div>
        </div>
        <Waveform bars={5} className="!h-5 w-10 shrink-0" />
      </div>
      {iv && (
        <p className="mt-2 line-clamp-2 text-xs text-slate-600">
          "{iv.summary}"
        </p>
      )}
    </button>
  );
}
