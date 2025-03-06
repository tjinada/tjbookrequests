FROM node:16-alpine as build

WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the code and build
COPY . .
RUN npm run build

# Production stage with Nginx
FROM nginx:alpine

# Copy built files from build stage
COPY --from=build /app/build /usr/share/nginx/html

# Create a simple default nginx config
RUN echo 'server { \
    listen 80; \
    server_name localhost; \
    include /etc/nginx/mime.types; \
    default_type application/octet-stream; \
    types { \
        text/html                             html htm shtml; \
        text/css                              css; \
        text/javascript                       js; \
        application/json                      json; \
        image/png                             png; \
        image/jpeg                            jpg jpeg; \
        image/svg+xml                         svg svgz; \
        application/woff                      woff; \
        application/woff2                     woff2; \
        application/x-font-ttf                ttf; \
        application/manifest+json             webmanifest; \
    } \
    add_header Service-Worker-Allowed "/"; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
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