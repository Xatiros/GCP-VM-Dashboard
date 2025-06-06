import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), ''); 
    return {
      define: {
        // Usa el prefijo `VITE_` si quieres que Vite exponga la variable directamente en `import.meta.env`
        // Si usas `process.env` en tu código, entonces lo que tienes en `define` es correcto.
        'process.env.VITE_APP_BACKEND_AUTH_URL': JSON.stringify(env.VITE_APP_BACKEND_AUTH_URL) 
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});