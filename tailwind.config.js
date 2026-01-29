/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#8DB600", // A fresh green inspired by the logo
        secondary: "#4A7023", // Forest green for accents
        "background-light": "#F9FBF7", // Soft cream/sage tinted background
        "background-dark": "#12140E",
        accent: "#ECF3E5",
        "card-light": "#FFFFFF",
        "card-dark": "#1C2418",
        "earth-brown": "#5D4037",
      },
      fontFamily: {
        display: ["Plus Jakarta Sans", "sans-serif"],
        sans: ["Lexend", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "1rem",
        "xl": "1.5rem",
      },
    },
  },
  plugins: [],
}
