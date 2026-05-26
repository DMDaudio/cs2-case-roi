import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          base: "#0e0f12",
          raised: "#15171c",
          elevated: "#1c1f26",
          border: "#262932",
        },
        ink: {
          DEFAULT: "#e6e8ee",
          dim: "#9aa0ad",
          faint: "#5a6070",
        },
        accent: {
          orange: "#de9b35",
          cyan: "#5e98d9",
        },
        rarity: {
          mil_spec: "#4b69ff",
          restricted: "#8847ff",
          classified: "#d32ce6",
          covert: "#eb4b4b",
          rare_special: "#ffd700",
        },
        good: "#3fbf7f",
        bad: "#eb4b4b",
        warn: "#de9b35",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      boxShadow: {
        glow: "0 0 24px -8px rgba(222, 155, 53, 0.55)",
        "glow-cyan": "0 0 24px -8px rgba(94, 152, 217, 0.55)",
      },
      backgroundImage: {
        noise:
          "url(\"data:image/svg+xml;utf8,<svg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/></svg>\")",
      },
    },
  },
  plugins: [],
};

export default config;
