import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    // Carga las variables de entorno. El tercer argumento '' carga todas las variables.
    // Asegúrate de que tu .env o el entorno de build de Cloud Build
    // tenga las variables VITE_APP_API_KEY, VITE_APP_GEMINI_API_KEY y VITE_APP_BACKEND_AUTH_URL
    const env = loadEnv(mode, process.cwd(), ''); 

    return {
      define: {
        'process.env.VITE_APP_API_KEY': JSON.stringify(env.VITE_APP_API_KEY),
        'process.env.VITE_APP_GEMINI_API_KEY': JSON.stringify(env.VITE_APP_GEMINI_API_KEY),
        // ¡NUEVO! Define una variable para la URL de autenticación del backend
        'process.env.VITE_APP_BACKEND_AUTH_URL': JSON.stringify(env.VITE_APP_BACKEND_AUTH_URL) 
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});