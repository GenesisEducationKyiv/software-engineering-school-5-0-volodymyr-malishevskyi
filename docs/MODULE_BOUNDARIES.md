# Module Boundaries Documentation

## Overview

This document defines the clear boundaries between modules and microservices in the Weather API Subscription Service application. The system follows a microservices architecture with well-defined service boundaries and communication protocols.

## Architecture Overview

The application consists of the following main components:

- **Backend Service** (`backend/`) - Main API gateway and subscription management
- **Weather Service** (`weather/`) - Dedicated weather data microservice
- **Frontend** (`frontend/`) - Vue.js client application
- **Infrastructure** - PostgreSQL, Redis, Prometheus

## Service Boundaries

### Backend Service (`backend/`)

**Primary Responsibilities:**
- API Gateway functionality
- Subscription lifecycle management (create, confirm, cancel)
- User notification handling (email confirmations, cancellations)
- Database operations (PostgreSQL with Prisma)
- Scheduled weather broadcasts
- Metrics collection and exposure

**Key Modules:**
- `subscription/` - Subscription domain logic and data persistence
- `notification/` - Email service integration (Gmail SMTP)
- `weather/` - Weather service client integration (HTTP/gRPC)
- `common/` - Shared utilities, caching, logging, metrics

**External Dependencies:**
- PostgreSQL database for subscription persistence
- Weather Service for weather data retrieval
- Gmail SMTP for email notifications
- Redis for caching (optional)

### Weather Service (`weather/`)

**Primary Responsibilities:**
- Weather data aggregation from external providers
- City search and geocoding functionality
- Provider failover management (Chain of Responsibility pattern)
- Weather data caching and optimization
- gRPC and HTTP API endpoints

**Key Modules:**
- `weather/` - Weather business logic and provider orchestration
- `infrastructure/weather-providers/` - External API integrations
  - OpenWeatherMap provider
  - WeatherAPI provider
  - Provider chain with failover
  - Cached weather provider wrapper
- `grpc/` - gRPC server implementation
- `common/` - Shared utilities, caching, logging, metrics

**External Dependencies:**
- WeatherAPI.com external service
- OpenWeatherMap external service
- Redis for caching weather data

## Communication Protocols

### Inter-Service Communication

**Backend → Weather Service:**

1. **gRPC Protocol (Primary)**
   - Service: `weather.WeatherService`
   - Port: `50051`
   - Methods:
     - `GetWeatherByCity(city: string) → WeatherResponse`
     - `SearchCity(query: string) → SearchCityResponse`
   - Configuration: `COMMUNICATION_PROTOCOL=grpc`

2. **HTTP Protocol (Fallback)**
   - Base URL: `http://weather-service:3000`
   - Endpoints:
     - `GET /api/weather?city={city}`
     - `GET /api/v1/weather/search?query={query}`

**Protocol Definition (Protobuf):**
```proto
service WeatherService {
  rpc GetWeatherByCity(WeatherRequest) returns (WeatherResponse);
  rpc SearchCity(SearchCityRequest) returns (SearchCityResponse);
}
```

### Client Communication

**Frontend → Backend:**
- Protocol: HTTP/REST
- Base URL: `http://backend:3000`
- Key endpoints: subscription management, weather queries

## Data Flow Boundaries

### Weather Data Flow
```
External APIs → Weather Service → Backend Service → Frontend
             ↓
           Cache (Redis)
```

### Subscription Data Flow
```
Frontend → Backend Service → Database (PostgreSQL)
                         ↓
                   Email Service (SMTP)
```

## Interface Contracts

### Weather Provider Interface
```typescript
interface IWeatherProvider {
  getWeatherByCity(city: string): Promise<IWeatherResponse>;
  searchCity(city: string): Promise<ICityResponse>;
}
```

**Backend Client Interface:**
```typescript
// backend/src/modules/weather/infrastructure/types/weather.client.ts
interface IWeatherResponse {
  temperature: number;
  humidity: number;
  description: string;
}

type ICityResponse = City[];
```

**Weather Service Interface:**
```typescript
// weather/src/modules/weather/application/types/weather.service.ts
interface IWeatherResponse {
  temperature: number;
  humidity: number; 
  description: string;
}

interface ICityResponse[] // Array of city objects
```

## Deployment Boundaries

### Container Isolation
- **Backend Service**: Port 3000, depends on PostgreSQL and Weather Service
- **Weather Service**: Ports 3000 (HTTP) and 50051 (gRPC), depends on Redis
- **Database**: PostgreSQL on port 5432, isolated data storage
- **Cache**: Redis on port 6379, shared between services
- **Monitoring**: Prometheus on port 9090, metrics collection

### Network Boundaries
- Services communicate via Docker network (`compose.yaml`)
- External access only through defined ports
- Internal service discovery via service names

## Configuration Boundaries

### Environment Separation
**Backend Service Environment:**
```yaml
WEATHER_SERVICE_URL: http://weather-service:3000
WEATHER_SERVICE_GRPC_URL: weather-service:50051
COMMUNICATION_PROTOCOL: grpc
DATABASE_URL: postgresql://...
SMTP_* # Email configuration
```

**Weather Service Environment:**
```yaml
WEATHER_API_KEY: ${WEATHER_API_KEY}
CACHE_TYPE: redis
REDIS_URL: redis://redis:6379
PORT: 3000
GRPC_PORT: 50051
```

## Error Boundaries

### Service-Level Error Handling
- Each service maintains its own error handling and logging
- gRPC errors are translated to appropriate HTTP status codes
- Circuit breaker patterns implemented for external API calls
- Graceful degradation when weather service is unavailable

### Cross-Service Error Propagation
- Weather service errors propagate to backend via gRPC status codes
- Backend translates service errors to appropriate HTTP responses
- Email notification failures don't block subscription operations

## Testing Boundaries

### Service-Level Testing
- **Backend**: Unit, integration, and E2E tests with TestContainers
- **Weather**: Unit and integration tests with provider mocks
- **Cross-Service**: E2E tests via docker-compose setup

### Mock Boundaries
- External weather APIs mocked in weather service tests
- Weather service mocked in backend service tests
- Database operations tested with TestContainers

## Security Boundaries

### Service Isolation
- Services communicate only through defined interfaces
- No direct database access between services
- Credentials isolated per service (weather API keys, SMTP, etc.)

### Data Privacy
- Email addresses stored only in backend service
- Weather data cached temporarily with TTL
- No sensitive data logged in weather service

## Scalability Boundaries

### Independent Scaling
- Weather service can be scaled independently for high weather query load
- Backend service scaling focuses on subscription management
- Cache layer (Redis) shared but can be partitioned if needed

### Resource Allocation
- Weather service: CPU-intensive (API calls, caching)
- Backend service: I/O-intensive (database, email, scheduling)
- Clear separation allows for targeted resource optimization

## Conclusion

The microservices architecture provides clear boundaries between:
- **Weather Service**: Focused on weather data aggregation and caching
- **Backend Service**: Manages subscriptions, notifications, and acts as API gateway
- **Communication**: Well-defined gRPC/HTTP protocols with fallback mechanisms
- **Data**: Isolated storage with appropriate caching strategies
- **Deployment**: Independent containerized services with proper dependency management

These boundaries enable independent development, deployment, and scaling while maintaining system cohesion through well-defined contracts and communication protocols.