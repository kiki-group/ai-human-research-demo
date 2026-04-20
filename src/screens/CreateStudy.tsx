import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import Icon from "../components/Icon";
import { useAppState } from "../state/AppState";
import { draftStudyFromChat } from "../lib/gemini";
import type { ChatMessage, Question, Study } from "../lib/types";
import { uid } from "../lib/storage";

const OPENER: ChatMessage = {
  role: "model",
  text: "Hi — I'm your research partner. To draft a great interview, what decision or question are you trying to inform right now?",
};

const SUGGESTIONS = [
  "Understand why trial users don't upgrade",
  "Explore how busy parents plan weeknight dinners",
  "Find out what DevOps engineers hate about on-call",
  "Learn how small teams decide on a CRM",
];

export default function CreateStudy() {
  const navigate = useNavigate();
  const { apiKey, upsertStudy } = useAppState();
  const [messages, setMessages] = useState<ChatMessage[]>([OPENER]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  async function send(textOverride?: string) {
    const text = (textOverride ?? input).trim();
    if (!text || loading || !apiKey) return;
    const userMsg: ChatMessage = { role: "user", text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setError(null);
    try {
      const resp = await draftStudyFromChat(apiKey, nextMessages);
      setMessages((m) => [
        ...m,
        { role: "model", text: resp.assistantMessage },
      ]);
      if (resp.ready && resp.draft) {
        const study: Study = {
          id: uid("study"),
          title: resp.draft.title,
          description: resp.draft.description,
          goal: resp.draft.goal,
          questions: resp.draft.questions.map<Question>((q) => ({
            id: uid("q"),
            prompt: q.prompt,
            type: q.type,
            choices: q.choices,
            probe: q.probe,
          })),
          status: "draft",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        upsertStudy(study);
        setTimeout(() => navigate(`/study/${study.id}/edit`), 700);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell back="/" title="New study" subtitle="Conversational setup">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        {/* ---------- Chat ---------- */}
        <div className="card flex min-h-[65vh] flex-col">
          <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3 sm:px-5">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-50 text-brand-700">
              <Icon name="sparkles" size={14} />
            </span>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-900">
                AI research assistant
              </div>
              <div className="text-2xs text-slate-500">
                Answers a few questions, then drafts a full interview guide
              </div>
            </div>
          </div>
          <div
            ref={scrollerRef}
            className="flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-5"
          >
            {messages.map((m, i) => (
              <Bubble key={i} role={m.role} text={m.text} />
            ))}
            {loading && <TypingBubble />}
            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                <Icon name="alert" size={14} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {messages.length <= 1 && (
            <div className="border-t border-slate-200 px-4 py-3 sm:px-5">
              <div className="text-2xs font-medium text-slate-500">
                Try one of these
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="chip hover:border-brand-400 hover:bg-brand-50 hover:text-brand-700"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-slate-200 p-3 sm:p-4">
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
                placeholder="Tell me what you're trying to figure out..."
                className="input max-h-40 min-h-[44px] resize-none py-3"
              />
              <button
                onClick={() => send()}
                disabled={loading || !input.trim()}
                className="btn-primary h-11 px-4"
                aria-label="Send"
              >
                <Icon name="send" size={14} />
              </button>
            </div>
            <div className="mt-1.5 px-1 text-2xs text-slate-400">
              <span className="kbd">Enter</span> to send ·{" "}
              <span className="kbd">Shift</span>+<span className="kbd">Enter</span> for newline
            </div>
          </div>
        </div>

        {/* ---------- Side guidance ---------- */}
        <aside className="hidden lg:block">
          <div className="card card-pad">
            <div className="text-2xs font-semibold uppercase tracking-wider text-brand-700">
              What the AI will ask you
            </div>
            <ol className="mt-3 space-y-3 text-sm text-slate-700">
              <Step i={1} title="The decision">
                What product question are you trying to inform?
              </Step>
              <Step i={2} title="Who you want to hear from">
                General population, or a specific audience.
              </Step>
              <Step i={3} title="Your hypotheses">
                What do you already believe that you want to test?
              </Step>
            </ol>
            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              Tip: the more specific the decision, the sharper the interview.
              "Should we add Slack integration?" beats "learn about users".
            </div>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}

function Step({
  i,
  title,
  children,
}: {
  i: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-600 text-2xs font-semibold text-white">
        {i}
      </span>
      <div>
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        <div className="text-xs text-slate-600">{children}</div>
      </div>
    </li>
  );
}

function Bubble({ role, text }: { role: "user" | "model"; text: string }) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "bg-brand-600 text-white"
            : "border border-slate-200 bg-slate-50 text-slate-800"
        }`}
      >
        {text}
      </div>
    </div>
  );
}

function TypingBubble() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
        <span
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400"
          style={{ animationDelay: "0ms" }}
        />
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
  );
}
