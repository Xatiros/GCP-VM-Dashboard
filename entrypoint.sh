#!/bin/sh
# Este script se ejecutará al iniciar el contenedor.

# Ejecuta el comando principal de Nginx en primer plano
exec nginx -g "daemon off;"