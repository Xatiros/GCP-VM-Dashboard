# frontend/Dockerfile
# Fase de build: Construye la aplicación React
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json yarn.lock ./ # Asumiendo que usas yarn, si usas npm, cambia a package-lock.json
RUN yarn install --frozen-lockfile # O npm install --omit=dev si usas npm
COPY . .
RUN yarn build # Asegúrate de que este script 'build' genere la carpeta 'dist'

# Fase de servir: Usa Nginx para servir los archivos estáticos
FROM nginx:stable-alpine
# --- ¡ASEGURATE QUE ESTA LÍNEA ES CORRECTA! ---
COPY --from=builder /app/dist /usr/share/nginx/html 
# ^^^ Esto copia el contenido de la carpeta 'dist' creada por 'yarn build' a la carpeta de Nginx
# donde Nginx espera los archivos web.

# Copia una configuración personalizada de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expone el puerto por defecto de Nginx
EXPOSE 80

# Comando para iniciar Nginx
CMD ["nginx", "-g", "daemon off;"]