/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./layouts/**/*.{js,ts,jsx,tsx}",
    "./context/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'mystery': ['"Gowun Batang"', 'serif'],
        'guide': ['"Nanum Gothic"', 'sans-serif'],
        'sans': ['"Noto Sans KR"', 'sans-serif'],
      },
      animation: {
        'shake': 'shake 0.3s ease-in-out',
        'flash': 'flash 0.4s ease-out',
        'laser-pulse': 'laser-pulse 1.5s infinite',
        'fade-in': 'fade-in 0.7s ease-out forwards',
        'slide-up': 'slide-up 0.7s ease-out forwards',
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-5px)' },
          '50%': { transform: 'translateX(5px)' },
          '75%': { transform: 'translateX(-5px)' },
        },
        flash: {
          '0%': { backgroundColor: 'transparent' },
          '50%': { backgroundColor: 'rgba(255, 255, 255, 0.15)' },
          '100%': { backgroundColor: 'transparent' },
        },
        'laser-pulse': {
          '0%': { transform: 'scale(1)', opacity: '1', boxShadow: '0 0 0 0 rgba(220, 38, 38, 0.7)' },
          '70%': { transform: 'scale(1.8)', opacity: '0', boxShadow: '0 0 0 20px rgba(220, 38, 38, 0)' },
          '100%': { transform: 'scale(1)', opacity: '0', boxShadow: '0 0 0 0 rgba(220, 38, 38, 0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      }
    },
  },
  plugins: [],
}
