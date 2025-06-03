# backend/Dockerfile
FROM node:20-slim
WORKDIR /usr/src/app
COPY package.json package-lock.json ./
RUN npm install --omit=dev # O yarn install
COPY . .
ENV PORT 8080
EXPOSE $PORT
CMD [ "node", "server.cjs" ]