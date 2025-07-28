import 'reflect-metadata';
import { EventBus, EventHandler } from './event-bus';
import { DomainEvent } from './base-event';

class TestEvent extends DomainEvent {
  static readonly EVENT_TYPE = 'test.event';

  constructor(
    aggregateId: string,
    public readonly data: string,
  ) {
    super(aggregateId, TestEvent.EVENT_TYPE);
  }
}

class TestEventHandler implements EventHandler<TestEvent> {
  public handledEvents: TestEvent[] = [];
  public shouldThrow = false;
  public throwError = new Error('Handler error');

  async handle(event: TestEvent): Promise<void> {
    if (this.shouldThrow) {
      throw this.throwError;
    }
    this.handledEvents.push(event);
  }
}

describe('EventBus', () => {
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus();
  });

  afterEach(() => {
    eventBus.removeAllListeners();
  });

  describe('subscribe/unsubscribe', () => {
    it('should register event handler successfully', () => {
      const handler = new TestEventHandler();

      eventBus.subscribe(TestEvent.EVENT_TYPE, handler);

      expect(eventBus.getHandlerCount(TestEvent.EVENT_TYPE)).toBe(1);
    });

    it('should register multiple handlers for same event type', () => {
      const handler1 = new TestEventHandler();
      const handler2 = new TestEventHandler();

      eventBus.subscribe(TestEvent.EVENT_TYPE, handler1);
      eventBus.subscribe(TestEvent.EVENT_TYPE, handler2);

      expect(eventBus.getHandlerCount(TestEvent.EVENT_TYPE)).toBe(2);
    });

    it('should unregister event handler successfully', () => {
      const handler = new TestEventHandler();

      eventBus.subscribe(TestEvent.EVENT_TYPE, handler);
      expect(eventBus.getHandlerCount(TestEvent.EVENT_TYPE)).toBe(1);

      eventBus.unsubscribe(TestEvent.EVENT_TYPE, handler);
      expect(eventBus.getHandlerCount(TestEvent.EVENT_TYPE)).toBe(0);
    });

    it('should not affect other handlers when unregistering one', () => {
      const handler1 = new TestEventHandler();
      const handler2 = new TestEventHandler();

      eventBus.subscribe(TestEvent.EVENT_TYPE, handler1);
      eventBus.subscribe(TestEvent.EVENT_TYPE, handler2);
      expect(eventBus.getHandlerCount(TestEvent.EVENT_TYPE)).toBe(2);

      eventBus.unsubscribe(TestEvent.EVENT_TYPE, handler1);
      expect(eventBus.getHandlerCount(TestEvent.EVENT_TYPE)).toBe(1);
    });

    it('should return 0 for non-existent event type', () => {
      expect(eventBus.getHandlerCount('non.existent')).toBe(0);
    });
  });

  describe('publish', () => {
    it('should publish event to registered handler', async () => {
      const handler = new TestEventHandler();
      const event = new TestEvent('test-id', 'test-data');

      eventBus.subscribe(TestEvent.EVENT_TYPE, handler);

      await eventBus.publish(event);

      expect(handler.handledEvents).toHaveLength(1);
      expect(handler.handledEvents[0]).toBe(event);
      expect(handler.handledEvents[0].data).toBe('test-data');
      expect(handler.handledEvents[0].aggregateId).toBe('test-id');
    });

    it('should publish event to multiple handlers', async () => {
      const handler1 = new TestEventHandler();
      const handler2 = new TestEventHandler();
      const event = new TestEvent('test-id', 'test-data');

      eventBus.subscribe(TestEvent.EVENT_TYPE, handler1);
      eventBus.subscribe(TestEvent.EVENT_TYPE, handler2);

      await eventBus.publish(event);

      expect(handler1.handledEvents).toHaveLength(1);
      expect(handler2.handledEvents).toHaveLength(1);
      expect(handler1.handledEvents[0]).toBe(event);
      expect(handler2.handledEvents[0]).toBe(event);
    });

    it('should complete successfully when no handlers are registered', async () => {
      const event = new TestEvent('test-id', 'test-data');

      await expect(eventBus.publish(event)).resolves.toBeUndefined();
    });

    it('should throw error when handler fails', async () => {
      const handler = new TestEventHandler();
      handler.shouldThrow = true;
      handler.throwError = new Error('Handler failed');

      const event = new TestEvent('test-id', 'test-data');

      eventBus.subscribe(TestEvent.EVENT_TYPE, handler);

      await expect(eventBus.publish(event)).rejects.toThrow('Handler failed');
    });

    it('should throw error even when one of multiple handlers fails', async () => {
      const handler1 = new TestEventHandler();
      const handler2 = new TestEventHandler();
      handler2.shouldThrow = true;
      handler2.throwError = new Error('Handler 2 failed');

      const event = new TestEvent('test-id', 'test-data');

      eventBus.subscribe(TestEvent.EVENT_TYPE, handler1);
      eventBus.subscribe(TestEvent.EVENT_TYPE, handler2);

      await expect(eventBus.publish(event)).rejects.toThrow();

      // First handler should still have been called
      expect(handler1.handledEvents).toHaveLength(1);
    });

    it('should handle concurrent event publishing', async () => {
      const handler = new TestEventHandler();
      const events = [
        new TestEvent('test-id-1', 'test-data-1'),
        new TestEvent('test-id-2', 'test-data-2'),
        new TestEvent('test-id-3', 'test-data-3'),
      ];

      eventBus.subscribe(TestEvent.EVENT_TYPE, handler);

      const promises = events.map((event) => eventBus.publish(event));
      await Promise.all(promises);

      expect(handler.handledEvents).toHaveLength(3);
      expect(handler.handledEvents.map((e) => e.data)).toContain('test-data-1');
      expect(handler.handledEvents.map((e) => e.data)).toContain('test-data-2');
      expect(handler.handledEvents.map((e) => e.data)).toContain('test-data-3');
    });
  });

  describe('event properties', () => {
    it('should create event with proper properties', () => {
      const event = new TestEvent('test-aggregate-id', 'test-data');

      expect(event.eventId).toBeDefined();
      expect(event.eventType).toBe(TestEvent.EVENT_TYPE);
      expect(event.timestamp).toBeInstanceOf(Date);
      expect(event.aggregateId).toBe('test-aggregate-id');
      expect(event.data).toBe('test-data');
    });

    it('should create unique event IDs', () => {
      const event1 = new TestEvent('test-id', 'data1');
      const event2 = new TestEvent('test-id', 'data2');

      expect(event1.eventId).not.toBe(event2.eventId);
    });

    it('should create timestamps close to current time', () => {
      const before = new Date();
      const event = new TestEvent('test-id', 'data');
      const after = new Date();

      expect(event.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(event.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });
});
