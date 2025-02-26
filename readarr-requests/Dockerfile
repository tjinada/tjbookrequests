# Base Node image
FROM node:16-alpine as build

# Set working directory
WORKDIR /app

# Copy package.json files for both frontend and backend
COPY package*.json ./
COPY frontend/package*.json ./frontend/

# Install dependencies for both
RUN npm install
RUN cd frontend && npm install

# Copy all code
COPY . .

# Build frontend
RUN cd frontend && npm run build

# Production image
FROM node:16-alpine

WORKDIR /app

# Copy backend dependencies from build stage
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package*.json ./

# Copy backend code
COPY --from=build /app/server.js ./
COPY --from=build /app/controllers ./controllers
COPY --from=build /app/models ./models
COPY --from=build /app/routes ./routes
COPY --from=build /app/middleware ./middleware
COPY --from=build /app/config ./config

# Copy built frontend
COPY --from=build /app/frontend/build ./frontend/build

# Expose port
EXPOSE 5000

# Set environment variables
ENV NODE_ENV=production

# Start the server
CMD ["node", "server.js"]