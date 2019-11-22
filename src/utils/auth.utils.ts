import { Context } from 'koa';
import { accessToken, refreshToken, Token } from './token.utils';
import { Errors } from '../error/errors';
import { compareSync, hashSync } from 'bcrypt';
import { User } from '../models/user';
import { properties } from '../properties/properties';
import { AuthService } from '../services/auth.service';

function clearAuthTokens(ctx: Context) {
  ctx.cookies.set(Token.Access);
  ctx.cookies.set(Token.Refresh);
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

async function userLogin(service: AuthService, ctx: Context, user: User, rememberMe = false) {
  const cookieOptions = properties.cookie.options;
  ctx.cookies.set(Token.Access, accessToken(user), {
    ...cookieOptions
  });

  const session = await service.addSession(user.id);
  ctx.cookies.set(Token.Refresh, refreshToken(user, session, rememberMe), {
    ...cookieOptions
  });
}

export { clearAuthTokens, setRateLimitHeaders, validateSession, hashPassword, comparePassword, userLogin }
