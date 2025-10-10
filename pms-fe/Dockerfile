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

# Build the production version
RUN npm run build:web

# Install sirv-cli for production static serving (supports --host)
RUN npm install -g sirv-cli

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S reactjs -u 1001

# Change ownership of the app directory
RUN chown -R reactjs:nodejs /app
USER reactjs

# Expose port
EXPOSE 3000

# Serve the built production files on all interfaces
CMD ["sirv", "dist", "--port", "3000", "--host", "0.0.0.0"]