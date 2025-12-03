/** @type {import('tailwindcss').Config} */
export default {
  theme: {
    extend: {
      fontFamily: {
        // sans: ["Geist", "sans-serif"],
      },
      writingMode: {
        "vertical-rl": "vertical-rl",
        "vertical-lr": "vertical-lr",
      },
    },
  },
  plugins: [
    function ({ addUtilities }) {
      addUtilities({
        ".writing-vertical-rl": {
          "writing-mode": "vertical-rl",
        },
        ".writing-vertical-lr": {
          "writing-mode": "vertical-lr",
        },
      });
    },
  ],
};
