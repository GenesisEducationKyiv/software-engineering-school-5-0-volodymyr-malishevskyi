# Overview of the current architecture and the possibility of separation into separate microservices

## 📋 Current Architecture Overview

The application is built on modular monolithic architecture principles with clear boundaries between domains and adherence to SOLID, DDD, and Clean Architecture principles. It uses TSyringe for Dependency Injection and has well-structured modules with corresponding infrastructure layers.

### Current Module Structure:

```
backend/src/
├── modules/
│   ├── weather/                                   # Weather Domain Module
│   │   ├── application/                           # Application Layer
│   │   │   ├── services/                          # Weather Business Logic
│   │   │   └── types/                             # Weather Service Interfaces
│   │   ├── infrastructure/                        # Infrastructure Layer
│   │   │   └── weather-providers/                 # External API Integrations
│   │   │       ├── chain/                         # Chain of Responsibility Pattern
│   │   │       ├── openweather/                   # OpenWeatherMap Provider
│   │   │       ├── weather-api/                   # WeatherAPI Provider
│   │   │       └── cached-weather-provider.ts     # Caching decorator for provider
│   │   └── presentation/                          # HTTP Controllers & Routes
│   ├── subscription/                              # Subscription Domain Module
│   │   ├── application/                           # Application Layer
│   │   │   └── services/                          # Subscription Business Logic
│   │   ├── domain/                                # Domain Layer
│   │   │   ├── entities/                          # Domain Entities (Subscription, City)
│   │   │   ├── interfaces/                        # Repository Interfaces
│   │   │   └── errors/                            # Domain-specific Errors
│   │   ├── infrastructure/                        # Infrastructure Layer
│   │   │   └── repository/                        # Prisma Repository Implementation
│   │   └── presentation/                          # HTTP Controllers & Routes
│   └── notification/                              # Notification Domain Module
│       ├── application/                           # Application Layer
│       │   └── services/                          # Notification Business Logic
│       ├── domain/                                # Domain Layer
│       │   ├── interfaces/                        # Service Interfaces
│       │   └── types/                             # Email Types & DTOs
│       └── infrastructure/                        # Infrastructure Layer
│           ├── email/                             # Gmail Integration
│           └── templates/                         # Email Template Service
├── common/                                        # Shared Infrastructure
│   ├── cache/                                     # Multi-provider Cache System (Redis/Memcached/InMemory)
│   ├── metrics/                                   # Prometheus Metrics
│   ├── services/                                  # Cross-cutting Services (BroadcastService)
│   ├── middlewares/                               # HTTP Middlewares
│   ├── logging/                                   # Structured Logging
│   ├── errors/                                    # Error Handling Framework
│   └── interfaces/                                # Shared Interfaces
├── config/                                        # Configuration Management
└── container.ts                                   # TSyringe DI Container Setup
```

### Current Domains and Their Responsibilities:

#### 1. **Weather Domain**

- **Responsibility:** Fetching, caching, and providing weather data with failover mechanism
- **Components:**
  - `WeatherController` - REST API endpoints (`GET /api/weather`, `GET /api/city`)
  - `WeatherService` - business logic for weather operations
  - `WeatherProviderChain` - Chain of Responsibility pattern for provider failover
  - `OpenWeatherMapProvider` & `WeatherApiProvider` - external API integrations
  - `CachedWeatherProvider` - decorator for weather data caching
  - **Dependencies:** `HttpClient`, `CacheProvider`, external API keys

#### 2. **Subscription Domain**

- **Responsibility:** Managing user subscription lifecycle for weather updates
- **Components:**
  - `SubscriptionController` - REST API endpoints (`POST /api/subscriptions`, `GET /api/confirm/:token`, `GET /api/unsubscribe/:token`)
  - `SubscriptionService` - subscription business logic, city validation through Weather Domain
  - `SubscriptionRepository` - Prisma-based repository for subscription persistence
  - Domain entities: `Subscription`, `City` with normalization through geocoding
  - **Dependencies:** `WeatherProvider` (for city validation), `NotificationService`, `PostgreSQL`

#### 3. **Notification Domain**

- **Responsibility:** Centralized sending of all email notification types
- **Components:**
  - `NotificationService` - coordination of different notification types
  - `EmailTemplateService` - HTML email template generation
  - `GmailEmailingService` - SMTP integration through Gmail API
  - **Notification types:** subscription confirmation, subscription confirmed, cancellation, weather broadcasts
  - **Dependencies:** Gmail SMTP credentials

#### 4. **Broadcast Domain** (Cross-cutting Service)

- **Responsibility:** Scheduled mass distribution of weather updates
- **Components:**
  - `BroadcastService` - coordination between all domains for broadcasting
  - **Cron jobs:** daily and hourly broadcasts (node-cron)
  - **Logic:** grouping subscriptions by cities for API call optimization
  - **Dependencies:** `SubscriptionRepository`, `WeatherService`, `NotificationService`

## 🎯 Microservice Extraction Recommendations

### Analysis of Current Inter-service Dependencies:

**Main dependencies between modules:**

- `SubscriptionService` → `WeatherProvider` (city validation through geocoding)
- `SubscriptionService` → `NotificationService` (sending email confirmations)
- `BroadcastService` → `SubscriptionRepository` + `WeatherService` + `NotificationService`
- All services → `CacheProvider`, `MetricsService`, `Logger`

### 1. **Weather Service** 🌤️

#### Justification for extraction:

- ✅ **Independent business logic** - has its own domain area (weather data)
- ✅ **Own external dependencies** - OpenWeatherMap API, WeatherAPI with separate API keys
- ✅ **Separate cache layer** - Redis/Memcached cache exclusively for weather data
- ✅ **Different SLA requirements** - weather retrieval speed is critical for UX
- ✅ **Scalability** - peak load during broadcasts
- ✅ **Fault tolerance** - API provider failures shouldn't affect subscription management
- ✅ **Failover complexity** - complex Chain of Responsibility logic needs isolation

#### Components for extraction:

```typescript
// Weather Microservice
weather-service/
├── src/
│   ├── application/
│   │   ├── services/
│   │   │   └── weather.service.ts
│   │   └── controllers/
│   │       └── weather.controller.ts
│   ├── domain/
│   │   ├── entities/
│   │   │   └── weather.entity.ts
│   │   └── errors/
│   │       └── weather-errors.ts
│   ├── infrastructure/
│   │   ├── providers/
│   │   │   ├── chain/                  # Chain of Responsibility
│   │   │   ├── openweather/           # OpenWeatherMap Integration
│   │   │   ├── weather-api/           # WeatherAPI Integration
│   │   │   └── cached-weather-provider.ts
│   │   ├── cache/                     # Weather-specific caching
│   │   └── http/
│   │       └── http-client.ts
│   ├── config/
│   │   └── weather-config.ts
│   └── container.ts                   # DI Container
├── Dockerfile
└── package.json
```

#### API Interface:

```typescript
// REST Endpoints:
// GET /api/v1/weather/search?query={city}   - city search
// GET /api/v1/weather/current/{cityId}      - current weather
// GET /api/v1/weather/current?city={name}   - weather by city name

// Response DTOs
interface WeatherResponse {
  temperature: number; // Celsius
  humidity: number; // Percentage
  description: string; // Short description
  cityFullName: string; // Normalized city name
}

interface CitySearchResponse {
  cities: Array<{
    id: string; // External provider ID
    name: string; // City name
    region: string; // State/Region
    country: string; // Country name
    lat: number; // Latitude
    lon: number; // Longitude
    fullName: string; // "City, Region, Country"
  }>;
}

// Error responses
interface WeatherErrorResponse {
  error: string;
  code: "WEATHER_SERVICE_UNAVAILABLE" | "CITY_NOT_FOUND" | "INVALID_REQUEST";
  message: string;
}
```

### 2. **Notification Service** 📧

#### Justification for extraction:

- ✅ **Centralized responsibility** - sending all types of email notifications
- ✅ **External integrations** - Gmail SMTP API with separate credentials
- ✅ **Asynchronous nature** - email sending is naturally asynchronous, suitable for event-driven architecture
- ✅ **Rate limiting** - need to manage SMTP limits and retry mechanisms
- ✅ **Security concerns** - isolation of email credentials and sensitive data
- ✅ **Different scaling patterns** - possible email traffic spikes during broadcasts
- ⚠️ **Template management** - requires centralized HTML template management

#### Components for extraction:

```typescript
// Notification Microservice
notification-service/
├── src/
│   ├── application/
│   │   ├── services/
│   │   │   ├── notification.service.ts
│   │   │   ├── email-template.service.ts
│   │   │   └── email-queue.service.ts
│   │   └── controllers/
│   │       └── notification.controller.ts    # For health checks
│   ├── domain/
│   │   ├── types/
│   │   │   └── email-types.ts
│   │   ├── entities/
│   │   │   └── email-notification.entity.ts
│   │   └── interfaces/
│   │       ├── emailing-service.ts
│   │       └── template-service.ts
│   ├── infrastructure/
│   │   ├── email/
│   │   │   ├── gmail-provider.ts
│   │   │   └── smtp-provider.ts
│   │   ├── templates/
│   │   │   ├── weather-update.html
│   │   │   ├── subscription-confirmation.html
│   │   │   └── subscription-confirmed.html
│   │   ├── queues/
│   │   │   └── email-queue.ts              # Redis/RabbitMQ
│   │   └── metrics/
│   │       └── email-metrics.ts
│   ├── config/
│   │   └── notification-config.ts
│   └── container.ts
├── Dockerfile
└── package.json
```

#### API Interface:

```typescript
// Event-driven API (Message Queue)
interface NotificationEvent {
  eventType:
    | "weather.notification"
    | "subscription.confirmation"
    | "subscription.confirmed"
    | "subscription.cancelled";
  correlationId: string;
  timestamp: Date;
  data:
    | WeatherNotificationData
    | SubscriptionConfirmationData
    | SubscriptionConfirmedData
    | SubscriptionCancellationData;
}

// DTOs
interface WeatherNotificationData {
  email: string;
  cityFullName: string;
  temperature: number;
  humidity: number;
  frequency: "daily" | "hourly";
}

interface SubscriptionConfirmationData {
  email: string;
  confirmationUrl: string;
  cityFullName: string;
  frequency: string;
}

// HTTP API for monitoring and management
// GET  /api/v1/notifications/health
// POST /api/v1/notifications/send        # Direct send (for urgent notifications)
// GET  /api/v1/notifications/queue/stats # Queue statistics
```

### 3. **Subscription Service** 📝

#### Justification for extraction:

- ✅ **Own database** - PostgreSQL with Prisma ORM for subscriptions and cities
- ✅ **Complex business logic** - subscription lifecycle (creation → confirmation → active → cancellation)
- ✅ **CRUD operations with different patterns** - may need read optimizations for broadcast queries
- ✅ **Token management** - generation and validation of confirmation/revoke tokens
- ⚠️ **Tight coupling with Weather Service** - critical for city validation through geocoding
- ⚠️ **Event publishing** - needs to send events to Notification Service

#### Components for extraction:

```typescript
// Subscription Microservice
subscription-service/
├── src/
│   ├── application/
│   │   ├── services/
│   │   │   └── subscription.service.ts
│   │   └── controllers/
│   │       └── subscription.controller.ts
│   ├── domain/
│   │   ├── entities/
│   │   │   ├── subscription.entity.ts
│   │   │   └── city.entity.ts
│   │   ├── errors/
│   │   │   └── subscription-domain-errors.ts
│   │   └── interfaces/
│   │       └── subscription.repository.ts
│   ├── infrastructure/
│   │   ├── repositories/
│   │   │   └── prisma-subscription.repository.ts
│   │   ├── database/
│   │   │   ├── migrations/
│   │   │   └── schema.prisma
│   │   ├── events/
│   │   │   └── event-publisher.ts          # Event publishing
│   │   └── clients/
│   │       └── weather-service.client.ts   # HTTP client for Weather Service
│   ├── config/
│   │   └── subscription-config.ts
│   └── container.ts
├── Dockerfile
└── package.json
```

#### API Interface:

```typescript
// Public REST API:
// POST /api/v1/subscriptions              - create subscription
// GET  /api/v1/subscriptions/confirm/:token - confirm subscription
// GET  /api/v1/subscriptions/unsubscribe/:token - cancel subscription

// Internal API for Broadcast Service:
// GET /api/v1/internal/subscriptions/active?frequency=hourly&limit=100&offset=0

// Request/Response DTOs
interface CreateSubscriptionRequest {
  email: string;
  city: string; // City name for geocoding
  frequency: "daily" | "hourly";
}

interface CreateSubscriptionResponse {
  message: string;
  confirmationRequired: boolean;
}

interface ActiveSubscription {
  id: string;
  email: string;
  frequency: "daily" | "hourly";
  city: {
    externalId: string; // Weather provider city ID
    name: string;
    region: string;
    country: string;
    fullName: string; // "City, Region, Country"
    latitude: number;
    longitude: number;
  };
}

// Events published by the service
interface SubscriptionEvent {
  eventType:
    | "subscription.created"
    | "subscription.confirmed"
    | "subscription.cancelled";
  subscriptionId: string;
  email: string;
  data: {
    confirmationUrl?: string;
    unsubscribeUrl?: string;
    cityFullName: string;
    frequency: string;
  };
}
```

### 4. **Broadcast Service** 📡

#### Analysis for extraction:

- ❌ **NOT recommended to extract as separate microservice**
- ❌ **Orchestration service** - coordinates all other services without own business logic
- ❌ **Cron dependency** - tightly coupled with task scheduler
- ❌ **Cross-cutting nature** - no clear domain boundary

#### Recommendation:

**Keep as separate standalone service (Broadcast Orchestrator)** that works with microservices through their APIs.

```typescript
// Standalone Broadcast Orchestrator
broadcast-orchestrator/
├── src/
│   ├── services/
│   │   └── broadcast-orchestrator.service.ts
│   ├── clients/
│   │   ├── weather-service.client.ts
│   │   ├── subscription-service.client.ts
│   │   └── notification-service.client.ts
│   ├── scheduling/
│   │   └── cron-scheduler.ts
│   └── config/
│       └── broadcast-config.ts
├── Dockerfile
└── package.json
```

## 🔗 Inter-service Communication Analysis

### **Synchronous Communication (HTTP REST)**

#### Use cases:

- **Subscription Service → Weather Service**: city validation during subscription creation
- **Broadcast Orchestrator → Weather Service**: current weather retrieval
- **Broadcast Orchestrator → Subscription Service**: active subscriptions query
- **Frontend → all services**: user requests

#### Justification:

- ✅ **Request-response pattern** - synchronous result needed
- ✅ **Data consistency** - current data needed at request time
- ✅ **Error handling** - easier to handle errors synchronously
- ✅ **Existing patterns** - current architecture already uses REST

### **Asynchronous Communication (Event-driven)**

#### Use cases:

- **Subscription Service → Notification Service**: subscription events for email sending
- **Broadcast Orchestrator → Notification Service**: mass weather update broadcasting

#### Justification:

- ✅ **Fire-and-forget nature** - email sending doesn't require synchronous result
- ✅ **Decoupling** - Notification Service failure doesn't block subscription creation
- ✅ **Batch processing** - ability to group emails for optimization
- ✅ **Retry mechanisms** - natural for event-driven architecture
- ✅ **Scalability** - async processing allows better scaling

#### Technical stack for asynchronous communication:

```typescript
// Using Redis as Message Broker
interface MessageBroker {
  publish(topic: string, event: any): Promise<void>;
  subscribe(topic: string, handler: (event: any) => Promise<void>): void;
}

// Alternatives: RabbitMQ, Apache Kafka (for larger volumes)
```

## **Shared Infrastructure**

### Components for shared usage:

```typescript
// @weather-app/shared-lib
├── cache/                    # Multi-provider cache (Redis/Memcached/InMemory)
│   ├── providers/
│   ├── factory.ts
│   └── instrumented-cache.ts # Metrics instrumentation
├── metrics/                  # Prometheus metrics
│   ├── metrics.service.ts
│   └── common-metrics.ts
├── logging/                  # Structured logging
│   ├── logger.ts
│   └── correlation-id.ts
├── http-client/             # HTTP client with retry/circuit breaker
│   ├── resilient-http-client.ts
│   └── interceptors/
├── error-handling/          # Standardized error handling
│   ├── base-errors.ts
│   ├── error-codes.ts
│   └── error-middleware.ts
├── events/                  # Event publishing/subscribing
│   ├── event-bus.ts
│   └── redis-event-bus.ts
└── config/                  # Configuration management
    ├── config-factory.ts
    └── validation.ts
```

#### Justification for shared library:

- ✅ **Cross-cutting concerns** - used by all services
- ✅ **Consistency** - uniform behavior of caching, logging, metrics
- ✅ **Maintenance efficiency** - centralized infrastructure code updates
- ✅ **Reusability** - ability to use in new services

## 📊 Benefits of Proposed Microservices Architecture

### Technical Benefits:

#### 🚀 **Independent Deployment**

- Each service can be updated and deployed independently
- Lower risks during releases
- Faster development cycles

#### 📈 **Horizontal Scalability**

- Weather Service can have more instances during peak load
- Notification Service can scale based on email volume
- Different resource requirements for different services

#### 🛡️ **Fault Isolation**

- Weather API failure won't affect subscription management
- Email provider issues won't block weather retrieval
- Better overall availability

#### 🔧 **Technology Diversity**

- Ability to use different technologies for different tasks
- Weather Service could use GraphQL
- Notification Service could use event-driven architecture

### Business Benefits:

#### 👥 **Team Ownership**

- Different teams can own different services
- Clear responsibility boundaries
- Fewer code conflicts

#### ⚡ **Development Speed**

- Parallel feature development
- Smaller codebases for understanding
- Faster builds and tests

#### 💰 **Resource Optimization**

- Different CPU/Memory/Network needs for different services
- Ability to use different instance types
- Better cost-efficiency
