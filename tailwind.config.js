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
        // Admin CMS palette. Semantic on purpose: the panel is themed through
        // these tokens, never with raw neutral-* greys, so a future restyle is
        // one edit here instead of a sweep across 80+ files.
        admin: {
          sidebar: "#12372A",        // forest green shell
          "sidebar-hover": "#1B4A38",
          "sidebar-border": "#1E4E3B",
          "sidebar-muted": "#8FB3A3", // idle nav labels
          "active-bg": "#C8EFDC",     // selected nav pill
          "active-fg": "#0F3B2C",
          accent: "#0E8F5F",          // primary actions
          "accent-hover": "#0B7A50",
          "accent-soft": "#E6F6EE",   // subtle accent surfaces
          bg: "#F7F8F3",              // cream page background
          border: "#E4E7DC",
        },
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
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
