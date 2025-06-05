# Dockerfile (para el frontend, en la raíz del repo)

# --- Fase 1: Build de la aplicación React ---
FROM node:20 AS frontend_build_stage 
WORKDIR /app

# Copia los archivos de configuración de paquete
COPY package.json package-lock.json ./ 

# Instala las dependencias de producción y desarrollo localmente.
# `npm cache clean --force` ya lo tienes en cloudbuild.yaml en un paso anterior.
RUN npm install # O npm install --omit=dev si no necesitas las devDependencies en este paso
# Para este build, las devDependencies (como vite) son esenciales.

# --- ¡CAMBIO CLAVE AQUÍ! Instalar Vite globalmente antes de copiar el resto del código ---
# Esto garantiza que `vite` esté en el PATH global (/usr/local/bin)
# antes de que se copie el resto del código y se ejecute el build.
RUN npm install -g vite@6.3.5 
# --- FIN CAMBIO CLAVE ---

# Copia el resto del código fuente del proyecto
COPY . . 

# Ejecuta el build de Vite. 'vite' ya debería ser accesible globalmente.
RUN npm run build 

# --- Fase 2: Servir con Nginx ---
FROM nginx:stable-alpine
# Instala envsubst que es parte de gettext, necesario para el entrypoint.sh
RUN apk add --no-cache gettext 

# Elimina la configuración por defecto de Nginx para evitar conflictos
RUN rm /etc/nginx/conf.d/default.conf || true 

# Copia tu configuración personalizada de Nginx
COPY nginx.conf /etc/nginx/nginx.conf 

# Copia los archivos de construcción de tu aplicación React desde la fase 'frontend_build_stage'
COPY --from=frontend_build_stage /app/dist /usr/share/nginx/html

# Copia y hace ejecutable el script de entrada (entrypoint.sh)
COPY entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Configura el script de entrada y el comando por defecto
ENTRYPOINT ["/docker-entrypoint.sh"]
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]