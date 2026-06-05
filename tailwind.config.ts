import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: { "2xl": "1280px" },
    },
    extend: {
      // Colors are driven by CSS variables defined in globals.css.
      // This is what shadcn uses and it's the cleanest way to support
      // multiple portfolio themes — a theme is just a different set of
      // CSS variable values.
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: "hsl(var(--card))",
        "card-foreground": "hsl(var(--card-foreground))",
        primary: "hsl(var(--primary))",
        "primary-foreground": "hsl(var(--primary-foreground))",
        muted: "hsl(var(--muted))",
        "muted-foreground": "hsl(var(--muted-foreground))",
        accent: "hsl(var(--accent))",
        "accent-foreground": "hsl(var(--accent-foreground))",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        destructive: "hsl(var(--destructive))",
        "destructive-foreground": "hsl(var(--destructive-foreground))",

        // Marketing-only palette. NOT used in the dashboard or public portfolio
        // — those use the neutral hsl(var(--*)) tokens above. Kept separate so
        // the editorial landing page can have its own warm-paper character
        // without polluting the rest of the app.
        paper: "#faf6ee",
        "paper-card": "#f3eddf",
        ink: "#1a1f2e",
        "ink-accent": "#a4361f",
        // (Legacy portfolio theme tokens — `p-bg`, `p-fg`, `p-surface`, etc.
        // — were removed in the template-architecture migration. The three
        // active templates are fully self-contained and don't use Tailwind
        // for their styling; they have scoped CSS modules with their own
        // design tokens.)
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
        serif: ["var(--font-serif)"],

        // Portfolio theme fonts — switch with the active .theme-* class.
        "p-display": ["var(--p-font-display)"],
        "p-body": ["var(--p-font-body)"],
        "p-mono": ["var(--p-font-mono)"],
      },
    },
  },
  plugins: [],
};

export default config;