export class AppError extends Error {
  status: number;
  
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export class Errors {
  static unauthorized(message: string) {
    return new AppError(message, 401);
  }

  static forbidden(message: string) {
    return new AppError(message, 403);
  }

  static notFound(message: string) {
    return new AppError(message, 404);
  }

  static conflict(message: string) {
    return new AppError(message, 409);
  }

  static tooManyRequests() {
    return new AppError('Too many requests', 429);
  }
}