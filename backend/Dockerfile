# Base image
FROM node:22.17.1-alpine3.22 AS base
WORKDIR /app


# Build stage
FROM base AS builder

COPY package*.json ./

RUN npm ci --ignore-scripts

COPY prisma ./prisma/

RUN npx prisma generate

COPY . .

RUN npm run build


# Production image
FROM base AS production

ENV NODE_ENV=production

COPY --from=builder /app/package*.json ./

RUN npm ci --only=production --ignore-scripts

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/protos ./dist/protos

COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma/

RUN addgroup -S appgroup && \
    adduser -S appuser -G appgroup
COPY --chown=appuser:appgroup entrypoint.sh .
RUN chmod +x ./entrypoint.sh && \
    chown -R appuser:appgroup /app

USER appuser

EXPOSE 3000

ENTRYPOINT ["./entrypoint.sh"]

CMD ["node", "dist/main.js"]