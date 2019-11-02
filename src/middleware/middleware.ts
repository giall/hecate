import { Logger } from '../logger/logger';
import {RateLimiterMemory, RateLimiterMongo} from 'rate-limiter-flexible';
import { Errors } from '../error/errors';

import * as koaLogger from 'koa-logger';
import { Token, Payload, TokenUtils } from '../utils/token.utils';

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
}

const rateLimiter = new RateLimiterMemory({
  points: 20,
  duration: 60,
});

async function loginRateLimit(ctx, next) {
  ctx.rateLimiter = rateLimiter;
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
async function access(ctx, next) {
  const token = ctx.cookies.get(Token.Access);
  if (token) {
    const payload = TokenUtils.decode(token, Token.Access) as Payload;
    ctx.user = payload.id;
    await next();
  } else {
    throw Errors.unauthorized('No access token included in request');
  }
}

// requires a refresh token to be sent with request
// saves user ID in ctx.user and session ID in ctx.session
async function refresh(ctx, next) {
  const token = ctx.cookies.get(Token.Refresh);
  if (token) {
    const payload = TokenUtils.decode(token, Token.Refresh) as Payload;
    ctx.user = payload.id;
    ctx.session = payload.session;
    await next();
  } else {
    throw Errors.unauthorized('No refresh token included in request');
  }
}

export {
  requestLogger, ctxLogger, errorHandler, loginRateLimit, access, refresh
}