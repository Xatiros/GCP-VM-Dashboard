# Dockerfile (para el frontend, en la raíz del repo)

# --- Fase 1: Build de la aplicación React ---
FROM node:20 AS frontend_build_stage 
WORKDIR /app
COPY package.json package-lock.json ./ 
RUN npm install --omit=dev
COPY . . 
# --- ¡CAMBIO CRÍTICO AQUÍ! ---
# Ejecutar el build de Vite de forma explícita usando el binario directamente desde node_modules
# Esto evita problemas de PATH con 'npm run build' o 'npx vite build'.
RUN /app/node_modules/vite/bin/vite.js build # <-- RUTA EXPLÍCITA AL BINARIO DE VITE
# O si la versión de vite es diferente, adapta la ruta a tu package.json
# RUN $(npm bin)/vite build # Otra opción si 'npm bin' está en el PATH
# --- FIN CAMBIO ---

# --- Fase 2: Servir con Nginx ---
FROM nginx:stable-alpine
RUN apk add --no-cache gettext 

RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

COPY --from=frontend_build_stage /app/dist /usr/share/nginx/html

EXPOSE 8080 
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]