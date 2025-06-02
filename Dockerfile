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
COPY --from=builder /app/dist /usr/share/nginx/html

# --- ¡CAMBIO CRÍTICO AQUÍ! Copia nginx.conf al lugar CORRECTO para sobrescribir la config por defecto ---
# Elimina la línea 'COPY nginx.conf /etc/nginx/nginx.conf'
# Y usa esta:
COPY nginx.conf /etc/nginx/conf.d/default.conf
# ^^^ Esto sobrescribe el archivo de configuración predeterminado que Nginx carga.

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]