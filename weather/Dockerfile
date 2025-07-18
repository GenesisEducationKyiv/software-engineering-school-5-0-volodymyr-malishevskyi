# Base image
FROM node:22.17.1-alpine3.22 AS base
WORKDIR /app


# Build stage
FROM base AS builder

COPY package*.json ./

RUN npm ci --ignore-scripts

COPY . .

RUN npm run build


# Production image
FROM base AS production

ENV NODE_ENV=production

COPY --from=builder /app/package*.json ./

RUN npm ci --only=production --ignore-scripts

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/protos ./dist/protos

RUN addgroup -S appgroup && \
    adduser -S appuser -G appgroup
RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 3000

CMD ["node", "dist/main.js"]