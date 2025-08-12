export interface BaseEvent {
  readonly eventId: string;
  readonly eventType: string;
  readonly timestamp: Date;
  readonly aggregateId: string;
}

export abstract class DomainEvent implements BaseEvent {
  public readonly eventId: string;
  public readonly eventType: string;
  public readonly timestamp: Date;
  public readonly aggregateId: string;

  constructor(aggregateId: string, eventType: string) {
    this.eventId = crypto.randomUUID();
    this.eventType = eventType;
    this.timestamp = new Date();
    this.aggregateId = aggregateId;
  }
}
