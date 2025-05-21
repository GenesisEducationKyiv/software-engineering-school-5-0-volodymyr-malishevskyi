# Weather API Subscription Service

This repository contains a backend implemented according to the [task](https://github.com/mykhailo-hrynko/se-school-5/tree/task-description), which provides the ability to obtain weather information (weatherapi.com), subscribe to weather, as well as a frontend for more visual testing.

## Demo

- [FrontEnd](http://217.78.237.105/)
- [Backend](http://217.78.237.105:3000/api/weather?city=Kyiv)

## Key features:

- The database stores a unified city name, which is obtained by geocoding (via the WeatherAPI resource), which prevents duplicate information and sends weather notifications efficiently - 1 request to the API for one city and notifications to all users who are subscribed to it.
  That is, there cannot be a situation where users subscribe to Kyiv and kyiv and a separate request to the API will be made for each of the city spelling options, which has a positive effect on the API usage quota.
- Modular structure that allows project scaling
- Minimum number of external dependencies

## Table of Contents

1.  [Task Requirements](#task-requirements)
2.  [Technology Stack & Rationale](#technology-stack--rationale)
3.  [Getting Started](#getting-started)
4.  [Environment Variables](#environment-variables)

## Task Requirements

- ✅ The app implemented with `Node.js`, `PHP` or `Golang` using any libraries or frameworks.
- ✅ Migrations to setup initial `PostgreSQL` DB structure.
- ✅ `readme.md` file explainig what was done and how to run the app locally
- ✅ `Dockerfile` and `docker-compose.yml` to run the app with a single `docker compose up` command

### Extras

- ✅ deploy your API to some hosting (e.g., [Render](https://render.com/docs/docker))
- ✅ Create a simple HTML page to initiate the subscription
- Cover the API with functional tests

## Technology Stack & Rationale

### Core Technologies

- **Language:** TypeScript
- **Runtime:** Node.js
- **Web Framework:** Express.js
- **ORM:** Prisma
- **Database:** PostgreSQL
- **Validation:** Zod
- **Email Service:** Nodemailer
- **Task Scheduling:** node-cron
- **Containerization:** Docker, Docker Compose
- **Linting/Formatting:** ESLint, Prettier

### Why This Stack?

The technology stack was chosen to balance development speed, type safety, maintainability, and modern best practices for a Node.js backend.

## Getting Started

### Running with Docker **(Recommended)**

1.  **Clone the repository (if not already done).**

2.  **Set up environment variables:**
    Create a `.env` file in the root directory of the project (`gses-5/`). This file will be used by `compose.yaml`. Refer to the [Environment Variables](#root-folder-env---docker-compose) section.

3.  **Build and start the services:**
    From the root directory of the project (`gses-5/`):

    ```bash
    docker compose up
    ```

    To run in detached mode:

    ```bash
    docker compose up -d
    ```

4.  **To stop the services:**

    ```bash
    docker compose stop
    ```

5.  **To down the services:**
    ```bash
    docker compose down
    ```

### Local Development Setup

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/volodymyr-malishevskyi/gses-5
    cd gses-5/backend
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

3.  **Set up environment variables:**
    Create a `.env` file in the `backend` directory. Populate it based on the [Environment Variables](#backend-folder-env---for-local-development) section or an `.env.example` file if provided.

4.  **Ensure PostgreSQL is running and accessible.**
    You can use a local PostgreSQL installation or a Docker container. Update `DATABASE_URL` in your `.env` file accordingly.

5.  **Apply database migrations:**

    ```bash
    npx prisma migrate dev
    ```

    (If you've changed the output location for Prisma Client, you might need to run `npx prisma generate` first.)

6.  **Run the application in development mode:**

    ```bash
    npm run dev
    ```

    This typically uses `tsc-watch` or `nodemon` for auto-recompilation and server restart on file changes.

7.  **To run a production build locally (after `npm run build`):**
    ```bash
    npm run start
    ```

## Environment Variables

Create a `.env` file in the project's root directory (for Docker Compose) or `backend` directory (for local `npm run dev/start`) with the following variables:

### Backend Folder .ENV - For local development

```sh
PORT=3030

DATABASE_URL=postgresql://postgres:password@localhost:5434/weather?schema=public

# https://www.weatherapi.com/my/
WEATHER_API_KEY=

# The App Url to which the redirect will be made from email
APP_URL=http://localhost:3030

SMTP_FROM=Weather App <noreply@weather.app
SMTP_USER=email@example.com
SMTP_PASSWORD=password

# Cron jobs described in JSON format for subscription types:
# type - cron rule
BROADCAST_CRONS=[["daily", "0 8 * * *"],["hourly", "0 * * * *"]]
```

### Root Folder .ENV - Docker Compose

```sh
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=password
DB_NAME=weather

# https://www.weatherapi.com/my/
WEATHER_API_KEY=

# GOOGLE SMTP Credentials (working with 2FA and App Password)
SMTP_FROM=Weather App <noreply@weather.app>
SMTP_USER=email@example.com
SMTP_PASSWORD=password

# Cron jobs described in JSON format for subscription types:
# type - cron rule
BROADCAST_CRONS=[["daily", "0 0 * * *"],["hourly", "0 * * * *"]]
```

## What can be improved

### Use "data" wrapper in API response for better backward compatibility

The assignment states that you cannot make any changes to the contracts. But ideally, should do the following.

It is better to wrap the data in the response in a data type wrapper: For example, returning arrays `[]` makes it difficult to add metadata (such as pagination or totals) without changing the API contract, which can break client applications.

Therefore, it is better to always return an object, such as `items` or `data`

```json
{
  "items": []
}
```

It allows you to easily add other fields like without breaking backward compatibility.

```json
{
  "items": [],
  "total": 100
}
```

Although the problem is most obvious with arrays (where `[]` does not provide space for pagination), the practice of wrapping data in an object is useful for any data returned by the API, for consistency and flexibility.
**Example:** Easily add metadata at the top level without changing the structure of the underlying data object.

```json
{
  "data": {
    "id": 1,
    "name": "Product"
  },
  "version": "1.1",
  "status": "success"
}
```
