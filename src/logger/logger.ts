import * as pino from 'pino';

export class Logger {
  private logger: pino.Logger;

  constructor() {
    this.logger = pino({level: process.env.LOG_LEVEL || 'info'});
  }

  debug(log: {}) {
    this.logger.debug(JSON.stringify(log));
  }

  info(message: string) {
    this.logger.info(message);
  }

  warn(error: Error) {
    this.logger.warn(error);
  }

  error(error: Error) {
    this.logger.error(error);
  }
}