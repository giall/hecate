import { Controller, KoaController, Post, Pre, Validate } from 'koa-joi-controllers';
import { Field, params } from '../utils/validation.utils';
import { Context } from 'koa';
import { LimiterKeys, RateLimiter } from '../rate.limiter/rate.limiter';
import { User, UserDto } from '../models/user';
import { UserRepository } from '../repositories/user.repository';
import { AuthService } from '../services/auth.service';
import { Token, TokenUtils } from '../utils/token.utils';
import { Errors } from '../error/errors';
import { refresh } from '../middleware/middleware';

@Controller('/auth')
export class AuthController extends KoaController {
  userRepository: UserRepository;
  authService: AuthService;
  rateLimiter: RateLimiter;

  constructor(userRepository: UserRepository, authService: AuthService,
              rateLimiter: RateLimiter) {
    super();
    this.userRepository = userRepository;
    this.authService = authService;
    this.rateLimiter = rateLimiter;
  }

  @Post('/login')
  @Validate(params({
    email: Field.Email,
    password: Field.Password
  }))
  async login(ctx: Context) {
    const {email, password} = ctx.request.body;
    const keys: LimiterKeys = {email, ip: ctx.ip};
    const res = await this.rateLimiter.limit(keys);
    if (res.ok) {
      const user = await this.authService.login(email, password);
      if (user) {
        await this.rateLimiter.reset(keys);
        ctx.log.info(`User with id=${user.id} successfully logged in`);
        await this.userLogin(ctx, user);
      } else {
        this.setRateLimitHeaders(ctx, res);
        ctx.status = 401;
        ctx.body = 'Invalid credentials.';
      }
    } else {
      this.setRateLimitHeaders(ctx, res);
      ctx.status = 429;
      ctx.body = 'Too many attempts. Please try again later.';
    }
  }

  @Post('/logout')
  @Pre(refresh)
  async logout(ctx: Context) {
    await this.authService.removeSession(ctx.user, ctx.session);
    this.clearAuthTokens(ctx);
    ctx.status = 204;
  }

  @Post('/magic.login/request')
  @Validate(params({
    email: Field.Email
  }))
  async magicLoginRequest(ctx: Context) {
    const {email} = ctx.request.body;
    await this.authService.requestMagicLogin(email);
    ctx.status = 202;
  }

  @Post('/magic.login')
  @Validate(params({
    token: Field.Token
  }))
  async magicLogin(ctx: Context) {
    const {token} = ctx.request.body;
    const payload = TokenUtils.decode(token, Token.MagicLogin);
    const user = await this.authService.magicLogin(payload.id);
    ctx.log.info(`User with id=${user.id} logged in via magic login`);
    await this.userLogin(ctx, user);
  }

  @Post('/refresh')
  @Pre(refresh)
  async refresh(ctx: Context) {
    const user = await this.userRepository.findById(ctx.user);
    ctx.log.info(`Refreshing tokens for user with id=${user.id}`);
    this.validateSession(ctx.session, user.sessions);
    await this.authService.removeSession(user.id, ctx.session);
    ctx.log.info(`User with id=${user.id} successfully refreshed tokens`);
    await this.userLogin(ctx, user);
  }

  @Post('/invalidate')
  @Pre(refresh)
  async invalidate(ctx: Context) {
    const user = await this.userRepository.findById(ctx.user);
    ctx.log.info(`Invalidating refresh tokens for user with id=${user.id}`);
    this.validateSession(ctx.session, user.sessions);
    await this.authService.resetSessions(user.id);
    this.clearAuthTokens(ctx);
    ctx.log.info('Tokens successfully invalidated');
    ctx.status = 204;
  }

  private async userLogin(ctx, user) {
    await this.setAuthTokens(ctx, user);
    ctx.status = 200;
    ctx.body = UserDto.from(user);
  }

  private async setAuthTokens(ctx: Context, user: User) {
    const options = {secure: false, httpOnly: false};

    const accessToken = TokenUtils.access(user);
    ctx.cookies.set(Token.Access, accessToken, options);

    const session = await this.authService.addSession(user.id);
    const refreshToken = TokenUtils.refresh(user, session);
    ctx.cookies.set(Token.Refresh, refreshToken, options);
  }

  private clearAuthTokens(ctx: Context) {
    ctx.cookies.set(Token.Access, undefined);
    ctx.cookies.set(Token.Refresh, undefined);
  }

  private validateSession(session, sessions) {
    if (!sessions.includes(session)) {
      throw Errors.forbidden('Invalid token.');
    }
  }

  private setRateLimitHeaders(ctx, res) {
    ctx.set('X-RateLimit-Limit', res.limit);
    ctx.set('X-RateLimit-Remaining', res.remaining);
    ctx.set('X-RateLimit-Reset', res.reset);
  }
}
