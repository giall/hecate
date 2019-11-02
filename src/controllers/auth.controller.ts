import { Controller, KoaController, Post, Pre, Put, Validate } from 'koa-joi-controllers';
import { validation } from './validation';
import { Context } from 'koa';
import { LimiterKeys, RateLimiter } from '../rate.limiter/rate.limiter';
import { User, UserDto } from '../models/user';
import { UserRepository } from '../repositories/user.repository';
import { AuthService } from '../services/auth.service';
import { Transporter } from '../mail/transporter';
import { Token, TokenUtils } from '../utils/token.utils';
import { Errors } from '../error/errors';
import { refresh } from '../middleware/middleware';

@Controller('/auth')
export class AuthController extends KoaController {
  userRepository: UserRepository;
  authService: AuthService;
  transporter: Transporter;
  rateLimiter: RateLimiter;

  constructor(userRepository: UserRepository, authService: AuthService,
    transporter: Transporter, rateLimiter: RateLimiter) {
    super();
    this.userRepository = userRepository;
    this.authService = authService;
    this.transporter = transporter;
    this.rateLimiter = rateLimiter;
  }

  @Post('/login')
  @Validate(validation.login)
  async login(ctx: Context) {
    const {email, password} = ctx.request.body;
    const keys: LimiterKeys = {email, ip: ctx.ip};
    await this.rateLimiter.limit(keys);

    const user = await this.authService.login(email, password);
    ctx.log.info(`User with id=${user.id} successfully logged in`);
    await this.setAuthTokens(ctx, user);
    ctx.status = 200;
    ctx.body = UserDto.from(user);
    await this.rateLimiter.reset(keys);
  }

  @Post('/refresh')
  @Pre(refresh)
  async refresh(ctx: Context) {
    const user = await this.userRepository.findById(ctx.user);
    ctx.log.info(`Refreshing tokens for user with id=${user.id}`);
    this.validateSession(ctx.session, user.sessions);
    await this.setAuthTokens(ctx, user);
    await this.authService.removeSession(user.id, ctx.session);
    ctx.log.info(`User with id=${user.id} successfully refreshed tokens`);
    ctx.status = 200;
    ctx.body = UserDto.from(user);
  }

  @Post('/logout')
  @Pre(refresh)
  async logout(ctx: Context) {
    await this.authService.removeSession(ctx.user, ctx.session);
    this.clearAuthTokens(ctx);
    ctx.status = 204;
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

  @Post('/magic/login/request')
  async magicLoginRequest(ctx: Context) {
    const {email} = ctx.body;
    const user = await this.userRepository.find({email});
    await this.transporter.tempLogin(user);
    ctx.status = 202;
  }

  @Put('/magic/login')
  async magicLogin(ctx: Context) {
    const { token } = ctx.request.body;
    const payload = TokenUtils.decode(token, Token.MagicLogin);
    const user = await this.userRepository.findById(payload.id);
    if (user.sessions.includes(payload.session)) {
      throw Errors.gone('temp login token has already been used');
    }
    // add session id manually
    this.setAuthTokens(ctx, user);
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
      throw Errors.forbidden('invalid session');
    }
  }

}