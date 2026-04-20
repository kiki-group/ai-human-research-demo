import { useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import AppShell from "../components/AppShell";
import Icon from "../components/Icon";
import { useAppState } from "../state/AppState";
import { normalizeAudience } from "../lib/gemini";
import type { Audience } from "../lib/types";

const GENDER_OPTIONS = ["Any", "Women", "Men", "Non-binary"];
const REGION_OPTIONS = ["US", "Canada", "UK", "EU", "LATAM", "APAC", "Global"];
const AGE_BUCKETS: [string, [number, number]][] = [
  ["18-24", [18, 24]],
  ["25-34", [25, 34]],
  ["35-44", [35, 44]],
  ["45-54", [45, 54]],
  ["55+", [55, 99]],
];

export default function AudiencePicker() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { apiKey, getStudy, setAudience } = useAppState();
  const study = id ? getStudy(id) : undefined;

  const [mode, setMode] = useState<"general" | "specific">(
    study?.audience?.mode ?? "general"
  );
  const [freeText, setFreeText] = useState(study?.audience?.freeText ?? "");
  const [selectedAges, setSelectedAges] = useState<string[]>([]);
  const [selectedGenders, setSelectedGenders] = useState<string[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [target, setTarget] = useState<number>(study?.audience?.target ?? 50);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!study) return <Navigate to="/" replace />;

  function toggle(arr: string[], v: string) {
    return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
  }

  function buildDescription(): string {
    const parts: string[] = [];
    if (selectedAges.length) parts.push(`ages ${selectedAges.join(", ")}`);
    if (selectedGenders.length && !selectedGenders.includes("Any"))
      parts.push(selectedGenders.join("/"));
    if (selectedRegions.length) parts.push(`in ${selectedRegions.join(", ")}`);
    if (freeText.trim()) parts.push(freeText.trim());
    return parts.join("; ");
  }

  function ageRangeFromChips(): [number, number] | undefined {
    if (!selectedAges.length) return undefined;
    return [
      Math.min(
        ...selectedAges.map(
          (k) => AGE_BUCKETS.find(([label]) => label === k)![1][0]
        )
      ),
      Math.max(
        ...selectedAges.map(
          (k) => AGE_BUCKETS.find(([label]) => label === k)![1][1]
        )
      ),
    ];
  }

  async function saveAndContinue() {
    if (!study) return;
    setLoading(true);
    setError(null);
    try {
      let audience: Audience;
      if (mode === "general") {
        audience = { mode: "general", label: "General population", target };
      } else {
        const description = buildDescription();
        if (!description) {
          setError("Add at least one filter or describe your audience.");
          setLoading(false);
          return;
        }
        if (!apiKey) throw new Error("Missing API key");
        const normalized = await normalizeAudience(apiKey, description);
        const chipAgeRange = ageRangeFromChips();
        audience = {
          mode: "specific",
          freeText: description,
          label: normalized.label,
          target,
          filters: {
            ageRange:
              normalized.filters.ageMin !== undefined &&
              normalized.filters.ageMax !== undefined
                ? [normalized.filters.ageMin, normalized.filters.ageMax]
                : chipAgeRange,
            genders:
              normalized.filters.genders && normalized.filters.genders.length
                ? normalized.filters.genders
                : selectedGenders.filter((g) => g !== "Any"),
            regions:
              normalized.filters.regions && normalized.filters.regions.length
                ? normalized.filters.regions
                : selectedRegions,
            roles: normalized.filters.roles,
            traits: normalized.filters.traits,
          },
        };
      }
      setAudience(study.id, audience);
      navigate(`/study/${study.id}/preview`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const preview = (() => {
    if (mode === "general") return "General population";
    const desc = buildDescription();
    return desc || "No filters set yet";
  })();

  return (
    <AppShell
      back={`/study/${study.id}/edit`}
      title="Audience"
      subtitle={study.title}
      actions={
        <button
          onClick={saveAndContinue}
          disabled={loading}
          className="btn-primary"
        >
          {loading ? "Saving..." : "Preview interview"}
          {!loading && <Icon name="arrow-right" size={14} />}
        </button>
      }
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          {/* Mode selector */}
          <div className="card card-pad">
            <div className="label">Who should we interview?</div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <ModeCard
                active={mode === "general"}
                onClick={() => setMode("general")}
                icon="users"
                title="General population"
                subtitle="Broad panel of adults, diverse demographics"
              />
              <ModeCard
                active={mode === "specific"}
                onClick={() => setMode("specific")}
                icon="sparkles"
                title="Specific audience"
                subtitle="Target by age, region, role, or traits"
              />
            </div>
          </div>

          {mode === "specific" && (
            <>
              <div className="card card-pad">
                <div className="label">Demographics</div>
                <div className="mt-3">
                  <div className="text-xs font-medium text-slate-700">Age</div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {AGE_BUCKETS.map(([label]) => (
                      <button
                        key={label}
                        onClick={() =>
                          setSelectedAges((a) => toggle(a, label))
                        }
                        className={`chip ${
                          selectedAges.includes(label) ? "chip-active" : ""
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-xs font-medium text-slate-700">
                    Gender
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {GENDER_OPTIONS.map((g) => (
                      <button
                        key={g}
                        onClick={() =>
                          setSelectedGenders((a) => toggle(a, g))
                        }
                        className={`chip ${
                          selectedGenders.includes(g) ? "chip-active" : ""
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-xs font-medium text-slate-700">
                    Region
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {REGION_OPTIONS.map((r) => (
                      <button
                        key={r}
                        onClick={() =>
                          setSelectedRegions((a) => toggle(a, r))
                        }
                        className={`chip ${
                          selectedRegions.includes(r) ? "chip-active" : ""
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="card card-pad">
                <div className="flex items-center justify-between">
                  <div className="label">Describe your ideal respondent</div>
                  <span className="text-2xs text-slate-500">
                    Normalized by AI
                  </span>
                </div>
                <textarea
                  value={freeText}
                  onChange={(e) => setFreeText(e.target.value)}
                  className="input mt-2 min-h-[90px] resize-y"
                  placeholder='e.g. "SaaS founders who recently raised a seed round" or "parents of kids under 5 who grocery-shop online weekly"'
                />
              </div>
            </>
          )}

          <div className="card card-pad">
            <div className="flex items-center justify-between">
              <div className="label">Target interview count</div>
              <span className="text-base font-semibold tabular-nums text-slate-900">
                {target}
              </span>
            </div>
            <input
              type="range"
              min={10}
              max={200}
              step={5}
              value={target}
              onChange={(e) => setTarget(Number(e.target.value))}
              className="mt-3 w-full accent-brand-600"
            />
            <div className="mt-1 flex justify-between text-2xs text-slate-500">
              <span>10</span>
              <span>200</span>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              <Icon name="alert" size={14} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Sticky preview pane on desktop */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="card card-pad">
            <div className="label">Audience preview</div>
            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="text-xs font-medium text-slate-700">
                {mode === "general" ? "General population" : "Specific audience"}
              </div>
              <div className="mt-1 text-sm text-slate-900">{preview}</div>
            </div>
            <div className="mt-4 rounded-lg border border-slate-200 p-3 text-xs text-slate-600">
              <div className="flex items-center gap-2 font-medium text-slate-900">
                <Icon name="info" size={14} className="text-brand-700" />
                What happens next
              </div>
              <p className="mt-1">
                We recruit ~{target} matching respondents from our panel,
                conduct AI-moderated voice interviews, and produce a
                synthesized report.
              </p>
            </div>
          </div>

          <button
            onClick={saveAndContinue}
            disabled={loading}
            className="btn-primary mt-4 hidden w-full lg:inline-flex"
          >
            {loading ? "Saving..." : "Preview interview"}
            {!loading && <Icon name="arrow-right" size={14} />}
          </button>
        </aside>
      </div>
    </AppShell>
  );
}

function ModeCard({
  active,
  onClick,
  icon,
  title,
  subtitle,
}: {
  active: boolean;
  onClick: () => void;
  icon: Parameters<typeof Icon>[0]["name"];
  title: string;
  subtitle: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`group flex flex-col items-start gap-2 rounded-lg border p-3 text-left transition ${
        active
          ? "border-brand-500 bg-brand-50/50 ring-2 ring-brand-500/20"
          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      <span
        className={`grid h-8 w-8 place-items-center rounded-md ${
          active ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600"
        }`}
      >
        <Icon name={icon} size={16} />
      </span>
      <div>
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        <div className="mt-0.5 text-xs text-slate-600">{subtitle}</div>
      </div>
    </button>
  );
}
