# Dockerfile (para el frontend, en la raíz del repo)

# --- Fase 1: builder ---
# Usa una imagen de Node.js más reciente y específica para evitar problemas de compatibilidad o vulnerabilidades
# node:20-alpine sigue siendo una buena opción si estás usando Alpine Linux para el entorno de Node.
FROM node:20-alpine AS frontend_builder # <-- ¡CAMBIO AQUÍ! Nombre más explícito para la fase
WORKDIR /app
COPY package.json package-lock.json ./ 
RUN npm install --omit=dev
COPY . .
RUN npm run build 

# --- Fase 2: servir ---
FROM nginx:stable-alpine

# Instala envsubst que es parte de gettext (necesario para el entrypoint.sh)
RUN apk add --no-cache gettext 

# Elimina la configuración por defecto de Nginx para evitar conflictos
RUN rm /etc/nginx/conf.d/default.conf

# Copia tu configuración personalizada de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copia los archivos de construcción de tu aplicación React desde la fase 'frontend_builder'
# ¡CRÍTICO! El nombre de la fase debe coincidir: --from=frontend_builder
COPY --from=frontend_builder /app/dist /usr/share/nginx/html

# Copia y hace ejecutable el script de entrada (entrypoint.sh)
COPY entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Configura el script de entrada y el comando por defecto
ENTRYPOINT ["/docker-entrypoint.sh"]
EXPOSE 8080 # Exponer el puerto que Nginx escuchará (Cloud Run espera 8080)
CMD ["nginx", "-g", "daemon off;"]