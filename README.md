# FarmLokal Backend

High-performance, production-ready backend API for FarmLokal hyperlocal marketplace platform.

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- MySQL 8.0+
- Redis 7.0+

### Installation

```bash
npm install
cp .env.example .env
```

### Run with Docker

```bash
npm run docker:up
```

### Database Setup

```bash
npm run migrate
npm run seed
```

### Start Development Server

```bash
npm run dev
```

Server runs on `http://localhost:3000`

## 📁 Project Structure

```
src/
├── config/              Configuration modules
├── core/                Core infrastructure (cache, OAuth)
├── modules/             Feature modules (products, webhooks, external)
├── middleware/          Express middleware
├── shared/              Shared utilities and types
├── observability/       Logging, metrics, health checks
├── server.ts            Express server setup
└── index.ts             Application entry point
```

## 🔑 Key Features

### OAuth2 Authentication
- Client credentials flow
- Automatic token refresh
- Redis-backed token caching
- Distributed locking to prevent thundering herd

### Product Listing API
- Cursor-based pagination
- Multi-field sorting (price, name, created_at)
- Full-text search on name/description
- Category and price range filtering
- **P95 latency < 200ms** for 1M+ records

### Caching Strategy
- Multi-level Redis caching
- Query fingerprint-based cache keys
- Smart cache invalidation
- 5-minute TTL for lists, 15-minute TTL for items

### External API Integration
- Exponential backoff retry (3 attempts)
- Circuit breaker pattern (5-failure threshold, 30s reset)
- 10-second timeout with graceful degradation
- OAuth token injection

### Webhook Processing
- HMAC-SHA256 signature validation
- Timestamp validation (±5 minutes)
- Idempotency key enforcement (24h TTL)
- Duplicate event detection

### Reliability Patterns
- Redis-backed rate limiting (1000 req/min)
- Connection pooling (min: 10, max: 100)
- Request deduplication
- Graceful shutdown handling

## 🛠️ API Endpoints

### Products

**GET /api/v1/products**

Query parameters:
- `limit` (1-100, default: 20) - Page size
- `cursor` - Pagination cursor
- `sort` (price|name|created_at, default: created_at) - Sort field
- `order` (asc|desc, default: desc) - Sort order
- `search` - Full-text search query
- `category` - Category UUID filter
- `minPrice` - Minimum price filter
- `maxPrice` - Maximum price filter

**GET /api/v1/products/:id**

Get single product by ID

### Webhooks

**POST /api/v1/webhooks**

Headers:
- `X-Webhook-Signature` - HMAC-SHA256 signature
- `X-Webhook-Timestamp` - Unix timestamp
- `X-Idempotency-Key` - Unique event identifier

### Health Checks

- **GET /health** - Basic health check
- **GET /health/ready** - Readiness probe (checks DB + Redis)
- **GET /health/live** - Liveness probe
- **GET /metrics** - Prometheus metrics

## 📊 Performance Optimization

### Database Indexes
```sql
FULLTEXT INDEX idx_products_search (name, description)
INDEX idx_products_cursor_created (created_at, id)
INDEX idx_products_category_price (category_id, price)
```

### Caching Layers
1. **OAuth Tokens** - Cached with TTL = token_expiry - 60s
2. **Product Lists** - 5-minute TTL, cache key = MD5(query params)
3. **Individual Products** - 15-minute TTL
4. **Idempotency Keys** - 24-hour TTL

### Connection Pooling
- Min connections: 10
- Max connections: 100
- Idle timeout: 10 minutes
- Connection timeout: 5 seconds

## 🧪 Testing

### Unit Tests
```bash
npm run test:unit
```

### Integration Tests
```bash
npm run test:integration
```

### Load Testing
```bash
npm run test:load
```

Load test validates:
- P95 latency < 200ms
- Error rate < 0.1%
- 1000+ concurrent users

## 📝 Environment Variables

See `.env.example` for all configuration options.

Critical variables:
- `DATABASE_URL` - MySQL connection string
- `REDIS_HOST`, `REDIS_PORT` - Redis connection
- `OAUTH_CLIENT_ID`, `OAUTH_CLIENT_SECRET` - OAuth credentials
- `WEBHOOK_SECRET` - Webhook signature secret
- `RATE_LIMIT_REQUESTS_PER_WINDOW` - Rate limit threshold

## 🚢 Deployment

### Render Platform

1. Create new Web Service
2. Connect GitHub repository
3. Set environment variables
4. Deploy

Configuration:
```yaml
Build Command: npm run build
Start Command: npm start
Auto-Deploy: Yes
Health Check Path: /health/ready
```

### Docker Build

```bash
docker build -t farmlokal-backend .
docker run -p 3000:3000 farmlokal-backend
```

## 🔍 Monitoring

### Prometheus Metrics

- `http_requests_total` - Total HTTP requests
- `http_request_duration_seconds` - Request duration histogram
- `database_query_duration_seconds` - DB query duration
- `cache_hits_total`, `cache_misses_total` - Cache performance
- `circuit_breaker_state` - Circuit breaker status
- `token_refresh_total` - OAuth token refresh attempts

Access metrics at `/metrics`

### Logging

Structured JSON logging via Pino:
- Request/response logging
- Error tracking with stack traces
- PII redaction (passwords, tokens, secrets)

## 🏗️ Architecture Decisions

### Why Cursor Pagination?
- Stable pagination under concurrent writes
- Consistent performance regardless of page depth
- No limit/offset N+1 query issues

### Why Redis for Rate Limiting?
- Distributed rate limiting across instances
- Atomic increment operations
- Built-in TTL expiration

### Why Circuit Breaker?
- Prevents cascade failures
- Fast-fail for degraded services
- Automatic recovery testing

### Why No Comments Rule?
Code is self-documenting through:
- Descriptive function/variable names
- Clear type definitions
- Logical code organization
- Comprehensive external documentation

## 📚 Additional Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Detailed architecture decisions
- [System Requirements](./docs/01_system_requirements_document.md)
- [Implementation Plan](./docs/02_project_implementation_plan.md)
- [Task Breakdown](./docs/03_project_task_breakdown.md)

## 🤝 Contributing

1. Follow existing code structure
2. Maintain zero comments policy
3. Add unit tests for new features
4. Ensure P95 < 200ms for new endpoints
5. Update documentation

## 📄 License

MIT
