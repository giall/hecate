import { Database } from '../database/database';
import { RateLimiterMongo } from 'rate-limiter-flexible';
import { Logger } from '../logger/logger';
import { Errors } from '../error/errors';
import { properties } from '../properties/properties';

export interface LimiterKeys {
  email: string;
  ip: string;
}

export class RateLimiter {
  private limiter: RateLimiterMongo;
  private logger: Logger;

  constructor(database: Database, logger: Logger) {
    this.limiter = new RateLimiterMongo({
      storeClient: database.client,
      dbName: database.name,
      points: properties.limiter.retry.attempts,
      duration: properties.limiter.retry.interval
    });
    this.logger = logger;
  }

  async limit(keys: LimiterKeys) {
    const emailAllowed = await this.consume(keys.email);
    const ipAllowed = await this.consume(keys.ip);
    if (!emailAllowed || !ipAllowed) {
      throw Errors.tooManyRequests();
    }
  }

  private async consume(key: string) {
    try {
      await this.limiter.consume(key);
      return true;
    } catch (err) {
      this.logger.warn(`Rate limit error with key=${key}`, err);
      return false;
    }
  }

  async reset(keys: LimiterKeys) {
    try {
      await this.limiter.delete(keys.email);
      await this.limiter.delete(keys.ip);
    } catch (err) {
      this.logger.warn(err);
    }
  }
}