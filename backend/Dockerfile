# Dockerfile (para el frontend, en la raíz del repo)
# Fase de build: Construye la aplicación React
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json yarn.lock ./ # O package-lock.json si usas npm
RUN yarn install --frozen-lockfile # O npm install --omit=dev
COPY . .
RUN yarn build # Asegúrate que genera 'dist' en /app

# Fase de servir: Usa Nginx para servir los archivos estáticos
FROM nginx:stable-alpine
# Asegúrate de que los archivos se copian correctamente desde la fase 'builder'
COPY --from=builder /app/dist /usr/share/nginx/html 

# Copia la configuración personalizada de Nginx
# Asegúrate que el nginx.conf está en la raíz de tu repo y se copia aquí.
COPY nginx.conf /etc/nginx/conf.d/default.conf 

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]