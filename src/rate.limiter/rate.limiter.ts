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
  limit?: number;
  remaining?: number;
  reset?: Date;
}

export class RateLimiter {
  private log: Logger;
  private database: Database;
  private limiter: RateLimiterMongo;

  constructor(database: Database) {
    this.database = database;
    this.log = new Logger();
  }

  async init() {
    if (!this.database.isConnected()) {
      await this.database.connect();
    }
    this.limiter = new RateLimiterMongo({
      storeClient: this.database.client,
      dbName: this.database.name,
      points: properties.limiter.retry.attempts,
      duration: properties.limiter.retry.interval
    });
  }

  async limit(keys: LimiterKeys): Promise<LimiterRes> {
    if (!this.limiter) {
      await this.init();
    }
    let ok = false;
    let result: RateLimiterRes;
    try {
      result = await this.consume(keys);
      ok = true;
    } catch (err) {
      result = this.handleLimiterError(err);
    }
    return {
      ok,
      limit: properties.limiter.retry.attempts,
      remaining: result.remainingPoints,
      reset: new Date(Date.now() + result.msBeforeNext)
    };
  }

  async reset(keys: LimiterKeys) {
    try {
      await this.limiter.delete(keys.email);
      await this.limiter.delete(keys.ip);
    } catch (err) {
      this.log.warn(err);
    }
  }

  private async consume(keys) {
    await this.limiter.consume(keys.email);
    return this.limiter.consume(keys.ip);
  }

  private handleLimiterError(err): RateLimiterRes {
    if (err instanceof RateLimiterRes) {
      return err;
    } else {
      throw err;
    }
  }
}
