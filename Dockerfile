# Dockerfile (para el frontend, en la raíz del repo)
# ...
# Fase de build: Construye la aplicación React
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./ 
RUN npm install --omit=dev
COPY . .
RUN npm run build # Vite compilará la app a la carpeta 'dist'

# Fase de servir: Usa Nginx para servir los archivos estáticos
FROM nginx:stable-alpine
# --- ¡VERIFICA ESTA LÍNEA! ---
COPY --from=builder /app/dist /usr/share/nginx/html 
# ^^^ Esto debería copiar el contenido de la carpeta 'dist'
# al directorio web raíz de Nginx.
# --- FIN VERIFICACIÓN ---

COPY nginx.conf /etc/nginx/nginx.conf 

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]