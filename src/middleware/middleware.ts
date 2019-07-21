import { Logger } from '../logger/logger';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { Errors } from '../error/errors';

import * as koaLogger from 'koa-logger';
import { Token, Payload, TokenUtils } from '../services/token.service';

function ctxLogger(logger: Logger) {
  return async function ctxLogger(ctx, next) {
    ctx.log = logger;
    await next();
  };
}

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

function requestLogger(logger: Logger) {
  return koaLogger({
    transporter: (str) => {
      logger.info(str);
    }
  });
}

// requires an access token to be sent with request, and saves user ID in ctx.user
async function requireAccessToken(ctx, next) {
  const accessToken = ctx.cookies.get(Token.Access);
  if (accessToken) {
    const payload = TokenUtils.decode(accessToken, Token.Access) as Payload;
    ctx.user = payload.id;
    await next();
  } else {
    throw Errors.unauthorized('No access token included in request');
  }
}

export {
  requestLogger, ctxLogger, errorHandler, loginRateLimit, requireAccessToken
}