import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Design System Primary — #6C5CE7
        brand: {
          50:  '#f0eeff',
          100: '#e5e0ff',
          200: '#cdc5ff',
          300: '#a99bf7',
          400: '#8b79f0',
          500: '#6C5CE7',
          600: '#5849c2',
          700: '#4739a0',
          800: '#382e80',
          900: '#2a2263',
          950: '#1a1540',
        },
        // Sidebar — light theme
        sidebar: {
          DEFAULT: '#FFFFFF',
          hover:   'rgba(108,92,231,0.06)',
          active:  'rgba(108,92,231,0.10)',
          text:    '#64748B',
          muted:   '#94A3B8',
          border:  '#E2E8F0',
        },
        // Content area
        surface: {
          DEFAULT: '#F2F3F8',
          50:      '#F8F9FC',
          100:     '#F2F3F8',
          200:     '#E9EAF0',
          card:    '#FFFFFF',
        },
        // Semantic Colors
        success: {
          DEFAULT: '#10b981',
          50:      '#ecfdf5',
          100:     '#d1fae5',
          200:     '#a7f3d0',
          500:     '#10b981',
          600:     '#059669',
          700:     '#047857',
        },
        warning: {
          DEFAULT: '#f59e0b',
          50:      '#fffbeb',
          100:     '#fef3c7',
          500:     '#f59e0b',
          600:     '#d97706',
          700:     '#b45309',
        },
        danger: {
          DEFAULT: '#ef4444',
          50:      '#fef2f2',
          100:     '#fee2e2',
          500:     '#ef4444',
          600:     '#dc2626',
          700:     '#b91c1c',
        },
        info: {
          DEFAULT: '#3b82f6',
          50:      '#eff6ff',
          100:     '#dbeafe',
          500:     '#3b82f6',
          600:     '#2563eb',
          700:     '#1d4ed8',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '10px',
        lg:   '10px',
        xl:   '12px',
        '2xl': '16px',
      },
      boxShadow: {
        card:  '0 4px 12px rgba(0,0,0,0.06)',
        'card-hover': '0 6px 20px rgba(0,0,0,0.08)',
        modal: '0 20px 40px rgba(0,0,0,0.12)',
        input: '0 0 0 3px rgba(108,92,231,0.12)',
      },
    },
  },
  plugins: [],
};

export default config;
