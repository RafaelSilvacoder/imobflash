/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#0f172a',   // Azul marinho escuro (header, textos fortes)
        royal: '#2563eb',  // Azul royal (ações principais)
      },
    },
  },
  plugins: [],
}
