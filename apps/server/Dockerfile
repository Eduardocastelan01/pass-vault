FROM node:24-alpine

WORKDIR /app

# Copiar configuración de dependencias de la raíz y paquetes
COPY package*.json ./
COPY packages/core/package*.json ./packages/core/
COPY apps/server/package*.json ./apps/server/

# Instalar dependencias
RUN npm install

# Copiar código fuente
COPY packages/core ./packages/core
COPY apps/server ./apps/server

# Compilar core y servidor
RUN npm run build --workspace=@pass-vault/core
RUN npm run build --workspace=@pass-vault/server

ENV PORT=3000
ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "apps/server/dist/server.js"]
