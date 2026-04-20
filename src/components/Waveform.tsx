interface Props {
  active?: boolean;
  bars?: number;
  className?: string;
  tone?: "brand" | "slate" | "white";
}

/**
 * Visual-only animated waveform (no audio plays). Used to evoke the AI
 * moderator speaking during interview preview.
 */
export default function Waveform({
  active = true,
  bars = 18,
  className,
  tone = "brand",
}: Props) {
  const color =
    tone === "brand"
      ? "bg-brand-500"
      : tone === "white"
      ? "bg-white/80"
      : "bg-slate-400";
  return (
    <div
      className={`flex h-12 items-center justify-center gap-[3px] ${className ?? ""}`}
      aria-hidden="true"
    >
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          className={`w-[3px] rounded-full ${color} ${
            active ? "animate-wave" : "opacity-40"
          }`}
          style={{
            height: `${14 + (i % 5) * 6}px`,
            animationDelay: `${(i * 80) % 900}ms`,
            animationDuration: `${700 + (i % 4) * 150}ms`,
          }}
        />
      ))}
    </div>
  );
}
