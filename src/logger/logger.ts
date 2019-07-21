import * as pino from 'pino';
import { properties } from '../properties/properties';

export class Logger {
  private logger: pino.Logger;

  constructor() {
    const { level } = properties.logging;
    this.logger = pino({level});
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