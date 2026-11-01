FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-alpine AS production

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist

# Carpeta de las piezas de difusión: el proceso corre como "node" y /app es de root,
# así que se crea aquí y se le entrega a "node" para que pueda escribir en ella.
RUN mkdir -p /app/public/uploads && chown -R node:node /app/public

EXPOSE 3000

USER node

CMD ["node", "dist/main.js"]
