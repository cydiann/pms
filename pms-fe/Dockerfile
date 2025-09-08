# Use Node.js 20 LTS as base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --only=production=false

# Copy source code
COPY . .

# Build the production web version
RUN npm run build:web

# Install serve for production static file serving
RUN npm install -g serve

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S reactjs -u 1001

# Change ownership of the app directory
RUN chown -R reactjs:nodejs /app
USER reactjs

# Expose port
EXPOSE 3000

# Use serve to serve the built web app in production
CMD ["serve", "-s", "dist", "-l", "3000"]