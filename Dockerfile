# ── Stage 1: build the web app (Vite → static files) ──────────────────────
FROM node:22-alpine AS web
WORKDIR /web
# Copy the whole web project first: its postinstall (sync-vendor) needs the
# scripts/ directory present when `npm ci` runs.
COPY web/ ./
RUN npm ci && npm run build

# ── Stage 2: the Node.js API server, serving the built web app ────────────
FROM node:22-alpine AS server
WORKDIR /app
ENV NODE_ENV=production
COPY server/package.json ./
RUN npm install --omit=dev
COPY server/ ./
COPY --from=web /web/dist ./public
EXPOSE 3000
CMD ["node", "src/index.js"]
