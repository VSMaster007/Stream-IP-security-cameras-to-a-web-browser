# Node 22 matches the repository toolchain in .nvmrc.
FROM node:22.23.4-bookworm-slim AS build

WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN npm ci --workspace @ip-camera/backend --include-workspace-root

COPY tsconfig.base.json ./
COPY backend backend
RUN npm run build -w @ip-camera/backend

FROM node:22.23.4-bookworm-slim

WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN npm ci --workspace @ip-camera/backend --include-workspace-root --omit=dev \
  && npm cache clean --force

COPY --from=build /app/backend/dist backend/dist
USER node
EXPOSE 3001
CMD ["node", "backend/dist/server.js"]
