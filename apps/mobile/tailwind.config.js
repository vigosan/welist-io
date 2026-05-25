/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        canvas: "#f8f7f5",
        "canvas-dark": "#0d0d0d",
        ink: "#0c0c0b",
        paper: "#f0ede8",
        muted: "#a0a09c",
        gray: {
          950: "#0d0d0d",
          900: "#171717",
          800: "#242424",
          700: "#363636",
        },
      },
      fontFamily: {
        sans: ["SpaceGrotesk_400Regular"],
        mono: ["SpaceMono_400Regular"],
      },
    },
  },
  plugins: [],
};
