import daisyui from "daisyui";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {},
  },
  plugins: [daisyui],
  daisyui: {
    themes: [
      {
        cinema: {
          primary: "#c0392b",
          secondary: "#d4a017",
          accent: "#3d5a80",
          neutral: "#0f0f11",
          "base-100": "#0f0f11",
          "base-200": "#18181b",
          "base-300": "#27272a",
          "base-content": "#f5f5f5",
          info: "#3b82f6",
          success: "#22c55e",
          warning: "#f59e0b",
          error: "#ef4444",
          "rounded-box": "0.5rem",
          "rounded-btn": "0.5rem",
          "rounded-badge": "0.5rem",
        },
      },
    ],
  },
};
