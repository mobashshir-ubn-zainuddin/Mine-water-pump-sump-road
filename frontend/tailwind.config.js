/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}", "*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Dark industrial theme inspired by control rooms
        background: '#0f1419',
        surface: '#1a1f2e',
        surfaceAlt: '#25293d',
        border: '#2d3447',
        text: '#e4e6eb',
        textSecondary: '#a8adb8',
        
        // Safety-critical alert colors
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
        
        // Accent color (cyan/teal for industrial look)
        accent: '#06b6d4',
        accentLight: '#22d3ee',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['Fira Code', 'monospace'],
      },
      boxShadow: {
        'glow-sm': '0 0 10px rgba(6, 182, 212, 0.3)',
        'glow': '0 0 20px rgba(6, 182, 212, 0.5)',
        'glow-lg': '0 0 30px rgba(6, 182, 212, 0.7)',
        'danger': '0 0 20px rgba(239, 68, 68, 0.5)',
        'warning': '0 0 20px rgba(245, 158, 11, 0.5)',
      },
    },
  },
  plugins: [],
};
