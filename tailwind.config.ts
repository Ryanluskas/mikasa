import type { Config } from 'tailwindcss';

/**
 * Design System do Mikasa.
 *
 * As cores são declaradas como variáveis CSS em `globals.css` para que o
 * mesmo token funcione em light e dark sem duplicar classe nenhuma.
 * Regra: nenhum componente escreve hexadecimal. Sempre token.
 */
const config: Config = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--mk-bg) / <alpha-value>)',
        surface: 'rgb(var(--mk-surface) / <alpha-value>)',
        raised: 'rgb(var(--mk-raised) / <alpha-value>)',
        ink: 'rgb(var(--mk-ink) / <alpha-value>)',
        muted: 'rgb(var(--mk-muted) / <alpha-value>)',
        faint: 'rgb(var(--mk-faint) / <alpha-value>)',
        line: 'rgb(var(--mk-line) / <alpha-value>)',
        accent: 'rgb(var(--mk-accent) / <alpha-value>)',
        'accent-soft': 'rgb(var(--mk-accent-soft) / <alpha-value>)',
        success: 'rgb(var(--mk-success) / <alpha-value>)',
        warning: 'rgb(var(--mk-warning) / <alpha-value>)',
        danger: 'rgb(var(--mk-danger) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        sm: '8px',
        DEFAULT: '12px',
        md: '14px',
        lg: '18px',
        xl: '24px',
      },
      boxShadow: {
        // Sombras discretas. O Mikasa separa por espaço, não por profundidade.
        soft: '0 1px 2px rgb(37 37 37 / 0.04), 0 6px 16px -8px rgb(37 37 37 / 0.10)',
        lift: '0 2px 4px rgb(37 37 37 / 0.05), 0 12px 32px -12px rgb(37 37 37 / 0.16)',
      },
      spacing: {
        // Alturas seguras para bottom navigation em telas com notch.
        safe: 'env(safe-area-inset-bottom, 0px)',
      },
      fontSize: {
        display: ['2rem', { lineHeight: '1.15', letterSpacing: '-0.02em' }],
        title: ['1.375rem', { lineHeight: '1.25', letterSpacing: '-0.015em' }],
        section: ['0.8125rem', { lineHeight: '1.2', letterSpacing: '0.06em' }],
      },
      transitionTimingFunction: {
        mk: 'cubic-bezier(0.22, 0.61, 0.36, 1)',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'none' },
        },
        'sheet-in': {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'none' },
        },
        fade: { from: { opacity: '0' }, to: { opacity: '1' } },
      },
      animation: {
        'fade-up': 'fade-up 260ms cubic-bezier(0.22,0.61,0.36,1) both',
        'sheet-in': 'sheet-in 240ms cubic-bezier(0.22,0.61,0.36,1) both',
        fade: 'fade 200ms ease both',
      },
    },
  },
  plugins: [],
};

export default config;
