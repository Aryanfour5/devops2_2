# Stage 1: Build and Test
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY src/package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY src/ .

# Run tests
RUN npm test

# Stage 2: Production Runtime
FROM node:18-alpine

WORKDIR /app

# Copy package files from builder
COPY src/package*.json ./

# Install only production dependencies
RUN npm install --production

# Copy application from builder stage
COPY --from=builder /app .

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

EXPOSE 3000

CMD ["npm", "start"]
