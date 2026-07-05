/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        ink: "#18211f",
        paper: "#fbfaf7",
        moss: "#66745e",
        teal: "#267671",
        coral: "#c8684d",
      },
    },
  },
  plugins: [],
};
