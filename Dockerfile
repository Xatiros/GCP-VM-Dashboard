# Dockerfile (para el frontend, en la raíz del repo)

# --- Fase 1: Build de la aplicación React ---
FROM node:20 AS frontend_build_stage 
WORKDIR /app

# Copia los archivos de configuración de paquete
COPY package.json package-lock.json ./ 

# Instala las dependencias, incluyendo las opcionales
# A veces, el problema "Cannot find module" viene de una instalación fallida de dependencias opcionales de Vite/Rollup
RUN npm install --legacy-peer-deps # Instala todas las dependencias, maneja peer-deps de forma legacy
# Otra opción si falla:
# RUN npm install --omit=dev --force # Forzar instalación incluso con errores


# Copia el resto del código fuente
COPY . . 

# ¡CORRECCIÓN CRÍTICA AQUÍ! Asegurarse de que Vite sea accesible para `npx`.
# A veces, el PATH no se actualiza correctamente. Forzamos la instalación de `vite` globalmente SOLO para la fase de build.
# Esto asegura que `vite` esté en un lugar donde `npx` lo encuentre.
RUN npm install -g vite@6.3.5 # Instala la versión específica que tienes en package.json localmente

# Ejecuta el build de Vite
RUN npx vite build # <-- Esto debería funcionar ahora

# ... (resto del Dockerfile)