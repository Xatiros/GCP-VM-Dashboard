# Dockerfile (para el frontend, en la raíz del repo)
# Fase de build: Construye la aplicación React
FROM node:20-alpine AS builder
WORKDIR /app
# Copia package.json y yarn.lock (o package-lock.json si usas npm)
COPY package.json yarn.lock ./ 
# Instala las dependencias
RUN yarn install --frozen-lockfile # O npm install --omit=dev si usas npm
# Copia el resto de los archivos del proyecto
COPY . .
# Compila la aplicación Vite, lo que crea la carpeta 'dist'
RUN yarn build # O npm run build

# Fase de servir: Usa Nginx para servir los archivos estáticos
FROM nginx:stable-alpine
# Copia los archivos de construcción de tu aplicación React a la carpeta de Nginx
# Esto asume que 'yarn build' (o 'npm run build') genera 'dist' en /app
COPY --from=builder /app/dist /usr/share/nginx/html

# Copia una configuración personalizada de Nginx
# ¡CRÍTICO! Copia la configuración directamente al archivo de configuración principal de Nginx
COPY nginx.conf /etc/nginx/nginx.conf 

# Expone el puerto por defecto de Nginx
EXPOSE 80

# Comando para iniciar Nginx
CMD ["nginx", "-g", "daemon off;"]