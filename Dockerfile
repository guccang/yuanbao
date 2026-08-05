# Stage 1: Validate source syntax
FROM node:22-alpine AS builder

WORKDIR /app

COPY index.html app.js styles.css server.js ./
COPY modules/ ./modules/

RUN node --check server.js && \
    node --check app.js && \
    node --check modules/math.js && \
    node --check modules/physics.js && \
    node --check modules/english.js

# Stage 2: Minimal runtime
FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder --chown=node:node /app/ ./

RUN mkdir -p /data && chown node:node /data

USER node

EXPOSE 8887

CMD ["node", "server.js"]
