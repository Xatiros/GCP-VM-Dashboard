# Dockerfile (para el frontend, en la raíz del repo)

# --- Fase 1: Build de la aplicación React ---
FROM node:20 AS frontend_build_stage 
WORKDIR /app
COPY package.json package-lock.json ./ 
RUN npm install --omit=dev

# --- ¡NUEVO: Instalar npx globalmente si no está disponible o para asegurar su PATH! ---
# npm ya incluye npx desde la versión 5.2.0, pero esto asegura que esté en el PATH correcto para el script sh.
# Puedes omitir esta línea si confías en que `npm install` ya lo proporciona correctamente en el PATH.
# Pero dado el historial, vamos a ser explícitos.
# No es necesario instalar npx globalmente si ya viene con npm.
# El problema es que `npm run build` no encuentra `vite`.

# Volvemos a la estrategia de `npx vite build`.
# Si `npx vite build` no funciona, es porque `npx` no puede encontrar `vite`.
# Esto es muy inusual para Node.js v20.

# El error es "sh: vite: not found". Esto significa que `vite` no está en el PATH.
# La solución es ejecutarlo desde el `node_modules` o instalarlo globalmente.

# Opción A (más probable para este error específico): Instalar vite globalmente en el contenedor (sólo para la fase de build)
# Esto garantiza que `vite` esté en un PATH conocido (`/usr/local/bin`).
RUN npm install -g vite@6.3.5 # <-- ¡AÑADIR ESTA LÍNEA! (Asegura la versión exacta de Vite)

COPY . . 
RUN npm run build # <-- Volvemos a npm run build, ya que vite global estará disponible

# --- FIN CAMBIO ---

# --- Fase 2: Servir con Nginx ---
FROM nginx:stable-alpine
RUN apk add --no-cache gettext 

RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]
EXPOSE 8080 
CMD ["nginx", "-g", "daemon off;"]