# Usa una imagen base de Node.js ligera y moderna
FROM node:20-alpine

# Establece el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copia los ficheros de definición del proyecto
# Esto aprovecha el cache de Docker. Si no cambian, no se vuelve a ejecutar npm install.
COPY package*.json ./

# Instala las dependencias de producción
RUN npm install --only=production

# Copia el resto del código de la aplicación
COPY . .

# Expone el puerto que la aplicación usará
EXPOSE 8080

# El comando estándar y robusto para iniciar la aplicación
CMD [ "npm", "start" ]