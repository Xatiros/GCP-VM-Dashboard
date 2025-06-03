#!/bin/sh
# entrypoint.sh

# Sustituye la variable de entorno $PORT en el nginx.conf temporalmente
# y envía la salida al archivo de configuración principal de Nginx que Nginx cargará
# Esto se asegura de que Nginx realmente use el puerto de la variable de entorno
envsubst '$PORT' < /etc/nginx/conf.d/default.conf > /etc/nginx/nginx.conf

# Ejecuta el comando principal de Nginx que se pasó como CMD
exec "$@"