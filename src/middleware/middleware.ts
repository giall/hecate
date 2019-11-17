import * as koaCors from '@koa/cors';
import { AppError } from '../error/errors';
import { properties } from '../properties/properties';


async function errorHandler(ctx, next) {
  try {
    await next();
  } catch (err) {
    if (err instanceof AppError) {
      ctx.status = err.status;
      ctx.body = err.message;
    } else if (err.name === 'ValidationError') {
      ctx.log.info(err);
      ctx.status = 400;
      ctx.message = 'Invalid input.';
    } else {
      ctx.log.error(err);
      ctx.status = 500;
      ctx.body = 'Something went wrong; please try again.';
    }
  }
}

function cors() {
  return koaCors({
    origin: properties.web.host,
    allowHeaders: 'Content-Type',
    credentials: true
  });
}

export {
  errorHandler, cors
};
