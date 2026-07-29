FROM node:22-alpine

WORKDIR /app

COPY index.html app.js styles.css server.js ./

ENV NODE_ENV=production

EXPOSE 8887

CMD ["node", "server.js"]
