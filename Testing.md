# Running Tests

This document contains instructions for running tests for the backend part of the project.

## Running All Tests

To run all backend tests, switch to backend directory:

```bash
# Switch to backend directory
cd backend
```

And run all test (unit, integration, and e2e) with a single command:

```bash
npm test --verbose
```

## Running Tests by Type

Run specific test types with the following commands:

```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# End-to-end tests
npm run test:e2e
```
