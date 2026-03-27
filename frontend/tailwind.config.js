/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef9ff",
          100: "#d9f1ff",
          500: "#1f7aea",
          700: "#1459b0",
          900: "#0a1a32"
        }
      },
      boxShadow: {
        glow: "0 10px 25px -10px rgba(31, 122, 234, 0.45)"
      }
    }
  },
  plugins: []
};
