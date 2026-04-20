interface Props {
  size?: number;
  className?: string;
}

export default function Logo({ size = 28, className }: Props) {
  return (
    <span
      className={`inline-grid place-items-center rounded-lg bg-brand-600 text-white shadow-sm ${className ?? ""}`}
      style={{ width: size, height: size }}
    >
      <svg
        width={size * 0.6}
        height={size * 0.6}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      >
        <path d="M6 10v4M10 6v12M14 8v8M18 10v4" />
      </svg>
    </span>
  );
}
