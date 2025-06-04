export class SubscriptionServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SubscriptionServiceError';
  }
}

export class TokenNotFound extends SubscriptionServiceError {
  constructor() {
    super(`Token not found`);
    this.name = 'TokenNotFound';
  }
}

export class EmailAlreadySubscribed extends SubscriptionServiceError {
  constructor() {
    super(`Email already subscribed`);
    this.name = 'EmailAlreadySubscribed';
  }
}
