FROM node:16-alpine as build

WORKDIR /app

# Add build timestamp as environment variable
ARG BUILD_DATE=unknown
ENV REACT_APP_BUILD_DATE=$BUILD_DATE

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the code
COPY . .

# Insert build timestamp into service worker
RUN sed -i "s|const BUILD_TIMESTAMP = new Date().toISOString();|const BUILD_TIMESTAMP = '$BUILD_DATE';|g" public/service-worker.js

# Build the app
RUN npm run build

# Production stage with Nginx
FROM nginx:alpine

# Copy built files from build stage
COPY --from=build /app/build /usr/share/nginx/html

# Create a custom nginx config
RUN echo 'server { \
    listen 80; \
    server_name localhost; \
    include /etc/nginx/mime.types; \
    default_type application/octet-stream; \
    \
    add_header Service-Worker-Allowed "/"; \
    \
    # Ensure proper cache control for PWA files \
    location = /service-worker.js { \
        add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0"; \
        expires off; \
        proxy_no_cache 1; \
    } \
    \
    location = /manifest.json { \
        add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0"; \
        expires off; \
        proxy_no_cache 1; \
    } \
    \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    \
    location /api/ { \
        rewrite ^/api(/.*)$ /api$1 break; \
        proxy_pass http://backend:5000/; \
        proxy_http_version 1.1; \
        proxy_set_header Upgrade $http_upgrade; \
        proxy_set_header Connection "upgrade"; \
        proxy_set_header Host $host; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]