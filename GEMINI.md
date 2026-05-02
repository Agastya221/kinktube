# KinkTube - Project Instructions

## Project Overview
A modern, high-performance video aggregation platform focused on BDSM, kink, and fetish content.

## Tech Stack
- **Backend**: Go 1.22 (Fiber), PostgreSQL 16 (pgx), Redis 7 (go-redis).
- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS, React 19.
- **Infrastructure**: Docker, Docker Compose, Nginx.

## Architecture
- **Backend (`/backend`)**:
  - `cmd/server/`: Entry point.
  - `internal/config/`: Configuration handling.
  - `internal/database/`: DB connections (Postgres & Redis).
  - `internal/handlers/`: HTTP request handlers.
  - `internal/middleware/`: CORS, rate limiting.
  - `internal/models/`: GORM-like models or simple structs.
  - `internal/services/`: Business logic and external API integrations (Eporner).
- **Frontend (`/frontend`)**:
  - `src/app/`: Next.js App Router pages and layouts.
  - `src/components/`: Reusable UI components (ads, affiliate, common).
  - `src/lib/`: API client, utility functions, type definitions.
  - `src/hooks/`: Custom React hooks.

## Development Workflow
- **Environment**: Use `.env` file based on `.env.example`.
- **Docker**: `docker compose up -d` for local development.
- **Backend**: Run with `go run cmd/server/main.go` or via Docker.
- **Frontend**: `npm run dev` or via Docker.

## Coding Standards
- **Go**: Follow standard Go idioms. Use `golangci-lint` if available.
- **TypeScript**: Strict typing, prefer functional components, use Tailwind CSS for styling.
- **CSS**: Vanilla CSS or Tailwind utility classes. Avoid complex CSS-in-JS.

## Key Features
- Video aggregation from Eporner API.
- Search and categorization.
- Ad system integration.
- Affiliate program matching.
- Compliance pages (DMCA, 2257, Privacy).
