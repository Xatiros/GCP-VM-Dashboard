# Dockerfile (para el frontend, en la raíz del repo)
# ...
# Fase de build: (sin cambios)
FROM node:20 AS frontend_build_stage 
WORKDIR /app
COPY package.json package-lock.json ./ 
RUN npm install --omit=dev
COPY . . 
RUN npm run build 

# Fase de servir: Usa Nginx para servir los archivos estáticos
FROM nginx:stable-alpine

# Elimina el archivo de configuración por defecto si existe (aunque ahora lo sobrescribiremos)
RUN rm /etc/nginx/conf.d/default.conf || true

# --- ¡CAMBIO CRÍTICO AQUÍ! Copia nginx.conf al archivo de configuración principal ---
COPY nginx.conf /etc/nginx/nginx.conf 
# ^^^ Esto sobrescribe la configuración principal de Nginx.
# Como resultado, Nginx no buscará en /etc/nginx/conf.d/default.conf
# a menos que tu nginx.conf lo incluya explícitamente.

# Copia los archivos de construcción de tu aplicación React
COPY --from=frontend_build_stage /app/dist /usr/share/nginx/html

# Instala envsubst (necesario si tu nginx.conf usa variables como ${PORT})
RUN apk add --no-cache gettext 

# Copia y hace ejecutable el script de entrada (entrypoint.sh)
COPY entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Configura el script de entrada y el comando por defecto
ENTRYPOINT ["/docker-entrypoint.sh"]
EXPOSE 8080 
CMD ["nginx", "-g", "daemon off;"]