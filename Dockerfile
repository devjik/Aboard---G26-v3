# Aboard — Dockerfile (development with hot reload)
FROM oven/bun:1 AS dev

WORKDIR /app

# Install dependencies first (cached layer)
COPY package.json bun.lock ./
RUN bun install

# Copy the rest of the source
COPY . .

# Generate Prisma client
RUN bun run db:generate

# Expose the Next.js dev server port
EXPOSE 3000

# Start: push schema, seed data, then run dev server on 0.0.0.0
# (0.0.0.0 is required for Docker port forwarding to work)
CMD ["sh", "-c", "bun run db:push && bun run db:seed && bunx next dev -p 3000 -H 0.0.0.0"]
