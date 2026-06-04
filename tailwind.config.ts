import type { Config } from "tailwindcss";

// Tailwind v4: primary config is in globals.css via @theme
// This file is kept for darkMode and plugin compatibility only
const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
};

export default config;
