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
        clever: {
          beige: "#F4EDE3",
          cream: "#FBF7F1",
          sand: "#E6D9C6",
          sky: "#D4EEF8",
          skyMid: "#A9D4EA",
          skyDeep: "#6BAFCD",
          ink: "#3D4A55",
          muted: "#6B7680",
        },
      },
    },
  },
  plugins: [],
};
export default config;
