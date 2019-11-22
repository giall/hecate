import * as helmetjs from 'helmet';
import * as koaCors from '@koa/cors';
import { promisify } from 'util';
import { properties } from '../properties/properties';

function helmet(...args) {
  const helmetPromise = promisify(helmetjs(args));
  return async (ctx, next) => {
    await helmetPromise(ctx.req, ctx.res);
    await next();
  };
}

Object.keys(helmetjs).forEach(function (helmetMethod) {
  helmet[helmetMethod] = function (...args) {
    const method = helmetjs[helmetMethod];
    const methodPromise = promisify(method(args));
    return (ctx, next) => {
      return methodPromise(ctx.req, ctx.res).then(next);
    };
  };
});

function cors() {
  return koaCors({
    origin: properties.web.host,
    allowHeaders: 'content-type',
    credentials: true
  });
}

export { helmet, cors };
