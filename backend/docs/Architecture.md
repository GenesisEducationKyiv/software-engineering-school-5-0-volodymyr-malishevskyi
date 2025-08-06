```mermaid
---
config:
  theme: redux-dark
  layout: elk
---
flowchart TD
    %% External Layer
    subgraph EL["External Layer"]
        Request[HTTP Request]
        Cron[Cron Jobs]
        OpenWeatherMap[OpenWeatherMap.com]
        WeatherApiCom[WeatherApi.com]
    end

    %% Presentation Layer
    subgraph PL["Presentation Layer"]
        WeatherRouter[WeatherRouter]
        SubscriptionRouter[SubscriptionRouter]
        WeatherController[WeatherController]
        SubscriptionController[SubscriptionController]
    end

    %% Application Layer
    subgraph AL["Application Layer"]
        BroadcastService[BroadcastService]
        WeatherService[WeatherService]
        SubscriptionService[SubscriptionService]
        NotificationService[NotificationService]
        EmailTemplateService[EmailTemplateService]
    end

    %% Business Layer
    subgraph DL["Domain Layer"]
        Subscription
    end

    %% Infrastructure Layer
    subgraph IL["Infrastructure Layer"]
        InstrumentedWeatherProvider[InstrumentedWeatherProvider]
        CachedWeatherProvider[CachedWeatherProvider]
        WeatherApiProvider[WeatherApiProvider]
        OpenWeatherMapProvider[OpenWeatherMapProvider]
        SubscriptionRepository[SubscriptionRepository]
        GmailEmailingService[GmailEmailingService]
    end

    %% Data Layer
    subgraph DBL["Data Layer"]
        Redis[(Redis Cache)]
        PostgreSQL[(PostgreSQL Database)]
    end

    %% External connections
    Request --> WeatherRouter
    Request --> SubscriptionRouter
    Cron --> BroadcastService

    %% Weather flow
    WeatherRouter --> WeatherController
    WeatherController --> WeatherService
    WeatherService --> InstrumentedWeatherProvider
    InstrumentedWeatherProvider --> CachedWeatherProvider
    CachedWeatherProvider --> WeatherApiProvider
    CachedWeatherProvider --> OpenWeatherMapProvider
    WeatherApiProvider --> OpenWeatherMap
    OpenWeatherMapProvider --> WeatherApiCom
    CachedWeatherProvider --> Redis

    %% Subscription flow
    SubscriptionRouter --> SubscriptionController
    SubscriptionController --> SubscriptionService
    SubscriptionService --> SubscriptionRepository
    SubscriptionService --> CachedWeatherProvider
    SubscriptionService --> NotificationService
    SubscriptionService --> Subscription
    SubscriptionRepository --> PostgreSQL

    %% Broadcast flow
    BroadcastService --> WeatherService
    BroadcastService --> SubscriptionRepository
    BroadcastService --> NotificationService

    %% Notification flow
    NotificationService --> EmailTemplateService
    NotificationService --> GmailEmailingService

    PL ~~~ AL ~~~ DL ~~~ IL ~~~ DBL ~~~ EL
```
