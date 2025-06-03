# Dockerfile (para el frontend, en la raíz del repo)

# --- Fase 1: Build de la aplicación React ---
# ¡CAMBIO CRÍTICO AQUÍ! Usar la imagen de Node.js basada en Debian completa
FROM node:20 AS frontend_build_stage # <-- Cambiar de alpine a la versión completa
WORKDIR /app
COPY package.json package-lock.json ./ 
RUN npm install --omit=dev
COPY . . 
# ¡CAMBIO CRÍTICO AQUÍ! Usar npx para ejecutar vite build
RUN npx vite build # <-- Usar npx para asegurar que vite se encuentra y ejecuta

# --- Fase 2: Servir con Nginx ---
FROM nginx:stable-alpine

# No necesitamos 'apk add gettext' en esta fase si el entrypoint.sh ya no se usa o se ejecuta de otra forma.
# Sin embargo, el entrypoint.sh sí se usa, así que es necesario.
# Verificar si nginx:stable-alpine ya incluye gettext o si necesitamos añadirlo aquí.
# Si el problema persiste, es la forma de instalar gettext.
# Por ahora, mantengamoslo ya que ya lo tenías.
RUN apk add --no-cache gettext 

RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]
EXPOSE 8080 
CMD ["nginx", "-g", "daemon off;"]