/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        forest: {
          950: "#0D211B",
          900: "#123328",
          800: "#164536",
          700: "#1D5A45",
          600: "#276E54",
        },
        gold: {
          600: "#9C7A2E",
          500: "#B8934A",
          400: "#CDAB68",
          200: "#EADDBB",
          100: "#F4EDDB",
        },
        paper: "#FBFAF7",
        ink: "#1B1F1D",
        line: "#E4E1D8",
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        sm: "3px",
        DEFAULT: "5px",
        md: "6px",
        lg: "8px",
      },
    },
  },
  plugins: [],
};
