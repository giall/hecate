import { Context } from 'koa';
import { Token } from './token.utils';
import { Errors } from '../error/errors';
import { compareSync, hashSync } from 'bcrypt';

function clearAuthTokens(ctx: Context) {
  ctx.cookies.set(Token.Access, undefined);
  ctx.cookies.set(Token.Refresh, undefined);
}

function setRateLimitHeaders(ctx, res) {
  ctx.set('X-RateLimit-Limit', res.limit);
  ctx.set('X-RateLimit-Remaining', res.remaining);
  ctx.set('X-RateLimit-Reset', res.reset);
}

function validateSession(session, sessions) {
  if (!sessions.includes(session)) {
    throw Errors.forbidden('Invalid token.');
  }
}

function hashPassword(password: string) {
  return hashSync(password, 10);
}

function comparePassword(password: string, hash: string) {
  return compareSync(password, hash);
}

export { clearAuthTokens, setRateLimitHeaders, validateSession, hashPassword, comparePassword }
