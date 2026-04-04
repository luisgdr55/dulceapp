#!/bin/sh
set -e

# Sustituir ${BACKEND_URL} en el template de nginx con el valor real de la variable de entorno
envsubst '${BACKEND_URL}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

exec nginx -g 'daemon off;'
