import { defineConfig, loadEnv } from 'vite' // <<<--- AÑADIR loadEnv
import react from '@vitejs/plugin/react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Cargar variables de entorno del archivo .env (para desarrollo local)
  // Vercel inyectará las suyas automáticamente
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      // Exponer la variable de entorno a tu código del frontend
      // VITE_API_URL es la variable en Vercel y tu .env local
      'process.env.VITE_API_URL': JSON.stringify(env.VITE_API_URL)
    }
  }
})