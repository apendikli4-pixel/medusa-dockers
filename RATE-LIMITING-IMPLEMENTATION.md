# Rate Limiting Implementation

## Overview

This implementation adds Redis-backed rate limiting to Medusa v2 API endpoints to prevent abuse and API quota exhaustion.

## Architecture

### Components

1. **Config Layer** (`src/config/rate-limits.ts`)
   - Centralized rate limit definitions
   - Admin IP whitelist configuration
   - Redis key prefix configuration

2. **Core Rate Limiter** (`src/lib/rate-limiter.ts`)
   - Redis-backed sliding window algorithm
   - Lua script for atomic operations
   - In-memory fallback on Redis unavailability
   - Automatic header injection (X-RateLimit-*)
   - Detailed logging and violation tracking

3. **Express Middleware** (`src/api/middlewares/rate-limit.ts`)
   - Express-compatible middleware wrapper
   - Per-endpoint group configuration
   - Fail-open error handling (never blocks on middleware errors)

## Rate Limit Policies

| Endpoint | Limit | Window | Key By | Whitelist |
|----------|-------|--------|--------|----------|
| `/store/ayna/chat` | 20 req | 15 min | User ID / IP | No |
| `/store/search` | 100 req | 15 min | IP | No |
| `/admin/*` | 200 req | 15 min | Admin User | Yes (configurable) |

## Response Headers

All rate-limited endpoints include the following headers:

- `X-RateLimit-Limit`: Maximum requests allowed in the window
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Unix timestamp when the window resets
- `Retry-After`: Seconds to wait before retry (on 429 responses only)

## 429 Response Format

```json
{
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "Çok fazla istek gönderildi. Lütfen 15 dakika sonra tekrar deneyin. (900s until reset)",
  "retryAfter": 900,
  "limit": 20,
  "windowMs": 900000,
  "resetTime": "2026-04-28T00:46:39.000Z"
}
```

## Usage Examples

### 1. Store AI Chat Endpoint (with applyRateLimit)

```typescript
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { createRateLimiter, applyRateLimit } from "../../../lib/rate-limiter"
import { RATE_LIMITS } from "../../../config/rate-limits"

const storeChatRateLimiter = createRateLimiter(RATE_LIMITS.storeAynaChat.limit)

export async function POST(req: MedusaRequest, res: MedusaResponse) {
    // Apply rate limit
    const blocked = await applyRateLimit(req, res, storeChatRateLimiter)
    if (blocked) return

    // Process request...
}
```

### 2. Admin Routes (with applyRateLimit)

```typescript
import { createRateLimiter, applyRateLimit } from "../../../lib/rate-limiter"
import { RATE_LIMITS } from "../../../config/rate-limits"

const adminRateLimiter = createRateLimiter(RATE_LIMITS.admin.limit)

export async function POST(req: MedusaRequest, res: MedusaResponse) {
    const blocked = await applyRateLimit(req, res, adminRateLimiter)
    if (blocked) return

    // Process admin request...
}
```

### 3. Express Middleware Wrapper

```typescript
import { rateLimit } from "../../middlewares/rate-limit"

// As Express middleware
export const POST = [
    rateLimit("storeAynaChat"),
    async (req, res) => {
        // Request already rate-limited if necessary
    }
]
```

### 4. Legacy API Routes (direct limiter)

```typescript
import { applyRateLimit, SEARCH_LIMITER } from "../../../lib/rate-limiter"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
    const blocked = await applyRateLimit(req, res, SEARCH_LIMITER)
    if (blocked) return

    // Process search...
}
```

## Configuration

### Admin IP Whitelist

To whitelist admin IPs (bypass admin rate limits):

```bash
# .env file
ADMIN_WHITELIST_IPS="192.168.1.1,10.0.0.0/24,2001:db8::1"
```

### Custom Rate Limits

Edit `src/config/rate-limits.ts`:

```typescript
export const RATE_LIMITS = {
    myCustomEndpoint: {
        name: "My Custom Endpoint",
        limit: {
            maxRequests: 50,
            windowMs: 5 * 60 * 1000, // 5 minutes
            message: "Custom limit message",
            skipOnWhitelist: false,
        },
    } as RateLimitGroup,
    // ...
}
```

## Redis Integration

### Sliding Window Algorithm

The implementation uses Redis sorted sets with a Lua script for atomic operations:

1. Removes entries older than the window
2. Adds current request timestamp
3. Counts total entries
4. Sets TTL

This ensures accurate counting even across multiple server instances.

### Redis Key Format

```
rl:{clientId}:{path}
```

Examples:
- `rl:customer:c_123:/admin/ayna/chat`
- `rl:ip:192.168.1.1:/store/ayna/chat`

## Client Identification Priority

1. **Authenticated User**: `customer:{actor_id}` (highest priority)
2. **IP Address**: `ip:{ip_address}` (fallback)

IP is extracted from `X-Forwarded-For` header or socket remote address.

## Logging

### Rate Limit Violations

```
[RateLimit] Limit exceeded
  path: "/admin/ayna/chat"
  method: "POST"
  clientId: "customer:admin_123"
  currentCount: 201
  maxRequests: 200
  windowMs: 900000
  resetAfter: 876
  ip: "192.168.1.100"
  userAgent: "Mozilla/5.0..."
```

### Debug Mode

Enable debug logging for detailed request tracking in `src/lib/logger.ts`.

## Fallback Behavior

If Redis is unavailable, the system automatically falls back to in-memory rate limiting:

```
[RateLimit] Redis not initialized, falling back to in-memory
```

⚠️ **Warning**: In-memory limiting is per-instance only and does not synchronize across multiple servers.

## Testing

### Test Rate Limit Violation

```bash
# Make 21 requests to store chat (should block on 21st)
for i in {1..21}; do
    curl -X POST http://localhost:8000/store/ayna/chat \
        -H "Content-Type: application/json" \
        -d '{"message": "test"}' \
        -w "\nHTTP Code: %{http_code}\n"
done
```

### Check Rate Limit Headers

```bash
curl -I http://localhost:8000/store/ayna/chat
# X-RateLimit-Limit: 20
# X-RateLimit-Remaining: 19
# X-RateLimit-Reset: 1714265199
```

## Migration Guide

### Before (In-Memory Only)

```typescript
import { applyRateLimit, AI_LIMITER } from "lib/rate-limiter"

// Single-server only, resets on restart
```

### After (Redis-Backed)

```typescript
import { applyRateLimit, createRateLimiter } from "lib/rate-limiter"
import { RATE_LIMITS } from "config/rate-limits"

// Multi-server, persistent, configurable
const limiter = createRateLimiter(RATE_LIMITS.storeAynaChat.limit)
```

## Benefits

✅ **Distributed**: Works across multiple Medusa instances  
✅ **Persistent**: Survives server restarts  
✅ **Accurate**: Sliding window prevents burst attacks  
✅ **Configurable**: Centralized rate limit definitions  
✅ **Observable**: Rich logging and headers  
✅ **Safe**: In-memory fallback on Redis failures  
✅ **Flexible**: Supports CIDR ranges, whitelists, custom policies  

## Security Considerations

1. **Admin Whitelist**: Only use for trusted internal IPs
2. **CIDR Validation**: Properly validated before matching
3. **Header Injection**: Prevents X-Forwarded-For spoofing issues
4. **Fail-Open**: Logging ensures visibility even if rate limiting fails
5. **Rate Limit by User**: Prevents collateral blocking when shared IPs

## Performance

- Lua script executes atomically in Redis (~0.1ms)
- Single round-trip per request
- Automatic connection pooling via ioredis
- TTL prevents memory bloat