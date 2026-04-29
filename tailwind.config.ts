import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        midnight: "#0B1526",
        "navy-core": "#2038A0",
        "protocol-blue": "#2563EB",
        "pulse-blue": "#6B9FE4",
        cyan: "#00C8E8",
        "dark-text": "#0F172A",
        "muted-text": "#475569",
        "light-bg": "#F0F4F8",
        // Status colors
        "status-green": "#10B981",
        "status-yellow": "#F59E0B",
        "status-red": "#EF4444",
        // UI
        "panel-bg": "#FFFFFF",
        "panel-border": "#E2E8F0",
        "subtle": "#F8FAFC",
      },
      fontFamily: {
        sans: ["Poppins", "system-ui", "sans-serif"],
        serif: ["'Fraunces'", "Georgia", "serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
