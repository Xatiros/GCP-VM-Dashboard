#!/bin/sh
# Este script se ejecutará al iniciar el contenedor.

# Cloud Run inyecta la variable PORT. Nginx no puede usarla directamente en listen.
# Reemplazamos el placeholder en nginx.conf con el valor de PORT.
# gettext es útil para esto, pero un simple sed también funciona.

# Aseguramos que PORT esté definido, si no, usamos 8080 como fallback (aunque Cloud Run lo define)
PORT=${PORT:-8080}

# Usamos sed para reemplazar el placeholder por el puerto real
sed -i "s/8080_PLACEHOLDER/$PORT/g" /etc/nginx/nginx.conf

# Ejecuta el comando principal de Nginx en primer plano
exec nginx -g "daemon off;"