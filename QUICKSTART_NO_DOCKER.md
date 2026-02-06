# FarmLokal Backend - Quick Start Without Docker

## Prerequisites

Install these directly on Windows:

### 1. Install MySQL 8.0
- Download: https://dev.mysql.com/downloads/installer/
- Install with default settings
- Remember your root password
- Create database: `CREATE DATABASE farmlokal;`

### 2. Install Redis (Windows)
- Download: https://github.com/microsoftarchive/redis/releases
- Or use WSL2: `wsl --install` then `sudo apt install redis-server`

## Setup Steps

### 1. Update .env file

```bash
# Copy .env.example to .env
cp .env.example .env
```

Update with your local credentials:
```
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_NAME=farmlokal
DATABASE_USER=root
DATABASE_PASSWORD=your_mysql_password

REDIS_HOST=localhost  
REDIS_PORT=6379
```

### 2. Run Migrations

```bash
npm run migrate
```

### 3. Seed Database (1M records)

```bash
npm run seed
```

This takes 5-10 minutes to insert 1 million products.

### 4. Start Server

```bash
npm run dev
```

Server starts on http://localhost:3000

### 5. Test Endpoints

```powershell
# Health check
curl http://localhost:3000/health/ready

# Get products
curl "http://localhost:3000/api/v1/products?limit=10"

# With filters
curl "http://localhost:3000/api/v1/products?search=organic&limit=20"
```

### 6. Load Testing

```bash
npm run test:load
```

---

## Alternative: Use Docker (Easier)

If you want the easiest setup:

1. Install Docker Desktop: https://www.docker.com/products/docker-desktop/
2. Restart computer
3. Run: `npm run docker:up`
4. Continue from step 2 above (migrations)

Docker automatically sets up MySQL and Redis with correct configuration.
