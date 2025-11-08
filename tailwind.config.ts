import type { Config } from 'tailwindcss'

export default {
  darkMode: ["class"],
  content: ['./app/**/{**,.client,.server}/**/*.{js,jsx,ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1rem",
        sm: "1.5rem",
        lg: "2rem",
      },
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['Lora', 'Georgia', 'serif'],
      },
      fontSize: {
        // Smaller base sizes for mobile, larger for desktop
        'xs': ['0.6875rem', { lineHeight: '1rem' }],      // 11px mobile
        'sm': ['0.8125rem', { lineHeight: '1.25rem' }],    // 13px mobile
        'base': ['0.875rem', { lineHeight: '1.5rem' }],    // 14px mobile
        'lg': ['1rem', { lineHeight: '1.75rem' }],         // 16px mobile
        'xl': ['1.125rem', { lineHeight: '1.75rem' }],     // 18px
        '2xl': ['1.25rem', { lineHeight: '2rem' }],        // 20px
        '3xl': ['1.5rem', { lineHeight: '2rem' }],         // 24px
        '4xl': ['1.875rem', { lineHeight: '2.25rem' }],    // 30px
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      spacing: {
        // Tighter spacing for mobile
        '0.5': '0.125rem',
        '1': '0.25rem',
        '1.5': '0.375rem',
        '2': '0.5rem',
        '2.5': '0.625rem',
        '3': '0.75rem',
        '3.5': '0.875rem',
        '4': '1rem',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config
