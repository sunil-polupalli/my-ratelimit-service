# Scalable API Rate Limiting Microservice

A high-performance, distributed microservice designed to act as a gatekeeper for API endpoints. It enforces strict rate limits based on client identifiers and request paths to protect upstream services from abuse, ensure fair usage, and maintain overall system stability. Built with Node.js, Express, MongoDB, and Redis, the service is fully containerized and features an automated CI/CD pipeline.

## Features

* **Distributed Rate Limiting:** Enforces limits accurately across multiple instances using Redis.
* **Token Bucket Algorithm:** efficiently handles traffic bursts while maintaining steady request flow.
* **Client Management:** Secure registration and storage of API clients via MongoDB.
* **Dockerized Infrastructure:** Multi-stage builds and seamless orchestration via Docker Compose.
* **Automated CI/CD:** GitHub Actions workflow for automated testing and image deployment.

## Prerequisites

* Docker
* Docker Compose

## Setup Instructions

1. Clone the repository to your local machine.
2. Create a `.env` file in the root directory and configure it based on `.env.example`.
3. Start the application and its database dependencies using Docker Compose:

```bash
docker-compose up --build -d
```

The service will be available at `http://localhost:3000`. The MongoDB instance is automatically seeded with three test clients upon initialization.

## Environment Variables

The application requires the following environment variables:

* `PORT`: The port on which the Express server listens.
* `DATABASE_URL`: The MongoDB connection string.
* `REDIS_URL`: The Redis connection string.
* `DEFAULT_RATE_LIMIT_MAX_REQUESTS`: The default token bucket capacity.
* `DEFAULT_RATE_LIMIT_WINDOW_SECONDS`: The default time window for token replenishment.

## Running Tests

Automated tests are executed within the Docker container. Ensure the containers are running before executing the test commands.

**Run Unit Tests:**
```bash
docker-compose exec app npm test -- tests/unit
```

**Run Integration Tests:**
```bash
docker-compose exec app npm test -- tests/integration
```

## API Documentation

### 1. Register Client

Registers a new API client and provisions their specific rate-limiting configuration.

* **Endpoint:** `POST /api/v1/clients`
* **Content-Type:** `application/json`

**Request Body:**
```json
{
  "clientId": "prod-gateway-01",
  "apiKey": "secure-api-key-string",
  "maxRequests": 500,
  "windowSeconds": 60
}
```

**Response (201 Created):**
```json
{
  "clientId": "prod-gateway-01",
  "maxRequests": 500,
  "windowSeconds": 60
}
```

**Error Responses:**
* `400 Bad Request`: Missing required fields.
* `409 Conflict`: Client ID already exists.

### 2. Check Rate Limit

Evaluates whether a specific request is allowed based on the client's configured rate limits.

* **Endpoint:** `POST /api/v1/ratelimit/check`
* **Content-Type:** `application/json`

**Request Body:**
```json
{
  "clientId": "prod-gateway-01",
  "path": "/api/v1/payments"
}
```

**Response (200 OK - Request Allowed):**
```json
{
  "allowed": true,
  "remainingRequests": 499,
  "resetTime": "2026-03-22T10:00:01.000Z"
}
```

**Response (429 Too Many Requests - Request Blocked):**
```json
{
  "allowed": false,
  "retryAfter": 12,
  "resetTime": "2026-03-22T10:00:13.000Z"
}
```

---

### **ARCHITECTURE.md**

# Architectural Decisions and Design

This document outlines the core architectural choices, data storage strategies, and algorithm selection for the API Rate Limiting Microservice.

## System Overview

The microservice operates as an independent infrastructure component. Upstream services (such as an API Gateway) call this service to verify if an incoming request should be processed or rejected. The architecture ensures high throughput, low latency, and horizontally scalable state management.

## Rate Limiting Algorithm: Token Bucket

The **Token Bucket** algorithm was selected to govern the rate-limiting logic. 

### Rationale
1. **Burst Tolerance:** Unlike fixed-window counters that strictly reject traffic over a set limit, Token Bucket allows for sudden bursts of traffic up to the maximum capacity of the bucket. This mirrors real-world API usage where client requests frequently arrive in localized batches.
2. **Smooth Replenishment:** Tokens are calculated and replenished at a steady, fractional rate based on the elapsed time since the last request. This prevents the "stampeding herd" problem commonly seen at the reset boundary of fixed-window algorithms.
3. **Computational Efficiency:** The algorithm is mathematically evaluated on demand. The system only stores the remaining token count and the timestamp of the last evaluation. It calculates the accrued tokens retroactively at the moment a new request arrives, eliminating the need for constant background processing or polling timers.

## Data Storage Strategy

To meet the requirements of distributed architecture and separation of concerns, the storage layer is split into two distinct technologies.

### 1. In-Memory Distributed State (Redis)
Redis is utilized as the primary engine for tracking rate-limiting state.

**Rationale:**
* **Microsecond Latency:** Rate limit checks block the critical path of the main API response. Redis operates entirely in-memory, providing the required high-speed read/write operations.
* **Distributed Concurrency:** If the microservice scales to multiple instances, storing state in local application memory would result in fractured, inaccurate rate limits. Redis acts as a centralized source of truth, ensuring the Token Bucket state is globally consistent across all instances.
* **Atomic Operations:** Redis supports atomic operations, preventing race conditions when multiple concurrent requests attempt to decrement tokens for the same `clientId` simultaneously.

### 2. Persistent Configuration Storage (MongoDB)
MongoDB is utilized as the persistent data store for API client configurations, including unique identifiers, hashed credentials, and specific bucket limits.

**Rationale:**
* **Read-Optimized Document Storage:** Client configuration is a read-heavy workload. MongoDB's document model allows for rapid retrieval of client limits without complex table joins.
* **Flexible Schema:** The NoSQL structure provides flexibility if client configurations need to expand in the future (e.g., adding tiered subscription limits or IP-based rules).
* **Reliability:** Unlike Redis, which handles volatile TTL-based data, MongoDB ensures the secure, long-term persistence of client registration data.

## Deployment Architecture

The entire stack is containerized using Docker. 

1. **Multi-Stage Builds:** The Node.js application utilizes a multi-stage Dockerfile. Dependencies are installed in a builder stage, and only the compiled runtime files are transferred to the final Alpine image, reducing surface area and image size.
2. **Orchestration:** Docker Compose defines the topology, linking the Node.js application to the isolated Redis and MongoDB network layers.
3. **Health Checks:** Strict dependency conditions are configured in the orchestration layer, ensuring the Express server does not accept traffic until both database connections are fully established and verified.
