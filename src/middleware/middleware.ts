import { Logger } from '../logger/logger';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { Errors } from '../error/errors';

async function setLogger(ctx, next) {
  ctx.log = new Logger();
  await next();
};

async function errorHandler(ctx, next) {
  try {
    await next();
  } catch (err) {
    ctx.status = err.status || 500;
    if (ctx.status === 500) {
      ctx.log.error(err);
    }
    else ctx.log.warn(err);
  }
};

const rateLimiter = new RateLimiterMemory({
  points: 20,
  duration: 60,
});

async function loginRateLimit(ctx, next) {
  try {
    await rateLimiter.consume(ctx.ip);
  } catch (err) {
    throw Errors.tooManyRequests();
  }
  await next();
}

export {
  setLogger, errorHandler, loginRateLimit
}