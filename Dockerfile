# Dockerfile (para el frontend, en la raíz del repo)
# Fase de build: Construye la aplicación React
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./ 
RUN npm install --omit=dev
COPY . .
RUN npm run build 

# Fase de servir: Usa Nginx para servir los archivos estáticos
FROM nginx:stable-alpine

# Borra la configuración por defecto de Nginx para evitar conflictos
RUN rm /etc/nginx/conf.d/default.conf

# Copia tu configuración personalizada de Nginx
# Esta se convierte en la única configuración para el puerto 80.
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copia los archivos de construcción de tu aplicación React a la carpeta de Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]