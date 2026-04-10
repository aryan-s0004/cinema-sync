/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#E50914",
          dark: "#B00000",
          light: "#ff6a72",
        },
      },
      fontFamily: {
        sans: ["Outfit", "Segoe UI", "sans-serif"],
        display: ["Space Grotesk", "Outfit", "sans-serif"],
      },
      boxShadow: {
        glow: "0 10px 25px -10px rgba(229, 9, 20, 0.4)",
        "glow-sm": "0 4px 15px -4px rgba(229, 9, 20, 0.3)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [],
};
