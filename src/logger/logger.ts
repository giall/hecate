import * as pino from 'pino';

export class Logger {
  private logger: pino.Logger;

  constructor() {
    this.logger = pino();
  }

  debug(message: string) {
    this.logger.debug(message);
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