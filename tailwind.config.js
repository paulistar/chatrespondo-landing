/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './privacidade.html', './termos.html', './src/**/*.{js,html}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--color-bg)',
        elevated: 'var(--color-bg-elevated)',
        muted: 'var(--color-bg-muted)',
        accent: 'var(--color-accent)',
        'accent-hover': 'var(--color-accent-hover)',
      },
      fontFamily: {
        display: ['"Instrument Serif"', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        content: '72rem',
      },
    },
  },
  plugins: [],
};
