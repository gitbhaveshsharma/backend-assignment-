# FarmLokal Backend

A hyperlocal marketplace backend that connects households with local farmers. Built with Node.js, TypeScript, MySQL, and Redis.

## 🚀 Quick Start

### Prerequisites

- Node.js (v18+)
- MySQL Database
- Redis Server

### Installation

```bash
# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your database credentials

# Seed the database
npm run seed

# Start development server
npm run dev
```

### Available Scripts

```bash
npm run dev      # Start dev server with hot reload
npm run build    # Build for production
npm start        # Start production server
npm run seed     # Seed database with products
```

## 📁 Project Structure

```
src/
├── config/         # Configuration files
├── db/             # Database connections (MySQL, Redis)
├── middleware/     # Express middlewares
│   ├── rateLimiter.ts
│   ├── circuitBreaker.ts
│   └── errorHandler.ts
├── routes/         # API route handlers
├── services/       # Business logic layer
├── types/          # TypeScript interfaces
├── utils/          # Utility functions
├── scripts/        # Database seeding scripts
├── app.ts          # Express app setup
└── index.ts        # Server entry point
```

## 🏗️ Architecture Overview

### System Design

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Client    │───▶│  Rate       │───▶│   Express   │
│   Request   │    │  Limiter    │    │   Routes    │
└─────────────┘    └─────────────┘    └─────────────┘
                                            │
                   ┌────────────────────────┼────────────────────────┐
                   │                        │                        │
                   ▼                        ▼                        ▼
            ┌─────────────┐         ┌─────────────┐         ┌─────────────┐
            │  Product    │         │   OAuth     │         │  External   │
            │  Service    │         │  Service    │         │  API Svc    │
            └─────────────┘         └─────────────┘         └─────────────┘
                   │                        │                        │
                   │                        │                        │
                   ▼                        ▼                        ▼
            ┌─────────────┐         ┌─────────────┐         ┌─────────────┐
            │    Redis    │◀────────│    Redis    │         │  Circuit    │
            │   Cache     │         │   Token     │         │  Breaker    │
            └─────────────┘         └─────────────┘         └─────────────┘
                   │
                   ▼
            ┌─────────────┐
            │   MySQL     │
            │  Database   │
            └─────────────┘
```

## 🔑 API Endpoints

### Products API

```
GET /api/products              # List products (paginated)
GET /api/products/:id          # Get single product
```

Query Parameters:

- `cursor` - Cursor for pagination
- `limit` - Items per page (max 100)
- `sortBy` - Sort field (price, created_at, name)
- `sortOrder` - Sort direction (asc, desc)
- `category` - Filter by category
- `minPrice` - Minimum price filter
- `maxPrice` - Maximum price filter
- `search` - Search in name/description

### Auth API

```
GET /api/auth/token            # Get OAuth token
POST /api/auth/refresh         # Force refresh token
GET /api/auth/status           # Check token status
```

### External API

```
GET /api/external/api-a/:id    # Fetch from external API
POST /api/external/webhook     # Webhook receiver
GET /api/external/circuit-status  # Circuit breaker status
```

### Health & Metrics

```
GET /health                    # Health check
GET /metrics                   # Server metrics
```

## ⚡ Performance Optimizations

### 1. Redis Caching Strategy

- **Product Listings**: Cached for 5 minutes with query-based keys
- **Single Products**: Individual cache per product ID
- **OAuth Tokens**: Cached until near expiry (60s before)

### 2. Database Optimizations

- **Indexes**: Created on category, price, name, created_at
- **Composite Index**: category + price for filtered queries
- **Connection Pooling**: 10 connections with queue management

### 3. Cursor-Based Pagination

- More efficient than offset pagination for large datasets
- Uses (sortField, id) tuple for stable pagination
- No COUNT queries needed (checks hasMore with limit+1)

### 4. Rate Limiting

- Redis-based sliding window rate limiter
- 100 requests per minute per client
- Graceful degradation if Redis fails

### 5. Circuit Breaker

- Prevents cascade failures with external APIs
- States: CLOSED → OPEN → HALF_OPEN
- Auto-recovery after timeout period

## 🔐 Caching Strategy

### Cache Invalidation

| Scenario       | Action                                        |
| -------------- | --------------------------------------------- |
| Product Update | Delete single product cache + list caches     |
| New Product    | Invalidate all list caches                    |
| Cache Miss     | Fetch from DB, cache result                   |
| Cache TTL      | 5 minutes for products, 59 minutes for tokens |

### Cache Keys

```
products:{base64(filters+pagination)}  # List queries
products:single:{id}                    # Single product
oauth:access_token                      # OAuth token
ratelimit:{clientId}                    # Rate limit counter
webhook:processed_events                # Processed webhook events
```

## 🛡️ Reliability Features

1. **Rate Limiting**: Prevents API abuse
2. **Circuit Breaker**: Handles external API failures
3. **Retry with Backoff**: Exponential backoff for failed requests
4. **Idempotent Webhooks**: Duplicate event detection via Redis Set
5. **Graceful Degradation**: Service continues if Redis/external API fails
6. **Connection Pooling**: Efficient database connections

## ⚖️ Trade-offs Made

| Decision          | Benefit                     | Trade-off                       |
| ----------------- | --------------------------- | ------------------------------- |
| Cursor pagination | Better performance at scale | Can't jump to specific page     |
| Redis caching     | Faster responses            | Additional infrastructure       |
| 5-min cache TTL   | Good hit rate               | Slight data staleness           |
| Circuit breaker   | Prevents cascade failure    | Some requests fail fast         |
| Rate limiting     | Prevents abuse              | Legitimate users may be limited |

## 🚀 Deployment (Render)

1. Push code to GitHub
2. Create new Web Service on Render
3. Connect GitHub repo
4. Set environment variables:
   - `PORT=3000`
   - `NODE_ENV=production`
   - Database and Redis credentials
5. Deploy!

## 📊 Performance Targets

- **P95 Response Time**: < 200ms (with cache hit)
- **Cache Hit Rate**: > 80% for product listings
- **Throughput**: 100+ requests/second

## 🧪 Testing the API

```bash
# Health check
curl http://localhost:3000/health

# Get products
curl "http://localhost:3000/api/products?limit=10"

# With filters
curl "http://localhost:3000/api/products?category=milk&minPrice=10&maxPrice=100"

# Search
curl "http://localhost:3000/api/products?search=organic"

# Get OAuth token
curl http://localhost:3000/api/auth/token
```

## 📝 Focus Areas

**Most effort spent on:**

1. **Performance** - Caching, indexing, cursor pagination
2. **Reliability** - Circuit breaker, rate limiting, error handling
3. **Clean Code** - Modular structure, typed interfaces, meaningful logs

This project demonstrates understanding of building scalable backend services with proper caching, reliability patterns, and clean architecture.
