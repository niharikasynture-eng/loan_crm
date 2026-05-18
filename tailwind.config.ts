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
        // TeleCRM-inspired Purple Brand
        brand: {
          50:  '#f3f1ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#7c3aed',
          600: '#6d28d9',
          700: '#5b21b6',
          800: '#4c1d95',
          900: '#3b0764',
          950: '#2e1065',
        },
        // Sidebar accent color
        sidebar: {
          DEFAULT: '#2D1B69',
          hover:   '#3D2B85',
          active:  '#4C35A0',
          text:    '#BDB5D4',
          muted:   '#7B6FA0',
          border:  'rgba(255,255,255,0.08)',
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
        sans: ['Roboto', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '10px',
        lg:   '10px',
        xl:   '12px',
        '2xl': '16px',
      },
      boxShadow: {
        card:  '0 1px 3px 0 rgba(0,0,0,0.06), 0 1px 2px -1px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 12px 0 rgba(0,0,0,0.08)',
        modal: '0 20px 40px rgba(0,0,0,0.12)',
        input: '0 0 0 3px rgba(124,58,237,0.12)',
      },
    },
  },
  plugins: [],
};

export default config;
