/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        /* ── New brand palette ── */
        brandGreen: '#56AA3E',
        lightGreen: '#9BD266',
        mainBg: '#FCE4EE',
        softIvory: '#F6AFCD',
        primaryPink: '#E1005E',
        secondaryPink: '#FF76A4',
        accentYellow: '#F5C638',

        /* ── Backward-compat aliases ── */
        primaryGreen: '#56AA3E',
        softPink: '#F6AFCD',
        strongPink: '#E1005E',

        /* ── Dark mode ── */
        darkBg: '#1a1a2e',
        darkCard: '#16213e',
        darkAccent: '#0f3460',
      },
      fontFamily: {
        sans: ['Poppins', 'Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        card: '0 4px 20px rgba(225,0,94,0.07)',
        'card-hover': '0 16px 48px rgba(225,0,94,0.16)',
        glass: '0 8px 32px rgba(225,0,94,0.10)',
        'glow-pink': '0 0 36px rgba(225,0,94,0.28)',
        'glow-green': '0 0 30px rgba(86,170,62,0.25)',
        'glow-yellow': '0 0 24px rgba(245,198,56,0.30)',
        premium: '0 20px 60px rgba(0,0,0,0.08)',
        soft: '0 2px 12px rgba(246,175,205,0.18)',
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.35s ease-out',
        'slide-down': 'slideDown 0.35s ease-out',
        'scale-in': 'scaleIn 0.25s ease-out',
        'float': 'float 3s ease-in-out infinite',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
    },
  },
  plugins: [],
};
