/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./lib/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Salvo tactical color palette (Citizen-inspired dark theme)
        tactical: {
          bg: '#0a0a0a',        // Deep black background
          bgSecondary: '#1a1a1a', // Secondary background
          text: '#ffffff',       // Primary text
          textMuted: '#a0a0a0',  // Muted text
          accent: '#ff6b35',     // Primary accent (orange)
          green: '#00ff88',      // Hard Party Green (success/revealed)
          red: '#ff4444',        // Critical/urgent
          border: '#2a2a2a',     // Border color
        },
      },
    },
  },
  plugins: [],
}
