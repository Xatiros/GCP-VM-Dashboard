# backend/Dockerfile
# Ubicación: gcp-vm-dashboard/backend/Dockerfile

FROM node:20-alpine

WORKDIR /app

# Copia package.json y package-lock.json del backend
COPY package*.json ./

# Instala dependencias
RUN npm install

# Copia el resto del código del backend
COPY . .

# Expone el puerto del servidor Node.js
EXPOSE 8080

# --- CAMBIO CLAVE: ENTRYPOINT para depurar variables de entorno ---
# Este script se ejecuta antes que el CMD y forza a imprimir las variables clave.
# Si el contenedor falla inmediatamente, esto nos dará la información.
ENTRYPOINT ["/bin/sh", "-c", "\
  echo '--- DEBUG Dockerfile ENTRYPOINT: Environment Variables ---'; \
  echo 'GCP_PROJECT_ID: '$GCP_PROJECT_ID; \
  echo 'GOOGLE_CLIENT_ID: '$GOOGLE_CLIENT_ID; \
  echo 'JWT_SECRET: '$JWT_SECRET; \
  echo '--- END DEBUG Dockerfile ENTRYPOINT ---'; \
  exec node server.cjs \
"]
# Comenta la línea CMD si existe, ya que ENTRYPOINT la reemplaza
# CMD ["node", "server.cjs"]