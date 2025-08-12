export class HttpError extends Error {
  constructor(
    public message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
  }
}

export class HTTPClientError extends HttpError {
  constructor(
    public message: string = 'Client Error',
    public statusCode: number = 400,
  ) {
    super(message, statusCode);
    this.name = 'HTTPClientError';
  }
}

export class HTTPServerError extends HttpError {
  constructor(
    public message: string = 'Server Error',
    public statusCode: number = 500,
  ) {
    super(message, statusCode);
    this.name = 'HTTPServerError';
  }
}

// HTTP Client Errors
export class HTTPBadRequestError extends HTTPClientError {
  constructor(message: string = 'Bad Request') {
    super(message, 400);
    this.name = 'HTTPBadRequestError';
  }
}

export class HTTPNotFoundError extends HTTPClientError {
  constructor(message: string = 'Not Found') {
    super(message, 404);
    this.name = 'HTTPNotFoundError';
  }
}

export class HTTPConflictError extends HTTPClientError {
  constructor(message: string = 'Conflict') {
    super(message, 409);
    this.name = 'HTTPConflictError';
  }
}

// HTTP Server Errors
export class HTTPInternalServerError extends HTTPServerError {
  constructor(message: string = 'Internal Server Error') {
    super(message, 500);
    this.name = 'HTTPInternalServerError';
  }
}
