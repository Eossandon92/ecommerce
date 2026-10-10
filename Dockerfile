FROM mcr.microsoft.com/playwright:v1.64.0-jammy

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src

ENV DOWNLOAD_DIR=/tmp/downloads
ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "src/server.js"]
