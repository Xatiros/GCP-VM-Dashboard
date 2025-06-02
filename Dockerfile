# Dockerfile (para el frontend, en la raíz del repo)
# Fase de build: Construye la aplicación React
FROM node:20-alpine AS builder
WORKDIR /app
# --- ¡CORRECCIÓN EN ESTA LÍNEA! ---
COPY package.json yarn.lock ./ 
# --- FIN CORRECCIÓN ---
RUN yarn install --frozen-lockfile # O npm install --omit=dev if you use npm
COPY . .
RUN yarn build # Vite compilará la app a la carpeta 'dist'

# Fase de servir: Usa Nginx para servir los archivos estáticos
FROM nginx:stable-alpine
COPY --from=builder /app/dist /usr/share/nginx/html

# Copia una configuración personalizada de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]