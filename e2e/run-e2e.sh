#!/bin/bash

url=http://localhost:9010

if [ -n "$1" ]; then
  url=$1
fi

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
PROJECT_ROOT=$(realpath "$SCRIPT_DIR/..")
COMPOSE_FILE="$PROJECT_ROOT/compose.e2e.yaml"

if [ ! -f "$COMPOSE_FILE" ]; then
    echo "Error: Compose file not found at $COMPOSE_FILE"
    exit 1
fi

COMPOSE_ENV_FILE="$PROJECT_ROOT/e2e.env"

if [ ! -f "$COMPOSE_ENV_FILE" ]; then
    echo "Error: Env file for e2e testing not found at $COMPOSE_ENV_FILE"
    echo "Please create the file with the necessary environment variables based on e2e.env.example"
    exit 1
fi

echo "--- Running E2E tests with URL: $url"
echo "--- Using project root: $PROJECT_ROOT"
echo "--- Using compose file: $COMPOSE_FILE"

set -e

echo "Shutting down and remove existing containers..."
docker compose -f "$COMPOSE_FILE" down --remove-orphans || true

echo "Building and starting containers..."
docker compose -f "$COMPOSE_FILE" up --build -d

echo "Waiting 15s for services to be healthy..."
sleep 15

echo "Installing Playwright dependencies..."
(cd "$PROJECT_ROOT/e2e" && npm install && npx playwright install --with-deps) || {
  echo "Failed to install Playwright dependencies"
  exit 1
}

TEST_EXIT_CODE=0

echo "Running Playwright tests..."
(cd "$PROJECT_ROOT/e2e" && BASE_URL=$url npm test) || TEST_EXIT_CODE=$?

echo "Shutting down containers..."
docker compose -f "$COMPOSE_FILE" down --remove-orphans

exit $TEST_EXIT_CODE