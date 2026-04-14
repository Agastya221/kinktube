# KinkTube Deployment Guide

Complete guide for deploying KinkTube to a production VPS (Hetzner, Contabo, DigitalOcean, etc.)

## Table of Contents

1. [Server Requirements](#server-requirements)
2. [Initial Server Setup](#initial-server-setup)
3. [Domain & Cloudflare Setup](#domain--cloudflare-setup)
4. [SSL Certificate Setup](#ssl-certificate-setup)
5. [Application Deployment](#application-deployment)
6. [Monitoring & Maintenance](#monitoring--maintenance)
7. [Scaling Considerations](#scaling-considerations)

---

## Server Requirements

### Minimum Specs (up to 50k daily visitors)
- **CPU**: 2 vCPU
- **RAM**: 4 GB
- **Storage**: 40 GB SSD
- **Bandwidth**: 2 TB/month

### Recommended Specs (50k-200k daily visitors)
- **CPU**: 4 vCPU
- **RAM**: 8 GB
- **Storage**: 80 GB NVMe SSD
- **Bandwidth**: 5 TB/month

### High Traffic (200k+ daily visitors)
- **CPU**: 8+ vCPU
- **RAM**: 16+ GB
- **Storage**: 160 GB NVMe SSD
- **Bandwidth**: 10+ TB/month
- Consider load balancing and CDN

---

## Initial Server Setup

### 1. Connect to Your Server

```bash
ssh root@your-server-ip
```

### 2. Update System

```bash
apt update && apt upgrade -y
apt install -y curl wget git htop ufw fail2ban
```

### 3. Create Non-Root User

```bash
adduser kinktube
usermod -aG sudo kinktube
su - kinktube
```

### 4. Configure Firewall

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
sudo ufw enable
```

### 5. Configure Fail2ban

```bash
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 6. Install Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker kinktube
newgrp docker
```

### 7. Install Docker Compose

```bash
sudo apt install docker-compose-plugin
docker compose version
```

---

## Domain & Cloudflare Setup

### 1. Add Domain to Cloudflare

1. Sign up at [cloudflare.com](https://cloudflare.com)
2. Add your domain
3. Update nameservers at your registrar

### 2. DNS Configuration

Add these DNS records:

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| A | @ | your-server-ip | Proxied |
| A | www | your-server-ip | Proxied |
| A | api | your-server-ip | Proxied |

### 3. Cloudflare SSL/TLS Settings

1. Go to **SSL/TLS** → Set to **Full (strict)**
2. Go to **SSL/TLS** → **Edge Certificates**:
   - Enable "Always Use HTTPS"
   - Enable "Automatic HTTPS Rewrites"
   - Set Minimum TLS Version to 1.2

### 4. Cloudflare Security Settings

1. Go to **Security** → **Settings**:
   - Security Level: Medium
   - Challenge Passage: 30 minutes
   - Browser Integrity Check: On

2. Go to **Security** → **WAF**:
   - Enable managed rules (if on paid plan)

### 5. Cloudflare Caching

1. Go to **Caching** → **Configuration**:
   - Caching Level: Standard
   - Browser Cache TTL: 4 hours

2. Create Page Rules:
   ```
   *yourdomain.com/api/*
   Cache Level: Bypass
   
   *yourdomain.com/_next/static/*
   Cache Level: Cache Everything
   Edge Cache TTL: 1 month
   ```

---

## SSL Certificate Setup

### Option A: Cloudflare Origin Certificate (Recommended)

1. In Cloudflare, go to **SSL/TLS** → **Origin Server**
2. Click "Create Certificate"
3. Choose RSA (2048)
4. Set validity (15 years recommended)
5. Save the certificate and private key

```bash
# On your server
sudo mkdir -p /opt/kinktube/nginx/ssl
sudo nano /opt/kinktube/nginx/ssl/fullchain.pem
# Paste the certificate

sudo nano /opt/kinktube/nginx/ssl/privkey.pem
# Paste the private key

sudo chmod 600 /opt/kinktube/nginx/ssl/*.pem
```

### Option B: Let's Encrypt

```bash
# Install Certbot
sudo apt install certbot

# Stop any service on port 80
sudo docker compose down

# Get certificate
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Copy certificates
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem /opt/kinktube/nginx/ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem /opt/kinktube/nginx/ssl/

# Set up auto-renewal cron
echo "0 3 * * * certbot renew --quiet && docker compose -f /opt/kinktube/docker-compose.yml -f /opt/kinktube/docker-compose.prod.yml restart nginx" | sudo crontab -
```

---

## Application Deployment

### 1. Clone Repository

```bash
cd /opt
sudo mkdir kinktube
sudo chown kinktube:kinktube kinktube
cd kinktube
git clone https://github.com/yourusername/kinktube.git .
```

### 2. Configure Environment

```bash
cp .env.example .env
nano .env
```

**Critical settings to configure:**

```env
# Database - Use strong passwords!
POSTGRES_PASSWORD=your_very_strong_password_here

# Your domain
SITE_URL=https://yourdomain.com
API_URL=https://yourdomain.com

# Ad network zones (from ExoClick dashboard)
NEXT_PUBLIC_AD_NETWORK=exoclick
NEXT_PUBLIC_AD_ZONE_BANNER=123456
NEXT_PUBLIC_AD_ZONE_SIDEBAR=123457
NEXT_PUBLIC_AD_ZONE_POPUNDER=123458

# Affiliate IDs (from KinkyDollars, ClubDomCash, etc.)
AFFILIATE_KINKYDOLLARS_ID=your_id
AFFILIATE_CLUBDOMCASH_ID=your_id
```

### 3. Create Required Directories

```bash
mkdir -p nginx/ssl nginx/logs nginx/cache
```

### 4. Copy SSL Certificates

```bash
# If using Cloudflare Origin Certificate
# (certificates should already be in nginx/ssl/)

# Verify
ls -la nginx/ssl/
```

### 5. Build and Deploy

```bash
# Build images
docker compose -f docker-compose.yml -f docker-compose.prod.yml build

# Start services
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Check status
docker compose ps

# View logs
docker compose logs -f
```

### 6. Verify Deployment

```bash
# Check health endpoint
curl http://localhost:8080/health

# Check frontend
curl http://localhost:3000

# Check through nginx
curl -I https://yourdomain.com
```

### 7. Initial Data Import

The system automatically imports videos on first start. To manually trigger:

```bash
curl -X POST http://localhost:8080/api/admin/import
```

---

## Monitoring & Maintenance

### View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f nginx

# Last 100 lines
docker compose logs --tail=100 backend
```

### Monitor Resources

```bash
# Container stats
docker stats

# System resources
htop

# Disk usage
df -h
```

### Database Backup

```bash
# Create backup script
cat > /opt/kinktube/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/kinktube/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

docker compose exec -T postgres pg_dump -U kinktube kinktube > $BACKUP_DIR/kinktube_$DATE.sql
gzip $BACKUP_DIR/kinktube_$DATE.sql

# Keep only last 7 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete
EOF

chmod +x /opt/kinktube/backup.sh

# Add to crontab (daily at 3am)
echo "0 3 * * * /opt/kinktube/backup.sh" | crontab -
```

### Update Application

```bash
cd /opt/kinktube

# Pull latest code
git pull origin main

# Rebuild and restart
docker compose -f docker-compose.yml -f docker-compose.prod.yml build
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Clean up old images
docker image prune -f
```

### Clear Cache

```bash
# Clear Redis cache
docker compose exec redis redis-cli FLUSHALL

# Clear Nginx cache
sudo rm -rf nginx/cache/*
docker compose restart nginx
```

---

## Scaling Considerations

### When to Scale

- Response times > 500ms consistently
- CPU usage > 80% sustained
- Memory usage > 85%
- Error rates increasing

### Vertical Scaling (Bigger Server)

1. Take database backup
2. Provision larger server
3. Migrate data
4. Update DNS

### Horizontal Scaling (Multiple Servers)

For 500k+ daily visitors:

```
[Cloudflare CDN]
       ↓
[Load Balancer]
    ↓     ↓
[App 1] [App 2]  ← Stateless frontend/backend
    ↓     ↓
[Redis Cluster]
       ↓
[PostgreSQL Primary → Replica]
```

### CDN for Static Assets

Configure Cloudflare to cache:
- `/_next/static/*` - Cache indefinitely
- `/static/*` - Cache 30 days
- Images from thumbnails - Cache 7 days

---

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker compose logs backend

# Check container status
docker compose ps -a

# Restart specific service
docker compose restart backend
```

### Database Connection Issues

```bash
# Check if postgres is running
docker compose exec postgres pg_isready

# Connect to database
docker compose exec postgres psql -U kinktube
```

### Nginx 502 Bad Gateway

```bash
# Check if upstream services are running
docker compose ps

# Check nginx logs
docker compose logs nginx

# Restart all services
docker compose restart
```

### High Memory Usage

```bash
# Check which container uses most memory
docker stats --no-stream

# Restart memory-heavy container
docker compose restart backend
```

### Clear Everything and Start Fresh

```bash
# WARNING: This deletes all data!
docker compose down -v
docker system prune -af
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

---

## Security Checklist

- [ ] Strong database password (20+ characters)
- [ ] Firewall configured (ufw)
- [ ] Fail2ban enabled
- [ ] SSH key authentication (disable password)
- [ ] Cloudflare proxy enabled
- [ ] SSL/TLS Full (strict) mode
- [ ] Regular backups configured
- [ ] Keep system updated
- [ ] Monitor logs for anomalies

---

## Support

For issues:
1. Check logs: `docker compose logs -f`
2. Check Cloudflare analytics for errors
3. Review this guide's troubleshooting section
