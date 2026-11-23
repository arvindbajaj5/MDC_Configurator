import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          orange: '#FF5539',
          navy: '#002870',
          cobalt: '#1C38F5',
          emerald: '#00B290',
          amber: '#FFB600'
        },
        cad: {
          bg: '#0B1220',
          grid: '#182438',
          line: '#38BDF8'
        }
      },
      fontFamily: {
        sans: ['Roboto', 'Inter', 'system-ui', 'sans-serif'],
        display: ['"Tosh A Black"', 'Roboto', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace']
      },
      borderRadius: {
        cad: '4px'
      }
    }
  },
  plugins: []
} satisfies Config;
