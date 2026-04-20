import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import AppShell from "../components/AppShell";
import Icon from "../components/Icon";
import { useAppState } from "../state/AppState";
import { editStudyFromChat } from "../lib/gemini";
import type { ChatMessage, Question, Study } from "../lib/types";
import { uid } from "../lib/storage";

type MobileTab = "edit" | "chat";

export default function EditStudy() {
  const { id } = useParams<{ id: string }>();
  const { getStudy, upsertStudy } = useAppState();
  const navigate = useNavigate();
  const study = id ? getStudy(id) : undefined;
  const [mobileTab, setMobileTab] = useState<MobileTab>("edit");

  if (!study) return <Navigate to="/" replace />;

  return (
    <AppShell
      back="/"
      title={study.title || "Untitled"}
      subtitle={`${study.questions.length} question${study.questions.length === 1 ? "" : "s"} · Draft`}
      actions={
        <>
          <button
            onClick={() => navigate(`/study/${study.id}/preview`)}
            className="btn-secondary hidden sm:inline-flex"
          >
            <Icon name="play" size={12} />
            Preview
          </button>
          <button
            onClick={() => navigate(`/study/${study.id}/audience`)}
            className="btn-primary"
          >
            <span className="hidden sm:inline">Continue</span>
            <span className="sm:hidden">Next</span>
            <Icon name="arrow-right" size={14} />
          </button>
        </>
      }
    >
      {/* Mobile tab switch */}
      <div className="mb-4 flex rounded-lg border border-slate-200 bg-white p-1 text-xs shadow-soft lg:hidden">
        <button
          onClick={() => setMobileTab("edit")}
          className={`flex-1 rounded-md px-3 py-1.5 font-medium transition ${
            mobileTab === "edit"
              ? "bg-slate-900 text-white"
              : "text-slate-600"
          }`}
        >
          Direct edit
        </button>
        <button
          onClick={() => setMobileTab("chat")}
          className={`flex-1 rounded-md px-3 py-1.5 font-medium transition ${
            mobileTab === "chat"
              ? "bg-slate-900 text-white"
              : "text-slate-600"
          }`}
        >
          Chat with AI
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className={mobileTab === "edit" ? "block" : "hidden lg:block"}>
          <DirectEditor study={study} onChange={upsertStudy} />
        </div>
        <div
          className={`${
            mobileTab === "chat" ? "block" : "hidden lg:block"
          } lg:sticky lg:top-20 lg:self-start`}
        >
          <ChatEditor study={study} onApply={upsertStudy} />
        </div>
      </div>

      {/* Mobile bottom CTA row */}
      <div className="mt-6 flex gap-2 sm:hidden">
        <button
          onClick={() => navigate(`/study/${study.id}/preview`)}
          className="btn-secondary flex-1"
        >
          <Icon name="play" size={12} />
          Preview
        </button>
        <button
          onClick={() => navigate(`/study/${study.id}/audience`)}
          className="btn-primary flex-1"
        >
          Continue
          <Icon name="arrow-right" size={14} />
        </button>
      </div>
    </AppShell>
  );
}

function DirectEditor({
  study,
  onChange,
}: {
  study: Study;
  onChange: (s: Study) => void;
}) {
  function patch(p: Partial<Study>) {
    onChange({ ...study, ...p, updatedAt: Date.now() });
  }
  function patchQuestion(qid: string, p: Partial<Question>) {
    patch({
      questions: study.questions.map((q) => (q.id === qid ? { ...q, ...p } : q)),
    });
  }
  function removeQuestion(qid: string) {
    patch({ questions: study.questions.filter((q) => q.id !== qid) });
  }
  function addQuestion() {
    patch({
      questions: [
        ...study.questions,
        { id: uid("q"), prompt: "", type: "open" },
      ],
    });
  }
  function moveQuestion(qid: string, dir: -1 | 1) {
    const idx = study.questions.findIndex((q) => q.id === qid);
    const to = idx + dir;
    if (idx < 0 || to < 0 || to >= study.questions.length) return;
    const questions = study.questions.slice();
    const [removed] = questions.splice(idx, 1);
    questions.splice(to, 0, removed);
    patch({ questions });
  }

  return (
    <div className="space-y-4">
      <section className="card card-pad">
        <div className="label">Title</div>
        <input
          className="input mt-1.5"
          value={study.title}
          onChange={(e) => patch({ title: e.target.value })}
        />
        <div className="label mt-4">Description</div>
        <textarea
          className="input mt-1.5 min-h-[80px] resize-y"
          value={study.description}
          onChange={(e) => patch({ description: e.target.value })}
        />
        <div className="label mt-4">Research goal</div>
        <textarea
          className="input mt-1.5 min-h-[60px] resize-y"
          value={study.goal ?? ""}
          placeholder="What decision will this inform?"
          onChange={(e) => patch({ goal: e.target.value })}
        />
      </section>

      <div className="flex items-center justify-between px-1">
        <div className="label">
          Questions ({study.questions.length})
        </div>
        <button onClick={addQuestion} className="btn-subtle">
          <Icon name="plus" size={12} />
          Add question
        </button>
      </div>

      <div className="space-y-3">
        {study.questions.map((q, i) => (
          <article key={q.id} className="card card-pad">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="grid h-6 w-6 place-items-center rounded-md bg-brand-50 text-2xs font-semibold text-brand-700">
                  {i + 1}
                </span>
                <span className="badge badge-neutral uppercase">{q.type}</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => moveQuestion(q.id, -1)}
                  className="btn-icon !h-7 !w-7"
                  disabled={i === 0}
                  aria-label="Move up"
                >
                  <Icon name="chevron-up" size={12} />
                </button>
                <button
                  onClick={() => moveQuestion(q.id, 1)}
                  className="btn-icon !h-7 !w-7"
                  disabled={i === study.questions.length - 1}
                  aria-label="Move down"
                >
                  <Icon name="chevron-down" size={12} />
                </button>
                <button
                  onClick={() => removeQuestion(q.id)}
                  className="btn-icon !h-7 !w-7 hover:!bg-red-50 hover:!text-red-700"
                  aria-label="Remove"
                >
                  <Icon name="trash" size={12} />
                </button>
              </div>
            </div>
            <textarea
              className="input mt-3 min-h-[64px] resize-y"
              value={q.prompt}
              onChange={(e) => patchQuestion(q.id, { prompt: e.target.value })}
              placeholder="What should the AI moderator ask?"
            />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {(["open", "scale", "choice"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => patchQuestion(q.id, { type: t })}
                  className={`chip ${q.type === t ? "chip-active" : ""}`}
                >
                  {t}
                </button>
              ))}
            </div>
            {q.type === "choice" && (
              <div className="mt-3">
                <div className="label">Choices (comma-separated)</div>
                <input
                  className="input mt-1.5"
                  value={(q.choices ?? []).join(", ")}
                  onChange={(e) =>
                    patchQuestion(q.id, {
                      choices: e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </div>
            )}
            {q.type === "open" && (
              <div className="mt-3">
                <div className="label">Probe hint (optional)</div>
                <input
                  className="input mt-1.5"
                  value={q.probe ?? ""}
                  placeholder="e.g. ask for a recent specific example"
                  onChange={(e) =>
                    patchQuestion(q.id, { probe: e.target.value })
                  }
                />
              </div>
            )}
          </article>
        ))}
        {study.questions.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-500">
            No questions yet. Click "Add question" or ask the AI via chat.
          </div>
        )}
      </div>
    </div>
  );
}

interface PendingPatch {
  assistantMessage: string;
  changelog: string[];
  nextStudy: Study;
}

function ChatEditor({
  study,
  onApply,
}: {
  study: Study;
  onApply: (s: Study) => void;
}) {
  const { apiKey } = useAppState();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "model",
      text: `What would you like to change? Try "make q2 less leading" or "add a question about pricing".`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<PendingPatch | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading, pending]);

  async function send() {
    if (!input.trim() || loading || !apiKey) return;
    const userMsg: ChatMessage = { role: "user", text: input.trim() };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setError(null);
    try {
      const resp = await editStudyFromChat(apiKey, study, nextMessages);
      const nextQuestions = reconcileQuestions(study.questions, resp.study.questions);
      const nextStudy: Study = {
        ...study,
        title: resp.study.title,
        description: resp.study.description,
        goal: resp.study.goal ?? study.goal,
        questions: nextQuestions,
        updatedAt: Date.now(),
      };
      setMessages((m) => [
        ...m,
        { role: "model", text: resp.assistantMessage },
      ]);
      setPending({
        assistantMessage: resp.assistantMessage,
        changelog: resp.changelog,
        nextStudy,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function apply() {
    if (!pending) return;
    onApply(pending.nextStudy);
    setPending(null);
    setMessages((m) => [
      ...m,
      { role: "model", text: "Applied. Anything else to adjust?" },
    ]);
  }
  function discard() {
    setPending(null);
    setMessages((m) => [
      ...m,
      { role: "model", text: "No problem — discarded that change." },
    ]);
  }

  return (
    <div className="card flex h-[70vh] flex-col lg:h-[calc(100vh-9rem)]">
      <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-50 text-brand-700">
          <Icon name="sparkles" size={14} />
        </span>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-900">
            Chat with AI
          </div>
          <div className="text-2xs text-slate-500">
            Changes show as a diff before you apply
          </div>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="flex-1 space-y-2.5 overflow-y-auto px-4 py-3"
      >
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-brand-600 text-white"
                  : "border border-slate-200 bg-slate-50 text-slate-800"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
              <span
                className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400"
                style={{ animationDelay: "120ms" }}
              />
              <span
                className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400"
                style={{ animationDelay: "240ms" }}
              />
            </div>
          </div>
        )}
        {pending && (
          <div className="rounded-xl border border-brand-300 bg-brand-50/50 p-3">
            <div className="text-2xs font-semibold uppercase tracking-wider text-brand-700">
              Proposed changes
            </div>
            <ul className="mt-2 space-y-1 text-xs text-slate-800">
              {pending.changelog.map((c, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-brand-600">•</span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex gap-2">
              <button onClick={apply} className="btn-primary flex-1 !py-2">
                <Icon name="check" size={12} />
                Apply
              </button>
              <button onClick={discard} className="btn-secondary flex-1 !py-2">
                Discard
              </button>
            </div>
          </div>
        )}
        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            <Icon name="alert" size={14} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      <div className="border-t border-slate-200 p-3">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            placeholder="Ask the AI to change something..."
            className="input max-h-32 min-h-[44px] resize-none py-3"
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className="btn-primary h-11 px-4"
            aria-label="Send"
          >
            <Icon name="send" size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Best-effort ID preservation. We try to match each new question to an
 * existing question by exact or substring prompt similarity, then fall back
 * to a new UID. This is more robust than positional matching, which breaks
 * when the LLM reorders or adds questions.
 */
function reconcileQuestions(
  current: Question[],
  next: {
    prompt: string;
    type: "open" | "scale" | "choice";
    choices?: string[];
    probe?: string;
  }[]
): Question[] {
  const used = new Set<string>();
  return next.map((n) => {
    const normalized = n.prompt.trim().toLowerCase();
    const match = current.find((c) => {
      if (used.has(c.id)) return false;
      const cn = c.prompt.trim().toLowerCase();
      return (
        cn === normalized ||
        (cn.length > 12 && (normalized.includes(cn) || cn.includes(normalized)))
      );
    });
    if (match) {
      used.add(match.id);
      return {
        id: match.id,
        prompt: n.prompt,
        type: n.type,
        choices: n.choices,
        probe: n.probe,
      };
    }
    return {
      id: uid("q"),
      prompt: n.prompt,
      type: n.type,
      choices: n.choices,
      probe: n.probe,
    };
  });
}
