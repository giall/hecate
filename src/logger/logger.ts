import * as pino from 'pino';
import { properties } from '../properties/properties';

export class Logger {
  private log: pino.Logger | Console;

  constructor() {
    const { level } = properties.logging;
    if (level === 'test') {
      this.log = console;
    } else {
      this.log = pino({level});
    }
  }

  debug(log: any, ...args: any[]) {
    this.log.debug(log, ...args);
  }

  info(log: any, ...args: any[]) {
    this.log.info(log, ...args);
  }

  warn(log: any, ...args: any[]) {
    this.log.warn(log, ...args);
  }

  error(log: any, ...args: any[]) {
    this.log.error(log, ...args);
  }
}

export const log = new Logger();
