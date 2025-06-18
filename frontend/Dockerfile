# frontend/Dockerfile
# Ubicación: gcp-vm-dashboard/frontend/Dockerfile

# --- Fase 1: Construcción del Frontend ---
FROM node:20-alpine AS frontend_build_stage 

WORKDIR /app

# Copia package.json y package-lock.json (o yarn.lock) del frontend
# Asume que package.json está en la misma carpeta que el Dockerfile
COPY package*.json ./

# Instala dependencias
RUN npm install

# Copia el resto del código fuente del proyecto frontend (src/, public/, etc.)
# Asume que src/ está en la misma carpeta que el Dockerfile
COPY . . 

# Ejecuta el build de Vite. 
# Asegúrate de que tu script "build" en package.json de frontend está configurado (ej. "build": "vite build")
RUN npm run build 

# --- Fase 2: Servir con Nginx ---
FROM nginx:stable-alpine
# Instala envsubst necesario para el entrypoint.sh (si lo usas para sustituir variables en nginx.conf)
RUN apk add --no-cache gettext 

# Elimina la configuración por defecto de Nginx para evitar conflictos
RUN rm /etc/nginx/conf.d/default.conf || true 

# Copia tu configuración personalizada de Nginx
# Asume que nginx.conf está en la misma carpeta que el Dockerfile
COPY nginx.conf /etc/nginx/nginx.conf 

# Copia los archivos de construcción de tu aplicación React desde la fase 'frontend_build_stage'
COPY --from=frontend_build_stage /app/dist /usr/share/nginx/html

# Copia y hace ejecutable el script de entrada (entrypoint.sh)
# Asume que entrypoint.sh está en la misma carpeta que el Dockerfile
COPY entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Configura el script de entrada y el comando por defecto
ENTRYPOINT ["/docker-entrypoint.sh"]
EXPOSE 80 
CMD ["nginx", "-g", "daemon off;"]