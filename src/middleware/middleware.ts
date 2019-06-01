import { Logger } from '../logger/logger';

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

export {
  setLogger, errorHandler
}