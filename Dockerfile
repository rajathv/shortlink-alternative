# Use the official Node.js 18 Alpine image
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /app

# Install Python and build dependencies for native modules FIRST
# Install py3-setuptools to provide distutils for Python 3.12+
RUN apk add --no-cache \
    python3 \
    py3-setuptools \
    make \
    g++ \
    && ln -sf python3 /usr/bin/python

# Create a non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Remove build dependencies to reduce image size
RUN apk del make g++

# Copy the rest of the application code
COPY . .

# Create data directory for SQLite database
RUN mkdir -p /app/data && chown -R nodejs:nodejs /app

# Switch to the nodejs user
USER nodejs

# Expose the port the app runs on
EXPOSE 3000

# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').request('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).end()"

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH=/app/data/mora_shortlink.db

# Start the application
CMD ["node", "server.js"]
