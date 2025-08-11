import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Log para ver las variables de entorno durante el build en Vercel
  console.log(`--- VITE BUILD MODE: ${mode} ---`);
  console.log('VITE_API_URL:', process.env.VITE_API_URL);

  return {
    plugins: [react()],
  }
})