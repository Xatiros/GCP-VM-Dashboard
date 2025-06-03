# Dockerfile (para el frontend, en la raíz del repo)
# Fase de build: Construye la aplicación React
FROM node:20-alpine AS frontend_build_stage 
WORKDIR /app

# Copia solo los archivos de configuración de paquete y haz la instalación
COPY package.json package-lock.json ./ 
RUN npm install --omit=dev

# Copia las carpetas de código fuente explícitamente después de la instalación,
# asegurando que vmService.ts sea la versión más reciente.
COPY src ./src 
COPY public ./public
COPY index.html ./
# Si tienes otros archivos como tsconfig.json, vite.config.ts, etc.
COPY tsconfig.json ./
COPY vite.config.ts ./

# Compila la aplicación Vite
RUN npm run build 

# Fase de servir: Usa Nginx para servir los archivos estáticos
FROM nginx:stable-alpine
RUN apk add --no-cache gettext 

RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Copia los archivos de construcción desde la fase 'frontend_build_stage'
COPY --from=frontend_build_stage /app/dist /usr/share/nginx/html

EXPOSE 8080 
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]