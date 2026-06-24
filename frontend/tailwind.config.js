/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    screens: {
      'xs': '400px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
      '3xl': '1920px',
    },
    extend: {
      colors: {
        gold: {
          50:  '#fdf8ee',
          100: '#f9edce',
          200: '#f2d898',
          300: '#e9be5a',
          400: '#D4AF52',
          500: '#C9A84C',
          600: '#b8901e',
          700: '#99741a',
          800: '#7d5e1c',
          900: '#674e1b',
        },
        salon: {
          black: '#050505',
          dark:  '#0A0A0A',
          card:  '#131313',
          border:'rgba(255,255,255,0.06)',
          muted: '#777777',
          light: '#F5F0E8',
          white: '#FAFAFA',
        }
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans:    ['"Raleway"', 'sans-serif'],
        body:    ['"Lato"', 'sans-serif'],
        inter:   ['"Inter"', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['10px', { lineHeight: '1.5' }],
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '26': '6.5rem',
        '30': '7.5rem',
        '34': '8.5rem',
      },
      animation: {
        'fade-in':      'fadeIn 0.5s ease-out forwards',
        'fade-up':      'fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) forwards',
        'slide-up':     'slideUp 0.5s cubic-bezier(0.16,1,0.3,1) forwards',
        'slide-right':  'slideRight 0.5s cubic-bezier(0.16,1,0.3,1) forwards',
        'slide-up-fade':'slideUpFade 0.8s cubic-bezier(0.16,1,0.3,1) forwards',
        'shimmer':      'shimmer 2s ease-in-out infinite',
        'pulse-gold':   'pulseGold 2.8s ease-in-out infinite',
        'glow-pulse':   'glowPulse 3s ease-in-out infinite',
        'float-slow':   'floatSlow 12s ease-in-out infinite',
        'float-medium': 'floatMedium 8s ease-in-out infinite',
        'gold-shine':   'goldShine 3s ease-in-out infinite',
        'count-up':     'countUp 1.2s cubic-bezier(0.16,1,0.3,1) forwards',
        'spin-slow':    'spin 8s linear infinite',
        'rotate-slow':  'rotateSlow 20s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' }
        },
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        slideUpFade: {
          '0%':   { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        slideRight: {
          '0%':   { opacity: '0', transform: 'translateX(28px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' }
        },
        shimmer: {
          '0%':   { backgroundPosition: '-600px 0' },
          '100%': { backgroundPosition: 'calc(600px + 100%) 0' }
        },
        pulseGold: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(201,168,76,0.25)' },
          '50%':      { boxShadow: '0 0 0 12px rgba(201,168,76,0)' }
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 4px 24px rgba(201,168,76,0.2)' },
          '50%':      { boxShadow: '0 6px 40px rgba(201,168,76,0.45)' }
        },
        goldShine: {
          '0%':   { backgroundPosition: '0% 50%' },
          '50%':  { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' }
        },
        floatSlow: {
          '0%, 100%': { transform: 'translateY(0) scale(1)' },
          '50%':      { transform: 'translateY(-18px) scale(1.02)' }
        },
        floatMedium: {
          '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
          '50%':      { transform: 'translateY(-10px) rotate(-1.5deg)' }
        },
        countUp: {
          '0%':   { opacity: '0', transform: 'translateY(10px) scale(0.95)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' }
        },
        rotateSlow: {
          'from': { transform: 'rotate(0deg)' },
          'to':   { transform: 'rotate(360deg)' }
        },
      },
      backgroundImage: {
        'gold-gradient':    'linear-gradient(135deg, #B8901E 0%, #C9A84C 30%, #E8C96A 50%, #C9A84C 70%, #B8901E 100%)',
        'gold-gradient-sm': 'linear-gradient(135deg, #C9A84C 0%, #E8C96A 50%, #C9A84C 100%)',
        'dark-gradient':    'linear-gradient(135deg, #050505 0%, #0A0A0A 100%)',
        'hero-gradient':    'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.85) 100%)',
        'card-gradient':    'linear-gradient(145deg, #131313 0%, #0C0C0C 100%)',
        'royal-gradient':   'radial-gradient(ellipse at top center, rgba(201,168,76,0.08) 0%, transparent 60%), linear-gradient(180deg, #080808 0%, #050505 100%)',
      },
      borderRadius: {
        'sm':   '6px',
        'DEFAULT': '8px',
        'md':   '10px',
        'lg':   '12px',
        'xl':   '14px',
        '2xl':  '18px',
        '3xl':  '24px',
        '4xl':  '32px',
      },
      boxShadow: {
        'gold':       '0 0 0 1px rgba(201,168,76,0.2), 0 4px 20px rgba(201,168,76,0.12)',
        'gold-lg':    '0 0 0 1px rgba(201,168,76,0.3), 0 8px 40px rgba(201,168,76,0.2)',
        'gold-xl':    '0 0 0 1px rgba(201,168,76,0.4), 0 16px 60px rgba(201,168,76,0.3)',
        'dark':       '0 4px 24px rgba(0,0,0,0.6)',
        'dark-lg':    '0 12px 50px rgba(0,0,0,0.7)',
        'glass':      '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
        'glass-gold': '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(201,168,76,0.15)',
        'inner-gold': 'inset 0 1px 0 rgba(201,168,76,0.2)',
      },
      backdropBlur: {
        'xs': '4px',
        'sm': '8px',
        'DEFAULT': '12px',
        'md': '16px',
        'lg': '24px',
        'xl': '40px',
        '2xl': '64px',
      },
      transitionTimingFunction: {
        'royal':   'cubic-bezier(0.16, 1, 0.3, 1)',
        'bounce-royal': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      transitionDuration: {
        '400': '400ms',
        '600': '600ms',
        '800': '800ms',
        '1200': '1200ms',
      },
    },
  },
  plugins: [],
}
