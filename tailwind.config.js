/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          blue: '#2563EB',
          'blue-dark': '#1E40AF',
          'blue-light': '#3B82F6',
        },
        secondary: {
          purple: '#7C3AED',
          'purple-dark': '#6D28D9',
        },
        neutral: {
          background: '#F9FAFB',
          surface: '#FFFFFF',
          border: '#E5E7EB',
          'text-primary': '#111827',
          'text-secondary': '#6B7280',
          'text-muted': '#9CA3AF',
        },
        status: {
          success: '#10B981',
          warning: '#F59E0B',
          error: '#EF4444',
          info: '#3B82F6',
        },
        chart: {
          1: '#2563EB',
          2: '#7C3AED',
          3: '#10B981',
          4: '#F59E0B',
          5: '#EF4444',
          6: '#06B6D4',
          7: '#EC4899',
          8: '#8B5CF6',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['Fira Code', 'Courier New', 'monospace'],
      },
    },
  },
  plugins: [],
}
