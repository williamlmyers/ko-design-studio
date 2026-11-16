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
        ko: {
          navy: "#0F172A",
          slate: "#1E293B",
          amber: "#D97706",
          gold: "#F59E0B",
          emerald: "#059669",
        },
      },
    },
  },
  plugins: [],
};

export default config;
