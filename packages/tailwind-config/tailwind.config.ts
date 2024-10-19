import { fontFamily } from 'tailwindcss/defaultTheme';
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}', '../../apps/*/app/**/*.{js,ts,jsx,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      fontFamily: {
        sans: ['var(--font-geist-sans)', ...fontFamily.sans],
        mono: ['var(--font-geist-mono)', ...fontFamily.mono],
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        link: 'hsl(var(--link))',
        overlay: 'hsl(var(--overlay))',
        'row-added': 'hsl(var(--row-added))',
        'row-added-hover': 'hsl(var(--row-added-hover))',
        'row-removed': 'hsl(var(--row-removed))',
        'row-removed-hover': 'hsl(var(--row-removed-hover))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        bitbucket: {
          DEFAULT: '#0052CC',
          foreground: '#FFFFFF',
          hover: '#1668E2',
        },
        github: {
          DEFAULT: '#24292f',
          foreground: '#FFFFFF',
          hover: '#454e5a',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        progress: {
          '0%': { transform: ' translateX(0) scaleX(0)', transformOrigin: '0% 50%' },
          '40%': { transform: 'translateX(0) scaleX(0.4)', transformOrigin: '0% 50%' },
          '100%': { transform: 'translateX(100%) scaleX(0.5)', transformOrigin: '0% 50%' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        progress: 'progress 1s infinite linear',
      },
      typography: {
        DEFAULT: {
          css: {
            '--tw-prose-body': 'hsl(var(--foreground))',
            '--tw-prose-bold': 'hsl(var(--foreground))',
            '--tw-prose-code': 'hsl(var(--foreground))',
            '--tw-prose-quotes': 'hsl(var(--accent-foreground))',
            '--tw-prose-headings': 'hsl(var(--muted-foreground))',
            p: {
              fontSize: '0.875rem',
              lineHeight: '1.25rem',
            },
            h1: {
              fontSize: '1.5rem',
              lineHeight: '2rem',
              strong: {
                fontWeight: '600',
              },
            },
            h2: {
              fontSize: '1.25rem',
              lineHeight: '1.875rem',
              strong: {
                fontWeight: '600',
              },
            },
            h3: {
              fontSize: '1.25rem',
              lineHeight: '1.75rem',
            },
            h4: {
              fontSize: '1rem',
              lineHeight: '1.5rem',
            },
            h5: {
              fontSize: '0.875rem',
              lineHeight: '1.25rem',
            },
            h6: {
              fontSize: '0.75rem',
              lineHeight: '1rem',
            },
          },
        },
      },
    },
  },
  plugins: [require('tailwindcss-animate'), require('@tailwindcss/typography')],
};
export default config;
