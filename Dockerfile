# Stage 1: Build
FROM node:20-alpine AS builder
RUN apk add --no-cache python3 make g++ linux-headers eudev
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps --no-audit --progress=false && npm cache clean --force
COPY . .
RUN npm run build

# Stage 2: Production image
FROM node:20-alpine AS production
RUN apk add --no-cache eudev
WORKDIR /app
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/devices.json ./devices.json
COPY --from=builder /app/files ./files
ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm", "run", "start:prod"]
