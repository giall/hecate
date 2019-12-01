import { AppError } from '../error/errors';
import * as koaCors from '@koa/cors';
import { properties } from '../properties/properties';

async function errorHandler(ctx, next) {
  try {
    await next();
  } catch (err) {
    if (err instanceof AppError) {
      ctx.status = err.status;
      ctx.body = err.message;
    } else if (err.name === 'ValidationError') {
      ctx.log.warn(err);
      ctx.status = 400;
      ctx.message = 'Invalid input.';
    } else {
      ctx.log.error(err);
      ctx.status = 500;
      ctx.body = 'Something went wrong; please try again.';
    }
  }
}

async function send(ctx, next) {
  ctx.send = function send(status: number, value: string | object) {
    ctx.status = status;
    ctx.body = typeof value === 'string' ? {message: value} : value;
  };
  await next();
}

async function functionsFramework(ctx, next) {
  if (!['development', 'test', 'ci'].includes(process.env.NODE_ENV)) {
    ctx.request = ctx.request.req; // for Functions Framework environments
  }
  await next();
}

function cors() {
  return koaCors({
    origin: properties.web.host,
    allowHeaders: 'content-type',
    credentials: true
  });
}

export {
  errorHandler, send, functionsFramework, cors
};
