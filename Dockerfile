# Dockerfile (para el frontend, en la raíz del repo)
# Este Dockerfile asume que tu React app (con src, public, index.html, etc.)
# está en la raíz del contexto de construcción de Docker.

# --- Fase 1: Build de la aplicación React ---
FROM node:20-alpine AS frontend_build_stage 
WORKDIR /app
COPY package.json package-lock.json ./ 
RUN npm install --omit=dev
# --- ¡CAMBIO CRÍTICO AQUÍ! Copia todo el contenido relevante del contexto. ---
COPY . . # Copia todo el contenido de la raíz del repositorio al WORKDIR /app
# --- FIN CAMBIO ---
RUN npm run build 

# --- Fase 2: Servir con Nginx ---
FROM nginx:stable-alpine
RUN apk add --no-cache gettext 

RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copia los archivos de construcción de tu aplicación React desde la fase 'frontend_build_stage'
COPY --from=frontend_build_stage /app/dist /usr/share/nginx/html

COPY entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]
EXPOSE 8080 
CMD ["nginx", "-g", "daemon off;"]