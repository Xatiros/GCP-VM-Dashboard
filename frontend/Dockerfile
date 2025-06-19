# frontend/Dockerfile
# Ubicación: gcp-vm-dashboard/frontend/Dockerfile

# --- Fase 1: Construcción del Frontend ---
FROM node:20-alpine AS frontend_build_stage 

# --- ¡CAMBIO CLAVE AQUÍ: DECLARAR ARGUMENTO DE CONSTRUCCIÓN! ---
ARG VITE_APP_BACKEND_API_BASE_URL
# --- FIN CAMBIO CLAVE ---

WORKDIR /app

# Copia package.json y package-lock.json del frontend
COPY package*.json ./

# Instala dependencias
# Ya no es necesario instalar vite globalmente si está en devDependencies
RUN npm install

# Copia el resto del código fuente del proyecto frontend (src/, public/, etc.)
COPY . . 

# Ejecuta el build de Vite. 
# Vite recogerá VITE_APP_BACKEND_API_BASE_URL automáticamente porque está disponible como ARG
RUN npm run build 

# --- Fase 2: Servir con Nginx ---
FROM nginx:stable-alpine
RUN apk add --no-cache gettext 

RUN rm /etc/nginx/conf.d/default.conf || true 

COPY nginx.conf /etc/nginx/nginx.conf 

COPY --from=frontend_build_stage /app/dist /usr/share/nginx/html

COPY entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]
EXPOSE 80 
CMD ["nginx", "-g", "daemon off;"]