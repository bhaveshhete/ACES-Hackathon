import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        navy:    "#0B1220",
        indigo:  "#172554",
        blue:    { DEFAULT: "#3B82F6", light: "#60A5FA" },
        gold:    { DEFAULT: "#D6A84F", light: "#EAC580" },
        silver:  "#F1F5F9",
        coral:   "#F87171",
        surface: { 0: "#0B1220", 1: "#111827", 2: "#1E293B", 3: "#334155" },
      },
    },
  },
  plugins: [],
};
export default config;
