FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web

RUN npm install

# Build shared first
WORKDIR /app/packages/shared
RUN npm run generate
RUN npm run build

# Build Web
WORKDIR /app/apps/web
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# --- Serving Stage (Nginx) ---
FROM nginx:alpine

COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# Optional: Add custom nginx config if needed for SPA routing (fallback to index.html)
RUN echo 'server { \
    listen 80; \
    location / { \
    root /usr/share/nginx/html; \
    index index.html index.htm; \
    try_files $uri $uri/ /index.html; \
    } \
    }' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
