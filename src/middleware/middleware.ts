import { Logger } from '../logger/logger';
import {RateLimiterMemory, RateLimiterMongo} from 'rate-limiter-flexible';
import { Errors } from '../error/errors';

import * as koaLogger from 'koa-logger';
import { Token, Payload, TokenUtils } from '../utils/token.utils';

function ctxLogger(log: Logger) {
  return async function ctxLogger(ctx, next) {
    ctx.log = log;
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
      ctx.body = 'Something went wrong; please try again.';
    } else {
      ctx.body = err.message;
    }
  }
}

function requestLogger(log: Logger) {
  return koaLogger({
    transporter: (str) => {
      log.info(str);
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
    ctx.log.warn('No access token included in request');
    throw Errors.unauthorized('Invalid token.');
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
    ctx.log.warn('No refresh token included in request');
    throw Errors.unauthorized('Invalid token.');
  }
}

export {
  requestLogger, ctxLogger, errorHandler, access, refresh
}
