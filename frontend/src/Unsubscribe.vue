<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import api from "./api";

const route = useRoute();
const router = useRouter();

const tokenFromRoute = route.params.token;

const loading = ref(true);
const message = ref("");
const messageType = ref<"success" | "error" | "info">("info");

const processUnsubscribe = async (token: string) => {
  loading.value = true;
  message.value = "Processing your unsubscription request...";
  messageType.value = "info";

  try {
    const response = await api.unsubscribe(token);
    const data = await response.json();

    if (response.ok) {
      message.value =
        data.message || "You have been unsubscribed successfully!";
      messageType.value = "success";
    } else {
      if (response.status === 404) {
        message.value = "Subscription not found or already unsubscribed.";
      } else if (response.status === 400) {
        message.value = data.message || "Invalid unsubscription token.";
      } else {
        message.value =
          data.message || "An error occurred during unsubscription.";
      }
      messageType.value = "error";
    }
  } catch (err: any) {
    console.error("Unsubscription failed:", err);
    message.value =
      "An unexpected error occurred. Please try again or contact support.";
    messageType.value = "error";
  } finally {
    setTimeout(() => {
      loading.value = false;
    }, 300);
  }
};

onMounted(() => {
  if (!tokenFromRoute || Array.isArray(tokenFromRoute)) {
    message.value = "Invalid or missing unsubscription token.";
    messageType.value = "error";
    loading.value = false;
    setTimeout(() => {
      router.push({ name: "Weather" });
    }, 3000);
  } else {
    processUnsubscribe(tokenFromRoute);
  }
});
</script>

<template>
  <div class="unsubscribe-container">
    <div class="unsubscribe-card">
      <template v-if="loading">
        <div class="spinner"></div>
        <h1 class="status-message info">Processing Unsubscription...</h1>
        <p>Please wait while we process your request.</p>
      </template>
      <template v-else>
        <div v-if="messageType === 'success'" class="icon success-icon">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            width="64"
            height="64"
          >
            <path
              d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
            />
          </svg>
        </div>
        <div v-else-if="messageType === 'error'" class="icon error-icon">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            width="64"
            height="64"
          >
            <path
              d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"
            />
          </svg>
        </div>
        <h1 :class="['status-message', messageType]">
          {{
            messageType === "success"
              ? "Unsubscribed!"
              : messageType === "error"
              ? "Error!"
              : "Status"
          }}
        </h1>
        <p :class="['message-details', messageType]">{{ message }}</p>
        <router-link to="/" class="action-button"
          >Go to Weather Page</router-link
        >
      </template>
    </div>
  </div>
</template>

<style scoped>
.unsubscribe-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 20px;
  font-family: "Arial", sans-serif;
  background-color: #f0f4f8;
}

.unsubscribe-card {
  background-color: #ffffff;
  padding: 40px;
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 550px;
  text-align: center;
}

.spinner {
  width: 60px;
  height: 60px;
  border: 8px solid #e0e0e0;
  border-top: 8px solid #007bff;
  border-radius: 50%;
  animation: spin 1.5s linear infinite;
  margin: 0 auto 25px auto;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.icon {
  margin-bottom: 20px;
}

.success-icon svg {
  color: #28a745;
}

.error-icon svg {
  color: #dc3545;
}

.status-message {
  font-size: 2em;
  margin-bottom: 10px;
  font-weight: bold;
}

.status-message.info {
  color: #007bff; /* Blue */
}
.status-message.success {
  color: #28a745;
}
.status-message.error {
  color: #dc3545;
}

.message-details {
  font-size: 1.1em;
  color: #555;
  margin-bottom: 30px;
  line-height: 1.6;
}
.message-details.success {
  color: #155724;
}
.message-details.error {
  color: #721c24;
}

.action-button {
  display: inline-block;
  padding: 12px 25px;
  background-color: #007bff;
  color: white;
  text-decoration: none;
  border-radius: 8px;
  font-size: 1em;
  transition: background-color 0.3s ease;
  border: none;
  cursor: pointer;
}

.action-button:hover {
  background-color: #0056b3;
}
</style>
