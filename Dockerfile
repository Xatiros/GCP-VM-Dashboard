# Dockerfile (para el frontend, en la raíz del repo)

# --- Fase 1: Build de la aplicación React ---
FROM node:20 AS frontend_build_stage 
WORKDIR /app
COPY package.json package-lock.json ./ 
# Aseguramos que la instalación de dependencias sea limpia
RUN npm cache clean --force && npm install --omit=dev 
COPY . . 
RUN npm run build 

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