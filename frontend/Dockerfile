# Node 22 matches the repository toolchain in .nvmrc.
FROM node:22.23.4-bookworm-slim AS build

WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN npm ci --workspace @ip-camera/frontend --include-workspace-root

COPY frontend frontend
ARG VITE_API_BASE_URL=http://127.0.0.1:3001
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build -w @ip-camera/frontend

FROM nginx:1.28.0-alpine

COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/dist /usr/share/nginx/html
EXPOSE 5173
