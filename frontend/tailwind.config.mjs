// Tailwind CSS configuration
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    extend: {
      colors: {
        // ── Offboarding hub palette ──────────────────────────────────────
        // Warm beige – backgrounds, borders, cards
        beige: {
          50:  '#FDFAF5',
          100: '#F5F0E8',
          200: '#EAE3D5',
          300: '#D9CFBE',
        },
        // Sage green – active states, accents, primary actions
        sage: {
          400: '#8FAF8A',
          500: '#6F9669',
          600: '#4D7A47',
          700: '#3A5E35',
        },
        // Warm brown – body text on beige surfaces
        'warm-text': '#5C4E3A',
      },
    },
  },
  plugins: [],
};
