import { Database } from '../database/database';
import { RateLimiterMongo, RateLimiterRes } from 'rate-limiter-flexible';
import { Logger } from '../logger/logger';
import { properties } from '../properties/properties';

export interface LimiterKeys {
  email: string;
  ip: string;
}

interface LimiterRes {
  ok: boolean;
  retryAfter?: string;
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

  async limit(keys: LimiterKeys): Promise<LimiterRes> {
    try {
      await this.limiter.consume(keys.email);
      await this.limiter.consume(keys.ip);
      return {ok: true};
    } catch (err) {
      return this.handleError(err, keys);
    }
  }

  private handleError(err, keys): LimiterRes {
    if (err instanceof RateLimiterRes) {
      this.logger.warn('Rate limit reached', keys);
      return {
        ok: false,
        retryAfter: (err.msBeforeNext / 1000).toString()
      }
    } else {
      throw err;
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