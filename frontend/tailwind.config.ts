import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark adult theme colors
        background: {
          DEFAULT: "#0a0a0a",
          secondary: "#111111",
          tertiary: "#1a1a1a",
        },
        foreground: {
          DEFAULT: "#fafafa",
          muted: "#a1a1aa",
        },
        accent: {
          DEFAULT: "#dc2626", // Red-600
          hover: "#b91c1c",   // Red-700
          light: "#ef4444",   // Red-500
        },
        border: {
          DEFAULT: "#27272a",
          hover: "#3f3f46",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in": "fadeIn 0.3s ease-in-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
