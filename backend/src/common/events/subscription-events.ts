import { DomainEvent } from './base-event';

export class SubscriptionCreatedEvent extends DomainEvent {
  static readonly EVENT_TYPE = 'subscription.created';

  constructor(
    public readonly subscriptionId: string,
    public readonly email: string,
    public readonly cityFullName: string,
    public readonly frequency: string,
    public readonly confirmationUrl: string,
  ) {
    super(subscriptionId, SubscriptionCreatedEvent.EVENT_TYPE);
  }
}

export class SubscriptionConfirmedEvent extends DomainEvent {
  static readonly EVENT_TYPE = 'subscription.confirmed';

  constructor(
    public readonly subscriptionId: string,
    public readonly email: string,
    public readonly cityFullName: string,
    public readonly frequency: string,
    public readonly unsubscribeUrl: string,
  ) {
    super(subscriptionId, SubscriptionConfirmedEvent.EVENT_TYPE);
  }
}

export class SubscriptionCancelledEvent extends DomainEvent {
  static readonly EVENT_TYPE = 'subscription.cancelled';

  constructor(
    public readonly subscriptionId: string,
    public readonly email: string,
    public readonly cityFullName: string,
    public readonly frequency: string,
  ) {
    super(subscriptionId, SubscriptionCancelledEvent.EVENT_TYPE);
  }
}
