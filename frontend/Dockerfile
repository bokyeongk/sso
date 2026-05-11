# ── Build stage ──────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Runtime stage ─────────────────────────────────────────
FROM nginx:alpine
WORKDIR /usr/share/nginx/html

COPY --from=build /app/dist .
COPY nginx.conf /etc/nginx/templates/default.conf.template

EXPOSE 4001

CMD ["nginx", "-g", "daemon off;"]
