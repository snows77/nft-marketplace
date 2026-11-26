import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import { defineConfig } from 'vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    tailwindcss()
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src')
    },
  },
  // O code splitting do TanStack Router esconde imports do scanner do Vite. Sem esta lista,
  // essas libs são descobertas depois, pré-empacotadas numa segunda rodada com outra cópia
  // do React, e os hooks quebram ("Cannot read properties of null (reading 'useContext')").
  optimizeDeps: {
    include: ['lucide-react', 'sonner', 'radix-ui', 'class-variance-authority', 'cn'],
  },
})

