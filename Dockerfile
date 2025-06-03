# Dockerfile
# Este es el Dockerfile para el frontend, en la raíz del repositorio.

# --- Fase 1: Build de la aplicación React ---
# Usamos 'frontend_build_stage' como nombre de esta fase.
FROM node:20-alpine AS frontend_build_stage 
WORKDIR /app
COPY package.json package-lock.json ./ 
RUN npm install --omit=dev
COPY . .
RUN npm run build 

# --- Fase 2: Servir con Nginx ---
FROM nginx:stable-alpine

# Instala envsubst que es parte de gettext, necesario para el entrypoint.sh
RUN apk add --no-cache gettext 

# Elimina la configuración por defecto de Nginx para evitar conflictos
RUN rm /etc/nginx/conf.d/default.conf

# Copia tu configuración personalizada de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copia los archivos de construcción de tu aplicación React desde la fase 'frontend_build_stage'
# ¡CRÍTICO! El nombre de la fase debe coincidir exactamente aquí: --from=frontend_build_stage
COPY --from=frontend_build_stage /app/dist /usr/share/nginx/html

# Copia y hace ejecutable el script de entrada (entrypoint.sh)
COPY entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Configura el script de entrada y el comando por defecto
ENTRYPOINT ["/docker-entrypoint.sh"]
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]