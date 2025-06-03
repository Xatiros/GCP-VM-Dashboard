# Dockerfile (para el frontend, en la raíz del repo)
# ...
FROM nginx:stable-alpine
# Instala envsubst que es parte de gettext
RUN apk add --no-cache gettext 

RUN rm /etc/nginx/conf.d/default.conf

# Copia tu configuración personalizada de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copia los archivos de construcción de tu aplicación React
COPY --from=builder /app/dist /usr/share/nginx/html

# --- ¡NUEVAS LÍNEAS CLAVE AQUÍ! ---
# Nginx por defecto escucha en el puerto 80. Cloud Run espera en 8080.
# La variable de entorno PORT se establece automáticamente a 8080 en Cloud Run.
# Redirigimos el tráfico del puerto 8080 del contenedor al puerto 80 de Nginx.
ENV PORT 8080 
EXPOSE 8080   

# El entrypoint.sh se encarga de sustituir ${PORT} en el nginx.conf
COPY entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Establece el script de entrada principal del contenedor
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]