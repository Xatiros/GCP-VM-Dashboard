// frontend/vite.config.ts
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    // loadEnv carga las variables de entorno desde .env, .env.local, etc.
    // El tercer argumento '' asegura que se carguen todas las variables, no solo las prefijadas con VITE_
    const env = loadEnv(mode, process.cwd(), ''); 

    return {
      define: {
        // Estas son las variables que estarán disponibles en tu código JS/TS como `process.env.NOMBRE_VARIABLE`
        // Los valores de env.VARIABLE vienen del archivo .env (para local) o del entorno de build (para Cloud Build)
        'process.env.VITE_APP_BACKEND_AUTH_URL': JSON.stringify(env.VITE_APP_BACKEND_AUTH_URL), //
        'process.env.VITE_APP_API_KEY': JSON.stringify(env.VITE_APP_API_KEY), //
        'process.env.VITE_APP_GEMINI_API_KEY': JSON.stringify(env.VITE_APP_GEMINI_API_KEY) //
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});