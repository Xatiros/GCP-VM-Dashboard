# backend/Dockerfile
FROM node:20-slim 
WORKDIR /usr/src/app
COPY package*.json ./
# --- AÑADIR ESTA LÍNEA PARA ACTUALIZAR NPM ---
RUN npm install -g npm@latest
# --- FIN AÑADIR ---
RUN npm install --omit=dev
COPY . .
ENV PORT 8080
EXPOSE $PORT
CMD [ "node", "server.cjs" ]