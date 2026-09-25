import defaultTheme from 'tailwindcss/defaultTheme'

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  // Wrap hover: in @media (hover:hover) so taps on touch screens don't leave hover styles stuck.
  future: {
    hoverOnlyWhenSupported: true,
  },
  theme: {
    // xs must precede the defaults so its min-width rules sort before sm/md/lg.
    screens: {
      xs: '380px',
      ...defaultTheme.screens,
    },
    extend: {
      colors: {
        // Graphite & Indigo — contrast ratios noted against surface (#171A21)
        base:      '#0F1115',
        surface:   '#171A21',
        elevated:  '#1F232C',
        sidebar:   '#0B0D11',

        line: {
          DEFAULT: '#2A2F3A',
          subtle:  '#22262F',
          strong:  '#3A404D',
          input:   '#646C7A', // 3.3:1 — meets 1.4.11 non-text contrast for form fields
        },

        fg: {
          DEFAULT:  '#ECEEF2', // ~15:1
          muted:    '#B3B9C5', // ~9:1
          subtle:   '#8B93A1', // ~5.7:1 — lowest allowed for text
          disabled: '#5D6472', // decorative/disabled only, never body text
        },

        primary: {
          DEFAULT: '#4F46E5', // white text 6.3:1
          hover:   '#4338CA', // white text 7.9:1
        },
        accent:  '#818CF8', // ~5.8:1

        success: '#34D399',
        danger:  '#F87171',
        warning: '#FBBF24',
        info:    '#38BDF8',
      },
      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
      },
      borderRadius: {
        'card':  '12px',
        'modal': '14px',
      },
    },
  },
  plugins: [],
}
