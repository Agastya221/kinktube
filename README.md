# KinkTube - BDSM Video Aggregator

A modern, high-performance video aggregation platform focused on BDSM, kink, and fetish content. Built with Go (Fiber) backend and Next.js 15 (TypeScript) frontend.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Go Version](https://img.shields.io/badge/Go-1.22+-00ADD8.svg)
![Next.js](https://img.shields.io/badge/Next.js-15-black.svg)

## Features

### Core
- **Video Aggregation**: Automatically imports videos from Eporner API
- **Category Browsing**: Femdom, Bondage, BDSM, Latex, and 15+ categories
- **Full-Text Search**: PostgreSQL-powered search across video titles
- **Responsive Design**: Dark adult theme optimized for all devices
- **High Performance**: Redis caching, optimized queries, ISR

### Monetization
- **Ad System**: Support for ExoClick, TrafficJunky, JuicyAds
  - Banner, sidebar, native, popunder, mobile formats
  - Configurable via environment variables
- **Affiliate Integration**: Smart matching for BDSM affiliate programs
  - KinkyDollars (Kink.com)
  - ClubDomCash (Femdom)
  - FemDom Empire
  - Device Bondage, Hogtied, and more

### Compliance
- Age verification modal (18+)
- DMCA takedown policy
- 18 U.S.C. 2257 compliance statement
- Privacy policy and terms of service
- RTA labeling for content filters

### Performance
- Server-side rendering with ISR (1-hour revalidation)
- Redis caching layer
- Optimized PostgreSQL queries with indexes
- Nginx reverse proxy with caching
- Cloudflare-ready configuration

## Tech Stack

### Backend
- **Go 1.22** with Fiber framework
- **PostgreSQL 16** for data storage
- **Redis 7** for caching
- **robfig/cron** for scheduled imports

### Frontend
- **Next.js 15** with App Router
- **TypeScript**
- **Tailwind CSS** with dark theme
- **React 19**

### Infrastructure
- **Docker & Docker Compose**
- **Nginx** reverse proxy
- **Cloudflare** CDN (recommended)

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Git

### Development Setup

```bash
# Clone repository
git clone https://github.com/yourusername/kinktube.git
cd kinktube

# Create environment file
cp .env.example .env

# Start with Docker Compose
docker compose up -d

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:8080
# Health check: http://localhost:8080/health
```

### Production Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for complete deployment guide including:
- VPS setup (Hetzner, Contabo, DigitalOcean)
- Domain and Cloudflare configuration
- SSL certificate setup
- Monitoring and maintenance

## Project Structure

```
kinktube/
├── backend/
│   ├── cmd/server/           # Application entry point
│   ├── internal/
│   │   ├── config/           # Configuration
│   │   ├── database/         # PostgreSQL & Redis
│   │   ├── handlers/         # HTTP handlers
│   │   ├── middleware/       # CORS, rate limiting
│   │   ├── models/           # Data models
│   │   └── services/         # Business logic
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/              # Next.js pages
│   │   ├── components/       # React components
│   │   │   ├── ads/          # Ad components
│   │   │   └── affiliate/    # Affiliate buttons
│   │   ├── lib/              # API client, types
│   │   └── hooks/            # React hooks
│   └── Dockerfile
├── nginx/
│   ├── nginx.conf            # Development config
│   └── nginx.prod.conf       # Production config
├── docker-compose.yml        # Development
├── docker-compose.prod.yml   # Production
├── DEPLOYMENT.md             # Deployment guide
└── .env.example              # Environment template
```

## API Endpoints

### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/videos` | List videos with pagination |
| GET | `/api/videos/:id` | Get single video |
| GET | `/api/videos/:id/full` | Get video with affiliate links |
| GET | `/api/videos/:id/related` | Get related videos |
| GET | `/api/videos/:id/affiliates` | Get affiliate links for video |
| GET | `/api/categories` | Get all categories |
| GET | `/api/stats` | Get site statistics |
| GET | `/health` | Health check |

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | int | 1 | Page number |
| `per_page` | int | 24 | Items per page (max 100) |
| `sort` | string | "latest" | latest, views, rating, duration |
| `category` | string | - | Filter by category slug |
| `q` | string | - | Search query |

## Configuration

### Key Environment Variables

```env
# Database
POSTGRES_PASSWORD=secure_password
DATABASE_URL=postgres://...

# Cache
REDIS_URL=redis://localhost:6379

# Ads (ExoClick example)
NEXT_PUBLIC_AD_NETWORK=exoclick
NEXT_PUBLIC_AD_ZONE_BANNER=123456
NEXT_PUBLIC_AD_ZONE_POPUNDER=123457

# Affiliates
AFFILIATE_KINKYDOLLARS_ID=your_id
AFFILIATE_CLUBDOMCASH_ID=your_id

# Import
IMPORT_ENABLED=true
IMPORT_SCHEDULE=0 */4 * * *
```

See [.env.example](.env.example) for all options.

## Affiliate Programs

The system supports smart affiliate matching based on video tags:

| Content Type | Affiliate Program |
|--------------|-------------------|
| Femdom, Mistress | ClubDomCash, FemDom Empire |
| Device Bondage | Device Bondage (Kink.com) |
| Rope Bondage | Hogtied, Sadistic Rope |
| Lesbian BDSM | Whipped Ass |
| General BDSM | KinkyDollars (Kink.com) |

## Performance Tips

1. **Enable Cloudflare**: Use Full (strict) SSL and caching rules
2. **Tune PostgreSQL**: Adjust `shared_buffers`, `work_mem` for your RAM
3. **Monitor Redis**: Set appropriate `maxmemory` limit
4. **Use ISR**: Pages revalidate every hour by default
5. **Enable Nginx caching**: Configured in `nginx.prod.conf`

## License

This project is for educational purposes. Ensure compliance with all applicable laws and terms of service.

## Disclaimer

- This site aggregates content from third-party sources
- All videos are embedded via official embed codes
- No video content is hosted on our servers
- All performers are 18+ as verified by source platforms

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## Support

For issues, please open a GitHub issue with:
- Description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Relevant logs
