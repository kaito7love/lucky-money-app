import type { Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        envelope: {
          DEFAULT: "#c8102e",
          dark: "#8f0a1f",
          gold: "#f2c14e",
        },
      },
      fontFamily: {
        sans: ["var(--font-be-vietnam-pro)", ...defaultTheme.fontFamily.sans],
      },
    },
  },
  plugins: [],
};

export default config;
