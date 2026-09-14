import path from "path";
import { fileURLToPath } from "url";

const dir = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    path.join(dir, "index.html"),
    path.join(dir, "src/**/*.{ts,tsx}"),
  ],
  theme: {
    extend: {
      colors: {
        app: "#252e42",
        surface: "#2f3a52",
        surface2: "#3a4560",
        line: "#47546f",
        muted: "#adb8d0",
        accent: "#e50914",
        accent2: "#ff5c67",
        gold: "#ffc93c",
      },
      maxWidth: {
        phone: "480px",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
