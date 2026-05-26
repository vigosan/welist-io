/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        canvas: "#fafaf8",
        "canvas-dark": "#0a0a0a",
        ink: "#0c0c0b",
        paper: "#f0ede8",
        muted: "#a0a09c",
        gray: {
          50: "#fafaf8",
          100: "#f5f4ef",
          200: "#e9e6dd",
          300: "#d6d2c5",
          400: "#a8a39a",
          500: "#7a766c",
          600: "#5a5851",
          700: "#3a3a36",
          800: "#1f1f1d",
          900: "#0c0c0b",
          950: "#06060a",
        },
      },
      fontFamily: {
        mono: ["SpaceMono_400Regular"],
      },
    },
  },
  plugins: [],
};
