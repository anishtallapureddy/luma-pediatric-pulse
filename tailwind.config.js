/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        luma: {
          navy: "#0B1D3A",
          "navy-soft": "#162D52",
          sage: "#6F8064",
          "sage-light": "#7B8F70",
          "sage-hover": "#59694F",
          sun: "#C8995A",
          coral: "#E76C70",
          cream: "#F7EFE4",
          "cream-card": "#FDFAF3",
          "cream-muted": "#F0E5D2",
          border: "#E6D9C2",
          "border-strong": "#C9B790",
          muted: "#5B6877",
        },
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', '"EB Garamond"', "Georgia", "serif"],
        body: ['"Plus Jakarta Sans"', "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "1.35rem",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(11, 29, 58, 0.04), 0 4px 18px -8px rgba(11, 29, 58, 0.10)",
        elevated: "0 4px 8px rgba(11, 29, 58, 0.06), 0 18px 36px -16px rgba(11, 29, 58, 0.18)",
      },
    },
  },
  plugins: [],
};
