# Dockerfile (para el frontend, en la raíz del repo)
# Fase de build: Construye la aplicación React
FROM node:20-alpine AS builder
WORKDIR /app
# --- ¡CORRECCIÓN AQUÍ! ---
COPY package.json package-lock.json ./ 
# --- FIN CORRECCIÓN ---
RUN npm install --omit=dev # Asegúrate de que usas npm install
COPY . .
RUN npm run build # Asegúrate de que usas npm run build

# Fase de servir: Usa Nginx para servir los archivos estáticos
FROM nginx:stable-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]