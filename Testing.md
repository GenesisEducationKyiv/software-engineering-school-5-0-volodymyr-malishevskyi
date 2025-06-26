# Running Tests

This document contains instructions for running tests for the backend part of the project.

**IMPORTANT!**
For testing purposes, docker on the host machine is required

## Running E2E Tests

Before running tests, you need to create e2e.env file in the root of project that contains all variables in [e2e.env.example](e2e.env.example).

To run E2E test, in root folder run a single command, that will automatically up project from [compose.e2e.yaml](compose.e2e.yaml) file and run tests:

```bash
./e2e/run-e2e.sh
```

## Running Backend Tests

For run all test (unit, integration, and e2e) use a single command:

```bash
./backend/run-tests.sh
```

### Manual

Before run tests, switch to backend directory and install dependencies:

```bash
cd backend
npm install
```

And run all test (unit, integration, and e2e) with a single command:

```bash
npm run test -- --verbose
```

Run specific test types with the following commands:

```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# End-to-end tests
npm run test:e2e
```
