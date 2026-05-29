/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkBg: '#05070a',
        panelBg: '#0e121a',
        panelBorder: '#1c2331',
        neonCyan: '#00f0ff',
        neonGold: '#ffd700',
        neonSilver: '#c0c0c0',
        neonBronze: '#cd7f32',
        neonGreen: '#39ff14',
        neonPink: '#ff007f',
      },
      boxShadow: {
        neonCyan: '0 0 10px rgba(0, 240, 255, 0.4), 0 0 20px rgba(0, 240, 255, 0.1)',
        neonGold: '0 0 10px rgba(255, 215, 0, 0.4), 0 0 20px rgba(255, 215, 0, 0.1)',
        neonSilver: '0 0 10px rgba(192, 192, 192, 0.4), 0 0 20px rgba(192, 192, 192, 0.1)',
        neonBronze: '0 0 10px rgba(205, 127, 50, 0.4), 0 0 20px rgba(205, 127, 50, 0.1)',
        neonGreen: '0 0 10px rgba(57, 255, 20, 0.4), 0 0 20px rgba(57, 255, 20, 0.1)',
      },
      fontFamily: {
        sans: ['Inter', 'Outfit', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
