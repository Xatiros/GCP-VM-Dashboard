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
RUN rm /etc/nginx/conf.d/default.conf 
COPY nginx.conf /etc/nginx/conf.d/default.conf 
COPY --from=builder /app/dist /usr/share/nginx/html

# --- ¡CAMBIO AQUÍ! Expón el puerto 8080 ---
EXPOSE 8080 
# --- FIN CAMBIO ---

# --- ¡NUEVO! Pasa la variable PORT a Nginx ---
# Nginx puede necesitar ser configurado para usar la variable de entorno PORT.
# Sin embargo, con 'listen 8080' en nginx.conf, no es estrictamente necesario pasar ENV PORT aquí
# A menos que nginx.conf se configure para usar $PORT variable.
# La instrucción LISTEN 8080 en nginx.conf es suficiente.
# CMD ["nginx", "-g", "daemon off;"] # No cambiar este comando, Nginx ya escuchará en 8080.