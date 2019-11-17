// requires an access token to be sent with request, and saves user ID in ctx.user
import { Payload, Token, TokenUtils } from '../utils/token.utils';
import { Errors } from '../error/errors';

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

export { access, refresh };
