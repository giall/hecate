import { log } from '../logger/logger';
import * as koaLogger from 'koa-logger';

async function ctxLog(ctx, next) {
  ctx.log = log;
  await next();
}

function requestLogger() {
  return koaLogger({
    transporter: (str) => {
      log.info(str);
    }
  });
}

export { ctxLog, requestLogger }
