#!/bin/sh
# entrypoint.sh

# Sustituye la variable de entorno $PORT en el nginx.conf
# y envía la salida al archivo de configuración final de Nginx
envsubst '$PORT' < /etc/nginx/conf.d/default.conf > /etc/nginx/nginx.conf

# Ejecuta el comando principal de Nginx que se pasó como CMD
exec "$@"