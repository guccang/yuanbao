FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY --chown=node:node index.html app.js styles.css server.js ./
COPY --chown=node:node modules/ ./modules/

RUN mkdir -p /data && chown node:node /data

USER node

EXPOSE 8887

CMD ["node", "server.js"]
