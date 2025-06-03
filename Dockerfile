# Dockerfile (para el frontend, en la raíz del repo)
# ...
FROM node:20-alpine AS frontend_build_stage 
WORKDIR /app
COPY package.json package-lock.json ./ 
RUN npm install --omit=dev
COPY . . 
# --- ¡CORRECCIÓN EN ESTA LÍNEA! ---
RUN npm run build 
              # O la forma más robusta:
# RUN /usr/local/bin/npm run build # Si el PATH no se actualiza, usar la ruta completa de npm
# O asegurar que el PATH del builder incluya .bin

# Dado que npm run build ya debería funcionar si npm está en el PATH,
# el problema es que npm no está completamente accesible.
# Vamos a usar una forma más explícita o asegurar que npm esté en el PATH.

# Revertir a la forma original si no había error aquí y el problema era la copia de archivos.
# El log dice "sh: vite: not found", no "npm: not found".

# La forma más robusta es asegurar que `vite` se ejecuta como `npm run build`.
# Si `npm run build` falla porque `vite` no se encuentra, es que `node_modules/.bin` no está en el PATH.
# Esto es inusual para las imágenes de Node.js.

# Intentemos con la forma más robusta que se usa para asegurar que los scripts npm están disponibles:
RUN npm install -g vite # Instalar vite globalmente en el contenedor (temporalmente para el build)
RUN npm run build

# O la más limpia:
# RUN npx vite build # npx ejecuta el binario localmente si está disponible
# npx ya está incluido con npm 5.2+
# Vamos a probar con `npx vite build` que es la forma recomendada de ejecutar binarios locales.
RUN npx vite build # <-- ¡CAMBIO MÁS PROBABLEMENTE EFECTIVO!
# --- FIN CORRECCIÓN ---

# ... (resto del Dockerfile)