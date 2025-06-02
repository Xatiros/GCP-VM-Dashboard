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

# Eliminar el archivo de configuración predeterminado de Nginx si existe
# que podría estar causando conflictos o aplicando una CSP estricta.
RUN rm /etc/nginx/conf.d/default.conf || true

# Copia los archivos de construcción de tu aplicación React a la carpeta de Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Copia tu configuración personalizada de Nginx
# La estamos copiando al archivo de configuración principal de Nginx,
# asegurando que es la única configuración cargada.
# Este archivo no debería incluir 'events {}' o 'http {}' a menos que estés creando un nginx.conf completo.
# Si tu nginx.conf YA tiene 'events {}' y 'http {}', entonces la copia a /etc/nginx/nginx.conf es correcta.
# Si solo tiene la sección 'server {}', entonces copiarlo a /etc/nginx/conf.d/default.conf es mejor,
# pero antes debemos eliminar el default.conf existente.
# VAMOS A USAR LA ESTRATEGIA DE SOBRESCRIBIR EL DEFAULT.CONF DESPUÉS DE ELIMINARLO.
COPY nginx.conf /etc/nginx/conf.d/default.conf 

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]