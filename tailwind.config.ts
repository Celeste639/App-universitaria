import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
      },
      colors: {
        primary: {
          DEFAULT: "#B6CFDB",
          text: "#2C4A56",
        },
        surface: {
          DEFAULT: "#F1E2CF",
          light: "#F7EFE4",
          text: "#5A4A32",
        },
        accent: {
          DEFAULT: "#8AB0C4",
          text: "#1E3A47",
        },
        success: {
          DEFAULT: "#A9CBA0",
          text: "#22391B",
        },
        text: {
          DEFAULT: "#444544",
        },
      },
    },
  },
  plugins: [],
};
export default config;
