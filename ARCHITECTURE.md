# FarmLokal Backend Architecture

## System Overview

Farm Lokal is built as a modular monolith optimized for performance and reliability.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                             │
│              (Web Apps, Mobile Apps, Partners)                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    API GATEWAY LAYER                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │   Express.js with Middleware Stack                       │  │
│  │   - Request ID │ Logging │ Rate Limiting │ Error Handler│  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────────┘
                         │
           ┌─────────────┴─────────────┐
           │                           │
           ▼                           ▼
┌──────────────────┐         ┌──────────────────┐
│  Products Module │         │ Webhooks Module  │
│                  │         │                  │
│  Controller      │         │  Controller      │
│  Service         │         │  Service         │
│  Repository      │         │  Repository      │
└────────┬─────────┘         └────────┬─────────┘
         │                            │
         └────────────┬───────────────┘
                      │
         ┌────────────┴───────────────┬──────────────┐
         │                            │              │
         ▼                            ▼              ▼
┌──────────────┐           ┌──────────────┐  ┌──────────────┐
│   MySQL      │           │    Redis     │  │ External API │
│  (Primary)   │           │   Cluster    │  │  Services    │
└──────────────┘           └──────────────┘  └──────────────┘
```

## Caching Architecture

### Cache-Aside Pattern

```
Request → Check Cache → [HIT] → Return Cached Data
                     ↓ [MISS]
                Database Query
                     ↓
              Cache Result (TTL)
                     ↓
              Return Fresh Data
```

### Cache Key Strategy

**Product Lists:**
```
cache:products:{md5(normalized_query_params)}
```

Example:
```
Query: ?category=abc&sort=price&order=asc&limit=20
Key: cache:products:a1b2c3d4e5f6789...
```

**Individual Products:**
```
cache:products:{product_uuid}
```

### Cache Invalidation

| Event | Action |
|-------|--------|
| Product Created | Invalidate list caches |
| Product Updated | Invalidate specific + lists |
| Product Deleted | Invalidate specific + lists |
| Category Changed | Invalidate category lists |
| Bulk Import | Flush all product caches |

## OAuth Token Lifecycle

```
Request Needs Token
      ↓
Check Redis Cache
      ↓
   [Cached & Valid]? → Return Token
      ↓ [No]
Acquire Distributed Lock
      ↓
   [Lock Acquired]?
      ↓ [Yes]
Fetch from OAuth Provider
      ↓
Cache with TTL = expiry - 60s
      ↓
Release Lock
      ↓
Return Token
```

### Concurrency Safety

Uses Redis SETNX for distributed locking:
- Lock TTL: 10 seconds
- Prevents thundering herd
- Waiting requests poll cache for token

## Database Query Optimization

### Cursor Pagination

Traditional offset/limit:
```sql
SELECT * FROM products LIMIT 100 OFFSET 100000; 
```
**Problem:** Scans 100,000 rows then skips them

Our cursor approach:
```sql
SELECT * FROM products 
WHERE (created_at < ? OR (created_at = ? AND id < ?))
ORDER BY created_at DESC, id DESC 
LIMIT 20;
```
**Benefit:** Uses index, constant performance

### Index Strategy

```sql
CREATE INDEX idx_products_cursor_created (created_at, id);
```

Covers:
- Default sorting (created_at DESC)
- Pagination WHERE clause
- No filesort needed

### Full-Text Search

```sql
FULLTEXT INDEX idx_products_search (name, description);
```

Query:
```sql
SELECT * FROM products 
WHERE MATCH(name, description) AGAINST(? IN NATURAL LANGUAGE MODE);
```

## External API Integration

### Retry Strategy

```
Attempt 1: Fail → Wait 100ms + jitter
Attempt 2: Fail → Wait 400ms + jitter
Attempt 3: Fail → Wait 1600ms + Jitter
Attempt 4: Fail → Circuit Opens
```

### Circuit Breaker States

```
CLOSED (Normal)
   ↓ [5 consecutive failures]
OPEN (Fail Fast)
   ↓ [30 seconds timeout]
HALF-OPEN (Test)
   ↓ [Success] ────────┐
   │                    ↓
   │                  CLOSED
   │
   └─ [Failure] → OPEN
```

## Webhook Processing

### Idempotency Flow

```
Incoming Webhook
      ↓
Verify HMAC Signature
      ↓ [Invalid] → 401 Unauthorized
      ↓ [Valid]
Check Idempotency Key in Redis
      ↓ [Duplicate] → 200 OK (no-op)
      ↓ [New]
Store in Database
      ↓
Set Redis Key (TTL 24h)
      ↓
Return 202 Accepted
      ↓ [Async]
Process Event
```

### Security

1. **Signature Validation**
   ```
   HMAC-SHA256(payload, secret) === received_signature
   ```

2. **Timestamp Validation**
   ```
   |current_time - webhook_timestamp| <= 300 seconds
   ```

## Rate Limiting

### Sliding Window Algorithm

```
Window: 60 seconds
Limit: 1000 requests

Request at T=65:
   Previous Window (0-60s): 800 requests
   Current Window (5-65s): 300 requests
   
   Weighted = 800 * (55/60) + 300 = 1033
   
   1033 > 1000 → REJECT (429)
```

## Performance Targets

| Metric | Target | Strategy |
|--------|--------|----------|
| P50 Latency | < 50ms | Caching, indexes |
| P95 Latency | < 200ms | Query optimization |
| P99 Latency | < 500ms | Connection pooling |
| Cache Hit Ratio | > 85% | Smart TTLs |
| Error Rate | < 0.1% | Retry + circuit breaker |

## Error Handling Philosophy

### Error Classification

```
4xx Errors → Client fault → Don't retry
5xx Errors → Server fault → Retry with backoff
Timeout → Network issue → Retry
Circuit Open → Service degraded → Fail fast
```

### Graceful Degradation

| Component Failure | Degradation Strategy |
|-------------------|----------------------|
| Redis Cache Down | Serve from database |
| External API Down | Return cached/default data |
| Database Replica Down | Route to primary |
| Rate Limiter Down | Allow all requests |

## Deployment Strategy

### Blue-Green Deployment

```
Before: Traffic → Blue (v1)

During: Traffic → Blue (v1)
        Test Green (v2) with health checks

After: Traffic → Green (v2)
       Keep Blue as rollback
```

### Health Check Layers

1. **Liveness** (`/health/live`)
   - Process running?
   - Return 200

2. **Readiness** (`/health/ready`)
   - Database connected?
   - Redis connected?
   - Return 200 if both OK

## Observability

### Structured Logging

```json
{
  "level": "info",
  "timestamp": "2026-02-06T10:30:00.000Z",
  "request_id": "uuid",
  "message": "Request completed",
  "duration_ms": 45,
  "status_code": 200
}
```

### Key Metrics

1. **Golden Signals**
   - Latency: `http_request_duration_seconds`
   - Traffic: `http_requests_total`
   - Errors: `http_requests_total{status=~"5.."}`
   - Saturation: Connection pool usage

2. **Business Metrics**
   - Cache efficiency
   - Token refresh frequency
   - Circuit breaker states

## Trade-Offs

### Modular Monolith vs Microservices

✅ **Chose Monolith Because:**
- Team size: 2-4 developers
- Simpler deployment
- ACID transactions
- Lower operational overhead

❌ **Deferred Microservices:**
- Can extract modules later if needed
- Current scale doesn't require it

### Cursor vs Offset Pagination

✅ **Chose Cursor Because:**
- Stable under concurrent writes
- Constant performance
- Better UX for infinite scroll

❌ **Trade-Off:**
- Can't jump to arbitrary page
- More complex implementation

### Redis vs In-Memory Cache

✅ **Chose Redis Because:**
- Shared across instances
- Persistence option
- Rich data structures
- TTL management

❌ **Trade-Off:**
- Network latency (~1ms)
- Additional infrastructure

## Future Enhancements

1. **Read Replicas**
   - Route read queries to replicas
   - Primary for writes only

2. **CDN Caching**
   - Cache-Control headers
   - Edge caching for static queries

3. **Elasticsearch**
   - Advanced search capabilities
   - Faceted filtering

4. **Message Queue**
   - Async webhook processing
   - Event-driven architecture

5. **GraphQL**
   - Flexible queries
   - Reduce over-fetching
