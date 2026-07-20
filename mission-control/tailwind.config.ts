import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        void: "#06090f",
        surface: "#0a0e14",
        panel: "#0d131c",
        raised: "#111a26",
        line: "#1b2634",
        "line-bright": "#2a3a4f",
        ink: "#e6edf3",
        muted: "#8b98a9",
        faint: "#5b6878",
        // validated chart series (dark surface #0a0e14)
        "series-1": "#0891b2",
        "series-2": "#d97706",
        "series-3": "#ec4899",
        "series-4": "#16a34a",
        // bright UI accents (chrome, not data)
        pulse: "#22d3ee",
        ember: "#fbbf24",
        rose: "#f472b6",
        mint: "#4ade80",
        alert: "#f87171",
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        "glow-cyan": "0 0 24px -6px rgba(34, 211, 238, 0.45)",
        "glow-amber": "0 0 24px -6px rgba(251, 191, 36, 0.4)",
        "glow-rose": "0 0 24px -6px rgba(244, 114, 182, 0.4)",
        "glow-mint": "0 0 24px -6px rgba(74, 222, 128, 0.4)",
        card: "0 1px 0 0 rgba(255,255,255,0.03) inset, 0 8px 30px -12px rgba(0,0,0,0.6)",
      },
      keyframes: {
        "pulse-ring": {
          "0%": { transform: "scale(1)", opacity: "0.6" },
          "100%": { transform: "scale(2.4)", opacity: "0" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        scan: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100vh)" },
        },
      },
      animation: {
        "pulse-ring": "pulse-ring 1.8s cubic-bezier(0.2, 0.6, 0.4, 1) infinite",
        shimmer: "shimmer 2.4s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
