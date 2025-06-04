<script setup lang="ts">
import { nextTick, ref } from "vue";
import api from "./api";

type WeatherData = {
  city: string;
  temperature: number;
  humidity: number;
  description: string;
};

const city = ref<string>("");
const weather = ref<WeatherData | null>(null);
const loading = ref<boolean>(false);
const error = ref<string | null>(null);

const showSubscriptionModal = ref<boolean>(false);
const subscriptionEmail = ref<string>("");
const subscriptionFrequency = ref<"hourly" | "daily">("daily");
const subscriptionLoading = ref<boolean>(false);
const subscriptionError = ref<string | null>(null);
const subscriptionSuccessMessage = ref<string | null>(null);
const subscriptionCompletedSuccessfully = ref<boolean>(false);
const emailInputRef = ref<HTMLInputElement | null>(null);

const fetchWeather = async () => {
  const cityName = city.value.trim();
  weather.value = null;

  if (!cityName) {
    error.value = "Please enter a city name.";
    return;
  }

  loading.value = true;
  error.value = null;

  try {
    const response = await api.getWeatherByCity(cityName);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        message: `Error fetching weather: ${response.statusText}`,
      }));
      throw new Error(
        errorData.message || `Error fetching weather: ${response.statusText}`
      );
    }
    const data = await response.json();
    weather.value = {
      city: cityName,
      temperature: data.temperature,
      humidity: data.humidity,
      description: data.description,
    };
  } catch (err: any) {
    console.error("Failed to fetch weather:", err);
    error.value =
      err.message || "Failed to fetch weather data. Please try again.";
  } finally {
    loading.value = false;
  }
};

const openSubscriptionModal = async () => {
  if (weather.value?.city) {
    subscriptionEmail.value = "";
    subscriptionFrequency.value = "daily";
    subscriptionError.value = null;
    subscriptionSuccessMessage.value = null;
    subscriptionCompletedSuccessfully.value = false;
    showSubscriptionModal.value = true;
    await nextTick();
    emailInputRef.value?.focus();
  } else {
    error.value = "Please search for a city's weather first to subscribe.";
  }
};

const closeSubscriptionModal = () => {
  showSubscriptionModal.value = false;
  subscriptionCompletedSuccessfully.value = false;
  subscriptionSuccessMessage.value = null;
  subscriptionError.value = null;
  subscriptionEmail.value = "";
  subscriptionFrequency.value = "daily";
};

const handleSubscription = async () => {
  const currentCity = weather.value?.city;
  if (!subscriptionEmail.value.trim() || !currentCity) {
    subscriptionError.value = "Email and city are required for subscription.";
    return;
  }

  if (!/\S+@\S+\.\S+/.test(subscriptionEmail.value)) {
    subscriptionError.value = "Please enter a valid email address.";
    return;
  }

  subscriptionLoading.value = true;
  subscriptionError.value = null;
  subscriptionSuccessMessage.value = null;
  subscriptionCompletedSuccessfully.value = false;

  try {
    const response = await api.subscribe(
      subscriptionEmail.value.trim(),
      currentCity,
      subscriptionFrequency.value
    );

    const data = await response.json();

    if (response.ok) {
      subscriptionSuccessMessage.value =
        data.message ||
        "Subscription successful! Please check your email to confirm.";
      subscriptionCompletedSuccessfully.value = true;
    } else {
      subscriptionError.value =
        data.message ||
        `Subscription failed: ${response.statusText} (${response.status})`;
      subscriptionCompletedSuccessfully.value = false;
    }
  } catch (err: any) {
    console.error("Subscription failed:", err);
    subscriptionError.value =
      err.message || "An unexpected error occurred during subscription.";
    subscriptionCompletedSuccessfully.value = false;
  } finally {
    subscriptionLoading.value = false;
  }
};
</script>

<template>
  <div class="weather-container">
    <div class="search-card">
      <h1>Weather Search</h1>
      <div class="search-bar">
        <input
          type="text"
          placeholder="Enter city name"
          v-model="city"
          @keydown.enter="fetchWeather"
          aria-label="City name for weather search"
        />
        <button
          @click="fetchWeather"
          :disabled="loading"
          aria-label="Search weather"
        >
          {{ loading ? "Searching..." : "Search" }}
        </button>
      </div>
      <p v-if="error && !showSubscriptionModal" class="error-message">
        {{ error }}
      </p>
    </div>

    <div v-if="loading && !weather" class="loading-indicator">
      <p>Loading weather data...</p>
    </div>

    <div v-if="weather" class="weather-results-card">
      <h2>Weather in {{ weather.city }}</h2>
      <div class="weather-info">
        <div class="info-item">
          <span class="label">Temperature:</span>
          <span class="value">{{ weather.temperature }}°C</span>
        </div>
        <div class="info-item">
          <span class="label">Humidity:</span>
          <span class="value">{{ weather.humidity }}%</span>
        </div>
        <div class="info-item">
          <span class="label">Conditions:</span>
          <span class="value">{{ weather.description }}</span>
        </div>
      </div>
      <button @click="openSubscriptionModal" class="subscribe-button">
        Subscribe to Updates
      </button>
    </div>

    <!-- Subscription Modal -->
    <div
      v-if="showSubscriptionModal"
      class="modal-overlay"
      @click.self="closeSubscriptionModal"
    >
      <div class="modal-content">
        <template v-if="subscriptionCompletedSuccessfully">
          <div class="success-icon-modal">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              width="48"
              height="48"
            >
              <path
                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
              />
            </svg>
          </div>
          <h3>Subscription Request Sent!</h3>
          <p class="success-message modal-success centered-text">
            {{ subscriptionSuccessMessage }}
          </p>
          <div class="modal-actions single-action">
            <button
              type="button"
              @click="closeSubscriptionModal"
              class="button-primary"
            >
              Close
            </button>
          </div>
        </template>
        <template v-else>
          <h3>Subscribe for {{ weather?.city }}</h3>
          <form @submit.prevent="handleSubscription">
            <div class="form-group">
              <label for="email">Email:</label>
              <input
                type="email"
                id="email"
                v-model="subscriptionEmail"
                required
                placeholder="your@email.com"
                ref="emailInputRef"
              />
            </div>
            <div class="form-group">
              <label for="frequency">Frequency:</label>
              <select id="frequency" v-model="subscriptionFrequency">
                <option value="daily">Daily</option>
                <option value="hourly">Hourly</option>
              </select>
            </div>
            <p v-if="subscriptionError" class="error-message modal-error">
              {{ subscriptionError }}
            </p>
            <div class="modal-actions">
              <button
                type="button"
                @click="closeSubscriptionModal"
                class="button-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                :disabled="subscriptionLoading"
                class="button-primary"
              >
                {{ subscriptionLoading ? "Subscribing..." : "Subscribe" }}
              </button>
            </div>
          </form>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.weather-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 20px;
  font-family: "Arial", sans-serif;
  background-color: #f0f4f8;
}

.search-card,
.weather-results-card {
  background-color: #ffffff;
  padding: 30px;
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 500px;
  text-align: center;
  margin-bottom: 25px;
}

.search-card h1 {
  color: #333;
  margin-bottom: 25px;
  font-size: 2em;
}

.search-bar {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}

.search-bar input[type="text"] {
  flex-grow: 1;
  padding: 12px 15px;
  border: 1px solid #ccc;
  border-radius: 8px;
  font-size: 1em;
  transition: border-color 0.3s ease;
}

.search-bar input[type="text"]:focus {
  border-color: #007bff;
  outline: none;
}

.search-bar button {
  padding: 12px 20px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1em;
  transition: background-color 0.3s ease;
}

.search-bar button:hover:not(:disabled) {
  background-color: #0056b3;
}

.search-bar button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.error-message {
  color: #d9534f;
  margin-top: 15px;
  font-size: 0.9em;
}

.loading-indicator p {
  font-size: 1.1em;
  color: #555;
}

.weather-results-card h2 {
  color: #333;
  margin-bottom: 20px;
  font-size: 1.8em;
  border-bottom: 2px solid #007bff;
  padding-bottom: 10px;
  display: inline-block;
}

.weather-info {
  display: flex;
  flex-direction: column;
  gap: 15px;
  text-align: left;
  margin-bottom: 20px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  padding: 10px;
  background-color: #f9f9f9;
  border-radius: 6px;
  border-left: 4px solid #007bff;
}

.info-item .label {
  font-weight: bold;
  color: #555;
  margin-right: 10px;
}

.info-item .value {
  color: #333;
  font-size: 1.1em;
}

.subscribe-button {
  padding: 10px 20px;
  background-color: #28a745;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1em;
  transition: background-color 0.3s ease;
  margin-top: 15px;
}

.subscribe-button:hover {
  background-color: #218838;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background-color: #fff;
  padding: 30px;
  border-radius: 12px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
  width: 100%;
  max-width: 450px;
  text-align: left;
}

.modal-content h3 {
  text-align: center;
  margin-bottom: 25px;
  color: #333;
  font-size: 1.6em;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: bold;
  color: #555;
}

.form-group input[type="email"],
.form-group select {
  width: 100%;
  padding: 12px 15px;
  border: 1px solid #ccc;
  border-radius: 8px;
  font-size: 1em;
  box-sizing: border-box;
}

.form-group input[type="email"]:focus,
.form-group select:focus {
  border-color: #007bff;
  outline: none;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 25px;
}
.modal-actions.single-action {
  justify-content: center;
}

.button-primary,
.button-secondary {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1em;
  transition: background-color 0.3s ease, opacity 0.3s ease;
}

.button-primary {
  background-color: #007bff;
  color: white;
}
.button-primary:hover:not(:disabled) {
  background-color: #0056b3;
}
.button-primary:disabled {
  background-color: #cccccc;
  opacity: 0.7;
  cursor: not-allowed;
}

.button-secondary {
  background-color: #6c757d;
  color: white;
}
.button-secondary:hover {
  background-color: #545b62;
}

.modal-error,
.modal-success {
  margin-top: 15px;
  padding: 10px;
  border-radius: 6px;
  font-size: 0.9em;
  text-align: center;
}
.modal-error {
  color: #721c24;
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
}
.modal-success {
  color: #155724;
  background-color: #d4edda;
  border: 1px solid #c3e6cb;
}

.success-icon-modal {
  text-align: center;
  margin-bottom: 15px;
}
.success-icon-modal svg {
  color: #28a745;
}
.centered-text {
  text-align: center;
}
</style>
