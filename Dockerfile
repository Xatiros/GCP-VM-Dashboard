# Usa una imagen base de Node.js ligera
FROM node:20-slim

# Crea y establece el directorio de trabajo en el contenedor
WORKDIR /usr/src/app

# Copia los archivos package.json y package-lock.json
# para instalar las dependencias
COPY package*.json ./

# Instala las dependencias de Node.js
RUN npm install --omit=dev

# Copia el resto de los archivos de la aplicación
COPY . .

# Expone el puerto en el que la aplicación escuchará
# Cloud Run espera que la aplicación escuche en el puerto definido por la variable de entorno PORT
ENV PORT 8080
EXPOSE $PORT

# Define el comando para iniciar la aplicación
CMD [ "node", "server.cjs" ]