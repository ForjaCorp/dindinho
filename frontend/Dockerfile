FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/
COPY packages/shared/package.json ./packages/shared/
RUN npm ci --workspaces --include-workspace-root

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV CI=true
RUN npm --prefix packages/shared run build
RUN npm --prefix frontend run build

FROM nginx:alpine AS runner
WORKDIR /usr/share/nginx/html
RUN rm -rf /usr/share/nginx/html/*
COPY --from=builder /app/frontend/dist/frontend/browser/ .
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
RUN apk add --no-cache curl
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD curl -fsS http://localhost/ || exit 1
CMD ["nginx", "-g", "daemon off;"]
