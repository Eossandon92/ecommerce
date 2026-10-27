FROM mcr.microsoft.com/playwright:v1.64.0-jammy

# Node parchado (aviso de seguridad de Render 2026-10: fallas de TLS y
# certificados eMudhra). La imagen de Playwright trae su propio Node, más
# antiguo; se reemplaza por el binario oficial 24.22.1.
COPY --from=node:24.22.1-bookworm-slim /usr/local/bin/node /usr/local/bin/node
RUN node --version

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src

ENV DOWNLOAD_DIR=/tmp/downloads
ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "src/server.js"]
