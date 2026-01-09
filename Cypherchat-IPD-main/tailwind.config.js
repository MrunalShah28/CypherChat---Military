/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        mil: {
          base: "#050a05",    // Deepest Black/Green
          panel: "#0a140a",   // Slightly lighter panel
          border: "#1a331a",  // Dark Green Border
          text: "#4ade80",    // Matrix Green Text
          accent: "#22c55e",  // Bright Green Accent
          alert: "#ef4444",   // Red for "Investigate"
        }
      },
      fontFamily: {
        mono: ['"Courier New"', 'Courier', 'monospace'], // Classic Terminal Font
      },
      backgroundImage: {
        'grid-pattern': "linear-gradient(to right, #1a331a 1px, transparent 1px), linear-gradient(to bottom, #1a331a 1px, transparent 1px)",
      }
    },
  },
  plugins: [],
}