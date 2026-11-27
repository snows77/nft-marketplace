import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    tailwindcss()
  ],
  resolve: {
    // '/src' é relativo à raiz do projeto. Um caminho absoluto (path.resolve) quebra no
    // Windows quando a letra do drive vem minúscula ("c:\..."): o Vite passa a ver esses
    // arquivos como externos (/@fs/c:/...) e carrega o mesmo módulo duas vezes.
    alias: {
      '@': '/src',
    },
  },
  // O code splitting do TanStack Router esconde imports do scanner do Vite. Libs descobertas
  // tarde são pré-empacotadas numa segunda rodada com outra cópia do React, e os hooks quebram
  // ("Cannot read properties of null (reading 'useContext' / 'useRef')"). Escanear todo o src/
  // na partida faz toda dependência ser encontrada já na primeira rodada.
  optimizeDeps: {
    entries: ['index.html', 'src/**/*.{ts,tsx}'],
  },
})

