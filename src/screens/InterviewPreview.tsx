import { useEffect, useMemo, useState } from "react";
import {
  Navigate,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import AppShell from "../components/AppShell";
import PhoneFrame from "../components/PhoneFrame";
import Waveform from "../components/Waveform";
import Icon from "../components/Icon";
import { useAppState } from "../state/AppState";
import type { Question, Respondent, Study } from "../lib/types";

type Slide =
  | { kind: "intro" }
  | { kind: "ask"; question: Question; index: number; total: number }
  | {
      kind: "answer";
      question: Question;
      text: string;
      respondent: AnyRespondent;
      index: number;
      total: number;
    }
  | { kind: "outro" };

interface SampleRespondent {
  name: string;
  role: string;
  location: string;
  age: number;
  tags: string[];
}

type AnyRespondent = Respondent | SampleRespondent;

const SAMPLE_RESPONDENT: SampleRespondent = {
  name: "Jordan R.",
  role: "Sample respondent",
  location: "Austin, TX",
  age: 33,
  tags: ["panelist"],
};

function stockAnswer(q: Question): string {
  if (q.type === "scale") {
    return "Probably a 4 out of 5? It's good, but I can see ways it could be better.";
  }
  if (q.type === "choice" && q.choices?.length) {
    return `Honestly, probably "${q.choices[0]}" — that's closest to how I'd describe it.`;
  }
  return "Yeah, let me think... the last time that came up for me was a couple weeks ago, and what stood out was how unclear the options felt. I ended up kind of winging it.";
}

export default function InterviewPreview() {
  const { id } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const respondentId = params.get("respondentId") || undefined;
  const navigate = useNavigate();
  const { getStudy, setStatus } = useAppState();
  const study = id ? getStudy(id) : undefined;
  const [slideIdx, setSlideIdx] = useState(0);

  const { slides } = useMemo(() => {
    if (!study) return { slides: [] as Slide[] };
    return buildSlides(study, respondentId);
  }, [study, respondentId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLElement) {
        const tag = e.target.tagName;
        if (
          tag === "INPUT" ||
          tag === "TEXTAREA" ||
          (e.target as HTMLElement).isContentEditable
        )
          return;
      }
      if (e.key === "ArrowRight") setSlideIdx((i) => Math.min(i + 1, slides.length - 1));
      if (e.key === "ArrowLeft") setSlideIdx((i) => Math.max(i - 1, 0));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [slides.length]);

  if (!study) return <Navigate to="/" replace />;
  if (slides.length === 0) return <Navigate to="/" replace />;

  const slide = slides[slideIdx];
  const atEnd = slideIdx >= slides.length - 1;
  const studyId = study.id;
  const isDraft = study.status === "draft";

  const headerSubtitle = respondentId
    ? "Individual interview replay"
    : "What respondents experience";

  function next() {
    if (!atEnd) {
      setSlideIdx((i) => i + 1);
      return;
    }
    if (respondentId) {
      navigate(-1);
    } else if (isDraft) {
      setStatus(studyId, "pending");
      navigate(`/study/${studyId}/pending`);
    } else {
      navigate(-1);
    }
  }

  function prev() {
    if (slideIdx === 0) navigate(-1);
    else setSlideIdx((i) => i - 1);
  }

  const primaryLabel = atEnd
    ? respondentId
      ? "Done"
      : isDraft
      ? "Looks good — launch"
      : "Done"
    : "Next";

  return (
    <AppShell
      back
      title="Interview preview"
      subtitle={headerSubtitle}
      actions={
        <span className="hidden items-center gap-1 text-2xs text-slate-500 sm:inline-flex">
          <span className="kbd">←</span>
          <span className="kbd">→</span>
          to navigate
        </span>
      }
    >
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[auto_1fr]">
        <div className="mx-auto lg:mx-0 lg:sticky lg:top-20">
          <PhoneFrame>
            <SlideView slide={slide} study={study} />
          </PhoneFrame>
          <div className="mt-4 mx-auto w-full max-w-[340px]">
            <div className="flex items-center justify-between text-2xs text-slate-500">
              <span>
                Slide {slideIdx + 1} / {slides.length}
              </span>
              <span>{Math.round(((slideIdx + 1) / slides.length) * 100)}%</span>
            </div>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full bg-brand-600 transition-all"
                style={{ width: `${((slideIdx + 1) / slides.length) * 100}%` }}
              />
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={prev}
                className="btn-secondary flex-1"
                disabled={slideIdx === 0}
              >
                <Icon name="chevron-left" size={14} />
                Back
              </button>
              <button onClick={next} className="btn-primary flex-1">
                {primaryLabel}
                {!atEnd && <Icon name="arrow-right" size={14} />}
                {atEnd && isDraft && !respondentId && (
                  <Icon name="arrow-right" size={14} />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Side explainer on desktop */}
        <aside className="hidden lg:block">
          <div className="card card-pad">
            <div className="text-2xs font-semibold uppercase tracking-wider text-brand-700">
              About this preview
            </div>
            <div className="mt-1 text-lg font-semibold text-slate-900">
              {respondentId
                ? "Individual transcript replay"
                : "See what respondents experience"}
            </div>
            <p className="mt-2 text-sm text-slate-600">
              {respondentId
                ? "This is the full AI-moderated session for this respondent, rendered exactly as they'd see it on their phone."
                : "Before launching, step through the flow your respondents will walk through. Real interviews adapt dynamically, this preview is a passive walkthrough."}
            </p>

            <ul className="mt-4 space-y-2.5 text-sm text-slate-700">
              <Feat
                icon="mic"
                title="Voice + slides"
                body="AI moderator speaks; respondents see the question on screen."
              />
              <Feat
                icon="sparkles"
                title="Dynamic probes"
                body="Moderator follows up based on answers, not a fixed script."
              />
              <Feat
                icon="clock"
                title="5–8 minutes"
                body="Tuned for high completion rates on mobile."
              />
            </ul>

            {isDraft && !respondentId && (
              <div className="mt-5 rounded-lg border border-brand-200 bg-brand-50 p-3 text-xs text-brand-800">
                Tapping <strong>Looks good — launch</strong> will move this
                study to <em>Interviewing</em>.
              </div>
            )}
          </div>
        </aside>
      </div>
    </AppShell>
  );
}

function Feat({
  icon,
  title,
  body,
}: {
  icon: Parameters<typeof Icon>[0]["name"];
  title: string;
  body: string;
}) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md bg-brand-50 text-brand-700">
        <Icon name={icon} size={12} />
      </span>
      <div>
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        <div className="text-xs text-slate-600">{body}</div>
      </div>
    </li>
  );
}

function buildSlides(
  study: Study,
  respondentId: string | undefined
): { slides: Slide[] } {
  const slides: Slide[] = [{ kind: "intro" }];
  const respondent =
    respondentId && study.simulation
      ? study.simulation.respondents.find((r) => r.id === respondentId)
      : undefined;
  const interview =
    respondentId && study.simulation
      ? study.simulation.interviews.find((i) => i.respondentId === respondentId)
      : undefined;

  const total = study.questions.length;
  study.questions.forEach((question, index) => {
    slides.push({ kind: "ask", question, index, total });
    const answerText =
      interview?.answers.find((a) => a.questionId === question.id)?.text ??
      stockAnswer(question);
    slides.push({
      kind: "answer",
      question,
      text: answerText,
      respondent: respondent ?? SAMPLE_RESPONDENT,
      index,
      total,
    });
  });
  slides.push({ kind: "outro" });
  return { slides };
}

function SlideView({
  slide,
  study,
}: {
  slide: Slide | undefined;
  study: Study;
}) {
  if (!slide) return null;

  if (slide.kind === "intro") {
    return (
      <div className="flex min-h-[460px] flex-col items-center justify-center text-center">
        <div className="relative grid h-24 w-24 place-items-center">
          <span className="absolute inset-0 rounded-full border border-brand-500/40 animate-pulse-ring" />
          <span
            className="absolute inset-2 rounded-full border border-brand-500/30 animate-pulse-ring"
            style={{ animationDelay: "600ms" }}
          />
          <div className="grid h-16 w-16 place-items-center rounded-full bg-brand-500 text-white">
            <Icon name="mic" size={24} />
          </div>
        </div>
        <div className="mt-6 text-2xs font-semibold uppercase tracking-wider text-brand-300">
          Connecting to your AI moderator
        </div>
        <div className="mt-2 text-base font-semibold">{study.title}</div>
        <p className="mt-3 max-w-[240px] text-xs leading-relaxed text-slate-300">
          You'll have a short voice conversation. There are no wrong answers —
          just share what comes to mind.
        </p>
      </div>
    );
  }

  if (slide.kind === "ask") {
    return (
      <div className="flex min-h-[460px] flex-col">
        <div className="flex items-center gap-2 text-2xs font-semibold uppercase tracking-wider text-brand-300">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-500/20 text-brand-300">
            AI
          </span>
          AI moderator
          <span className="ml-auto text-slate-400">
            Q{slide.index + 1}/{slide.total}
          </span>
        </div>
        <div className="mt-6 rounded-xl border border-brand-500/30 bg-brand-500/10 p-4">
          <p className="text-[15px] font-medium leading-relaxed text-white">
            {slide.question.prompt}
          </p>
          {slide.question.probe && (
            <p className="mt-2 text-2xs italic text-brand-200">
              May probe: {slide.question.probe}
            </p>
          )}
        </div>
        <div className="mt-auto">
          <Waveform bars={22} />
          <div className="mt-2 text-center text-2xs text-slate-400">
            Moderator is speaking...
          </div>
        </div>
      </div>
    );
  }

  if (slide.kind === "answer") {
    const r = slide.respondent;
    const name = r.name;
    const initials = name
      .split(" ")
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
    return (
      <div className="flex min-h-[460px] flex-col">
        <div className="flex items-center gap-2 text-2xs font-semibold uppercase tracking-wider text-slate-400">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-slate-700 text-2xs text-slate-200">
            {initials}
          </span>
          Respondent
          <span className="ml-auto text-slate-400">
            Q{slide.index + 1}/{slide.total}
          </span>
        </div>
        <div className="mt-2 text-sm font-semibold text-white">
          {name}
          {"age" in r && r.age ? (
            <span className="ml-1 text-slate-400">· {r.age}</span>
          ) : null}
        </div>
        <div className="text-2xs text-slate-400">
          {["role" in r ? r.role : null, "location" in r ? r.location : null]
            .filter(Boolean)
            .join(" · ")}
        </div>
        {"tags" in r && r.tags && r.tags.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {r.tags.slice(0, 3).map((t: string) => (
              <span
                key={t}
                className="inline-flex items-center rounded-full border border-slate-700 px-2 py-0.5 text-2xs text-slate-300"
              >
                {t}
              </span>
            ))}
          </div>
        )}
        <div className="mt-4 rounded-xl border border-slate-700 bg-slate-900/60 p-4">
          <p className="text-sm leading-relaxed text-white">"{slide.text}"</p>
        </div>
        <div className="mt-auto">
          <Waveform bars={22} tone="slate" />
          <div className="mt-2 text-center text-2xs text-slate-400">
            Respondent is speaking...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[460px] flex-col items-center justify-center text-center">
      <div className="grid h-16 w-16 place-items-center rounded-full bg-brand-500/20 text-brand-300">
        <Icon name="check" size={26} />
      </div>
      <div className="mt-4 text-base font-semibold">Thanks for sharing!</div>
      <p className="mt-2 max-w-[260px] text-xs leading-relaxed text-slate-300">
        Your responses help the team make a real decision. The AI moderator is
        wrapping up and saving a recording.
      </p>
    </div>
  );
}
