## ADR-003: Weather Service Provider Selection

**Status:** Accepted

**Date:** May 18, 2025

**Authors:** Volodymyr Malishevskyi

---

### Context

The application's core functionality is to provide weather information and send notifications based on weather changes. This requires a reliable external API to source current weather data and to perform city lookups (geocoding or search functionality) to standardize city names.

Key requirements for the Weather API service include:

- **Accuracy and Reliability:** The weather data provided must be reasonably accurate and the service should have high uptime.
- **API Features:** Must provide current weather conditions. A city search or geocoding feature is essential for normalizing city inputs (as implemented in [`backend/src/common/services/weather-api/weather-api.ts`](../../backend/src/common/services/weather-api/weather-api.ts)).
- **Ease of Integration:** The API should be well-documented, with a straightforward request/response format (preferably JSON).
- **Rate Limits & Quotas:** The service needs to offer a free or affordable tier suitable for development, testing, and potentially small-scale production, with clear information on usage limits.
- **Cost-Effectiveness:** Overall cost, especially if scaling beyond a free tier, is a consideration.

---

### Decision

**We have decided to use WeatherAPI.com as the external weather data provider.**

This service is currently integrated via the `WeatherApiService` located at [`backend/src/common/services/weather-api/weather-api.ts`](../../backend/src/common/services/weather-api/weather-api.ts) and configured in [`backend/src/config.ts`](../../backend/src/config.ts).

---

### Alternatives Considered

1.  **OpenWeatherMap API:**

    - **Pros:**
      - Widely used with a large community.
      - Offers a comprehensive free tier that includes current weather, forecasts, and geocoding.
      - Extensive API documentation.
    - **Cons:**
      - The free tier has request-per-minute limitations that might be restrictive for rapid scaling without a paid plan.
      - API response structures can sometimes be more nested or complex compared to simpler alternatives.

2.  **AccuWeather API:**

    - **Pros:**
      - Reputation for high accuracy in weather forecasting and current conditions.
      - Provides a wide range of detailed weather parameters.
    - **Cons:**
      - The free access or trial tier is often very limited, making it less suitable for initial development or small projects without immediate budget.
      - Can be more expensive than other options when moving to paid plans.
      - API key acquisition and integration can sometimes be more involved.

3.  **Weatherstack API:**
    - **Pros:**
      - Offers real-time, historical, and forecast weather data.
      - Has a free plan for basic use.
      - Relatively simple API structure.
    - **Cons:**
      - The free plan is quite restrictive (e.g., limited request volume, HTTPS access might be a paid feature).
      - Some user reviews mention concerns about data consistency or update frequency on the free tier.

---

### Rationale

WeatherAPI.com was chosen primarily due to its balance of features, ease of use, and a sufficiently generous free tier for the project's initial development and demonstration scope:

- **Sufficient Free Tier:** WeatherAPI.com offers a free plan that includes the necessary features (current weather, city search/geocoding) with reasonable request limits for a project of this scale. This is evident from the project's current usage which relies on an API key (see `WEATHER_API_KEY` in [`README.md`](../../README.md) and [`backend/src/config.ts`](../../backend/src/config.ts)).
- **Required Features:** It provides both current weather data and a search/lookup API endpoint (`/v1/search.json` used in `searchCity` method in [`backend/src/common/services/weather-api/weather-api.ts`](../../backend/src/common/services/weather-api/weather-api.ts)) which is crucial for the application's requirement to normalize city names and avoid duplicate data, as highlighted in the `README.md`.
- **Ease of Integration:** The API is straightforward, returns JSON responses, and was simple to integrate, as demonstrated by the existing `WeatherApiService` ([`backend/src/common/services/weather-api/weather-api.ts`](../../backend/src/common/services/weather-api/weather-api.ts)). The base URL is configured as `https://api.weatherapi.com`.
- **Developer Experience:** Clear documentation and a simple API structure contribute to a positive developer experience for fetching weather data.

While OpenWeatherMap is a strong contender, WeatherAPI.com was perceived as slightly more straightforward for the specific needs of city lookup and current weather data within its free tier at the time of initial development. AccuWeather was deemed potentially too restrictive or costly for a project not requiring its premium accuracy levels from the outset. Weatherstack's free tier limitations were a concern.

---

### Consequences

- **Positive:**
  - **Cost-Effective Start:** No initial costs for API access, allowing for development and deployment without immediate financial commitment.
  - **Rapid Implementation:** The simplicity of the API allowed for quick integration of weather fetching and city lookup functionalities.
  - **Meets Core Requirements:** The API provides the necessary data points (temperature, humidity, condition, city name normalization) for the application's features.
- **Negative:**
  - **Free Tier Limitations:** If the application scales significantly, the request limits of the free tier might be exceeded, requiring an upgrade to a paid plan.
  - **Data Accuracy/Reliability:** Free weather APIs might not offer the same level of accuracy, granularity, or uptime guarantees as premium, paid services. This is an accepted trade-off for the initial phase.
  - **Dependency on External Service:** The application's functionality is dependent on the availability and terms of service of WeatherAPI.com. Any changes or outages on their end can impact the application.

---
