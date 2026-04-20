/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Neutral scale - warm, slightly desaturated slate (enterprise-friendly)
        slate: {
          25: "#fcfcfd",
          50: "#f8fafc",
          100: "#f1f5f9",
          150: "#e7ecf1",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#64748b",
          600: "#475569",
          700: "#334155",
          800: "#1e293b",
          900: "#0f172a",
          950: "#020617",
        },
        // Primary brand - deep teal/emerald (research tool vibe)
        brand: {
          50: "#ecfdf5",
          100: "#d1fae5",
          200: "#a7f3d0",
          300: "#6ee7b7",
          400: "#34d399",
          500: "#10b981",
          600: "#059669",
          700: "#047857",
          800: "#065f46",
          900: "#064e3b",
          950: "#022c22",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        display: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem" }],
      },
      boxShadow: {
        soft: "0 1px 2px 0 rgba(15,23,42,0.04), 0 1px 3px 0 rgba(15,23,42,0.03)",
        card: "0 1px 2px 0 rgba(15,23,42,0.05), 0 4px 12px -4px rgba(15,23,42,0.06)",
        pop: "0 8px 24px -8px rgba(15,23,42,0.12), 0 2px 4px -1px rgba(15,23,42,0.06)",
        phone:
          "0 40px 80px -30px rgba(15,23,42,0.35), 0 0 0 1px rgba(15,23,42,0.08), 0 0 0 8px #0f172a, 0 0 0 9px rgba(255,255,255,0.06)",
      },
      keyframes: {
        wave: {
          "0%,100%": { transform: "scaleY(0.25)" },
          "50%": { transform: "scaleY(1)" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.95)", opacity: "0.6" },
          "100%": { transform: "scale(1.6)", opacity: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        wave: "wave 1s ease-in-out infinite",
        "pulse-ring": "pulse-ring 1.6s ease-out infinite",
        "fade-in": "fade-in 200ms ease-out",
        shimmer: "shimmer 2s linear infinite",
      },
    },
  },
  plugins: [],
};
