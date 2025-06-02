# backend/Dockerfile
FROM node:20-slim
WORKDIR /usr/src/app
# --- ¡CORRECCIÓN AQUÍ! ---
COPY package.json package-lock.json ./ 
# --- FIN CORRECCIÓN ---
RUN npm install --omit=dev # Asegúrate de que usas npm install
COPY . .
ENV PORT 8080
EXPOSE $PORT
CMD [ "node", "server.cjs" ]