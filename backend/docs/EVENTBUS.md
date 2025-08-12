# EventBus Architecture Refactoring

## Overview
Complete refactoring of the EventBus system to support multiple message broker implementations with a clean, extensible architecture. The system now supports both synchronous (in-memory) and asynchronous (Redpanda/Kafka) message processing modes.

## Architecture Changes

### Core Components
- **IEventBus Interface** - Unified contract for all event bus implementations
- **EventHandler<T>** - Generic interface for event processing (moved to separate file)
- **EventBusFactory** - Factory pattern for provider selection based on configuration
- **Configuration Schema** - Zod-based validation for event bus settings

### Implementations

#### InMemoryEventBus
- **Use Case**: Development, testing, single-instance deployments
- **Features**: Synchronous processing, Node.js EventEmitter-based
- **Benefits**: Simple, fast, no external dependencies

#### RedpandaEventBus
- **Use Case**: Production, distributed systems
- **Features**: Asynchronous processing, guaranteed delivery, horizontal scaling
- **Technology**: KafkaJS client with Redpanda broker
- **Benefits**: Fault tolerance, message persistence, consumer groups

## Implementation Details

### Event Serialization
- JSON-based event serialization with proper type reconstruction
- Separates base event properties (eventId, eventType, aggregateId, timestamp) from payload
- Maintains event immutability and type safety

### Configuration Management
Environment variables:
```bash
EVENT_BUS_PROVIDER=redpanda          # memory|redpanda
REDPANDA_BROKERS=["localhost:9092"]  # JSON array of brokers
REDPANDA_CLIENT_ID=weather-backend   # Kafka client identifier
REDPANDA_GROUP_ID=weather-backend-group  # Consumer group
REDPANDA_TOPIC=weather-events        # Topic name
```

### Docker Integration
- Added Redpanda service to Docker Compose
- Included Redpanda Console for monitoring
- Health checks and proper service dependencies
- Development-friendly configuration

## Testing Strategy

### Test Updates
- Refactored all tests to use EventBusFactory
- Updated integration tests for async event processing
- Added proper delays for event handling verification
- Maintained test isolation and reliability

### Results
- ✅ All 87 tests passing
- ✅ Unit tests for both implementations
- ✅ Integration tests with real message flow
- ✅ E2E tests with full stack validation

## Code Quality

### Refactoring Benefits
- **Removed deprecated code**: Eliminated old EventBus class
- **Improved type safety**: Better TypeScript interfaces
- **Cleaner imports**: Organized module structure
- **SOLID principles**: Single responsibility, dependency inversion

### File Structure
```
src/common/events/
├── types/
│   ├── event-handler.ts          # EventHandler interface
│   └── event-bus-config.ts       # Configuration types
├── interfaces/
│   └── event-bus.interface.ts    # IEventBus contract
├── implementations/
│   ├── in-memory-event-bus.ts    # Synchronous implementation
│   └── redpanda-event-bus.ts     # Asynchronous implementation
├── event-bus-factory.ts          # Provider factory
└── index.ts                      # Public exports
```

## Production Readiness

### Features
- **Graceful Shutdown**: Proper cleanup in application lifecycle
- **Error Handling**: Comprehensive logging and error recovery
- **Connection Management**: Auto-reconnection and health monitoring
- **Consumer Groups**: Horizontal scaling support

### Configuration Flexibility
- Runtime provider switching via environment variables
- Default fallbacks for development
- Validation with helpful error messages
- Test-specific configurations

## Migration Impact

### Breaking Changes
- ✅ All imports updated from old EventBus to new interfaces
- ✅ Service injection changed from EventBus to IEventBus
- ✅ Tests migrated to use InMemoryEventBus explicitly

### Backward Compatibility
- Configuration defaults to in-memory provider
- Existing event handlers work unchanged
- Same event publishing/subscription API

## Future Extensibility

The architecture is designed to easily support additional message brokers:
- RabbitMQ implementation
- AWS SQS/SNS integration
- Apache Pulsar support
- Custom message broker adapters

Simply implement the IEventBus interface and add the provider to the factory.