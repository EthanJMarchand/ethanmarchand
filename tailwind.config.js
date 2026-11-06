/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./*.html', './*.js', './needs-analysis/**/*.js'],
  theme: {
    extend: {
      colors: {
        // Token names stay so the tools keep their class names.
        // The values are the Advisor Strategies palette.
        navy: '#163840',
        navydeep: '#0d232a',
        gold: '#618986',
        goldlight: '#e8e4df',
        golddim: '#4d736f',
        olive: '#4d736f',
        paper: '#f4f2ef',
        paperdim: '#e8e4df',
        ink: '#0d232a',
        inksoft: '#3e5558',
        line: '#d5dedc',
        cream: '#e8e4df',
        sage: '#618986'
      },
      fontFamily: {
        serif: ['Poppins', 'Helvetica', 'Arial', 'sans-serif'],
        sans: ['Poppins', 'Helvetica', 'Arial', 'sans-serif']
      }
    }
  },
  plugins: []
};
