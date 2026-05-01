import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Surfaces
        bg: "#FAFAF7",
        surface: "#FFFFFF",
        line: "#E8E8E5",
        // Text
        ink: "#0A0A0A",
        muted: "#5C5C5C",
        subtle: "#9A9A9A",
        // Brand
        accent: "#F25C1F",
        "accent-deep": "#D94A0F",
        "accent-soft": "#FFE4D6",
        // Status
        success: "#0F8A47",
        "success-soft": "#DCF5E6",
        warning: "#F2A91F",
        error: "#D43A3A",
      },
      fontFamily: {
        display: ['"Instrument Serif"', "ui-serif", "Georgia", "serif"],
        sans: ['"Inter"', "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "Menlo", "monospace"],
      },
      letterSpacing: {
        tightest: "-0.04em",
        tighter: "-0.025em",
        tight: "-0.015em",
      },
      borderRadius: {
        DEFAULT: "0.5rem",
        sm: "0.375rem",
        md: "0.5rem",
        lg: "0.75rem",
        xl: "1rem",
        "2xl": "1.25rem",
      },
      boxShadow: {
        // Subtle, fintech-style elevations
        card: "0 1px 0 rgba(10,10,10,0.04), 0 1px 3px rgba(10,10,10,0.04)",
        "card-hover": "0 1px 0 rgba(10,10,10,0.06), 0 4px 12px rgba(10,10,10,0.06)",
        focus: "0 0 0 3px rgba(242,92,31,0.18)",
        "focus-error": "0 0 0 3px rgba(212,58,58,0.18)",
      },
      transitionTimingFunction: {
        out: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      keyframes: {
        rise: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        pulseDot: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        rise: "rise 0.4s cubic-bezier(0.22, 1, 0.36, 1) both",
        pulseDot: "pulseDot 1.6s ease-in-out infinite",
        shimmer: "shimmer 1.6s linear infinite",
      },
    },
  },
  plugins: [],
};
export default config;
