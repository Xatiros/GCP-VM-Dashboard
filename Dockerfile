# Dockerfile (para el frontend, en la raíz del repo)

# ... (líneas 1-3)
FROM node:20-alpine AS frontend_builder 
WORKDIR /app
COPY package.json package-lock.json ./ 

# --- ¡CORRECCIÓN CRÍTICA EN ESTAS LÍNEAS! ---
# Asegúrate de que no haya comentarios en la misma línea o caracteres extra.
# Cada RUN debe estar en su propia línea limpia.
RUN npm install --omit=dev 
COPY . .
RUN npm run build 
# --- FIN CORRECCIÓN ---

# ... (resto del Dockerfile)
FROM nginx:stable-alpine
# ... (resto del Dockerfile)