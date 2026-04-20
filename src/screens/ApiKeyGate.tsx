import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppState } from "../state/AppState";
import { validateApiKey } from "../lib/gemini";
import Waveform from "../components/Waveform";
import Logo from "../components/Logo";
import Icon from "../components/Icon";

export default function ApiKeyGate() {
  const navigate = useNavigate();
  const { setApiKey } = useAppState();
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!key.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const ok = await validateApiKey(key.trim());
      if (!ok) {
        setError(
          "That key didn't work. Double-check it at aistudio.google.com."
        );
        setLoading(false);
        return;
      }
      setApiKey(key.trim());
      navigate("/", { replace: true });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong validating the key."
      );
      setLoading(false);
    }
  }

  return (
    <div className="min-h-full bg-slate-50">
      <div className="mx-auto grid min-h-screen w-full max-w-6xl grid-cols-1 lg:grid-cols-2">
        {/* ---------- Marketing / branding pane ---------- */}
        <div className="hidden flex-col justify-between border-r border-slate-200 bg-white px-10 py-12 lg:flex">
          <div className="flex items-center gap-2.5">
            <Logo size={32} />
            <div className="text-sm font-semibold tracking-tight">
              AI-Driven Human Research
            </div>
          </div>

          <div className="max-w-md">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
              Live demo
            </div>
            <h1 className="mt-6 text-4xl font-semibold leading-[1.1] tracking-tight text-slate-900">
              Talk to your users.
              <br />
              <span className="text-brand-600">At any scale.</span>
            </h1>
            <p className="mt-5 text-base leading-relaxed text-slate-600">
              Run AI-moderated voice interviews with real humans, then get a
              synthesized report in hours. This demo generates every study and
              report using your own Gemini API key — nothing leaves your
              browser.
            </p>

            <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-brand-600 text-white">
                  <Icon name="wave" size={18} />
                </span>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-brand-700">
                    AI moderator
                  </div>
                  <div className="text-sm text-slate-900">
                    Adaptive, empathetic, tireless.
                  </div>
                </div>
              </div>
              <Waveform active bars={26} className="mt-3 !h-8" />
              <p className="mt-3 text-sm italic text-slate-700">
                "Thanks for joining! I'd love to hear about the last time you
                tried to plan a weekend trip with friends..."
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <Icon name="check-circle" size={14} className="text-brand-600" />
              No account required
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Icon name="check-circle" size={14} className="text-brand-600" />
              Key stays in your browser
            </span>
          </div>
        </div>

        {/* ---------- Key entry pane ---------- */}
        <div className="flex items-center justify-center px-5 py-10 sm:px-10">
          <div className="w-full max-w-md">
            <div className="flex items-center gap-2.5 lg:hidden">
              <Logo size={28} />
              <div className="text-sm font-semibold tracking-tight">
                AI-Driven Human Research
              </div>
            </div>
            <div className="mt-6 lg:mt-0">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                Enter your Gemini API key
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                This demo runs entirely in your browser. The key is saved only
                to this device's <span className="kbd">localStorage</span>.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-3">
              <label htmlFor="apikey" className="label">
                Gemini API key
              </label>
              <input
                id="apikey"
                autoFocus
                type="password"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="AIza..."
                className="input font-mono text-sm"
                autoComplete="off"
                spellCheck={false}
              />
              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  <Icon name="alert" size={14} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <button
                type="submit"
                disabled={loading || !key.trim()}
                className="btn-primary w-full !py-3"
              >
                {loading ? "Validating..." : "Continue"}
                {!loading && <Icon name="arrow-right" size={14} />}
              </button>
              <p className="pt-2 text-center text-xs text-slate-500">
                Need a key?{" "}
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-brand-700 underline underline-offset-2 hover:text-brand-800"
                >
                  Get one free at Google AI Studio
                  <Icon name="external" size={12} />
                </a>
              </p>
            </form>

            <div className="mt-10 grid grid-cols-3 gap-3 text-center">
              <Feature label="Generative setup" icon="sparkles" />
              <Feature label="AI moderator" icon="mic" />
              <Feature label="Synthesized report" icon="check-circle" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Feature({
  label,
  icon,
}: {
  label: string;
  icon: Parameters<typeof Icon>[0]["name"];
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <span className="mx-auto grid h-8 w-8 place-items-center rounded-md bg-brand-50 text-brand-700">
        <Icon name={icon} size={16} />
      </span>
      <div className="mt-1.5 text-2xs font-medium text-slate-700">{label}</div>
    </div>
  );
}
