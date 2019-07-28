import * as pino from 'pino';
import { properties } from '../properties/properties';

export class Logger {
  private logger: pino.Logger | Console;

  constructor() {
    const { level } = properties.logging;
    if (level === 'test') {
      this.logger = console;
    } else {
      this.logger = pino({level});
    }
  }

  debug(log: any, ...args: any[]) {
    this.logger.debug(log, ...args);
  }

  info(log: any, ...args: any[]) {
    this.logger.info(log, ...args);
  }

  warn(log: any, ...args: any[]) {
    this.logger.warn(log, ...args);
  }

  error(log: any, ...args: any[]) {
    this.logger.error(log, ...args);
  }
}