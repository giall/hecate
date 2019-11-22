import { Controller, KoaController, Post, Pre, Validate } from 'koa-joi-controllers';
import { Field, params } from '../utils/validation.utils';
import { Context } from 'koa';
import { LimiterKeys, RateLimiter } from '../rate.limiter/rate.limiter';
import { UserRepository } from '../repositories/user.repository';
import { AuthService } from '../services/auth.service';
import { decode, Token } from '../utils/token.utils';
import { refresh } from '../middleware/auth.middleware';
import { clearAuthTokens, setRateLimitHeaders, userLogin, validateSession } from '../utils/auth.utils';
import { Errors } from '../error/errors';
import { User, UserDto } from '../models/user';

@Controller('/auth')
export class AuthController extends KoaController {
  private readonly userRepository: UserRepository;
  private readonly authService: AuthService;
  private readonly rateLimiter: RateLimiter;

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
    password: Field.Password,
    rememberMe: Field.RememberMe
  }))
  async login(ctx: Context) {
    const {email, password, rememberMe} = ctx.request.body;
    const keys: LimiterKeys = {email, ip: ctx.ip};
    const res = await this.rateLimiter.limit(keys);
    if (res.ok) {
      const user = await this.authService.login(email, password);
      if (user) {
        await this.rateLimiter.reset(keys);
        ctx.log.info(`User with id=${user.id} successfully logged in`);
        await this.userLogin(ctx, user, rememberMe);
      } else {
        setRateLimitHeaders(ctx, res);
        throw Errors.unauthorized('Invalid credentials.');
      }
    } else {
      setRateLimitHeaders(ctx, res);
      throw Errors.tooManyRequests('Too many attempts. Please try again later.');
    }
  }

  @Post('/logout')
  @Pre(refresh)
  async logout(ctx: Context) {
    await this.authService.removeSession(ctx.user, ctx.session);
    clearAuthTokens(ctx);
    ctx.send(200, 'Successfully logged out.');
  }

  @Post('/magic.login/request')
  @Validate(params({
    email: Field.Email
  }))
  async magicLoginRequest(ctx: Context) {
    const {email} = ctx.request.body;
    await this.authService.requestMagicLogin(email);
    ctx.send(202, 'One time login email was sent.');
  }

  @Post('/magic.login')
  @Validate(params({
    token: Field.Token
  }))
  async magicLogin(ctx: Context) {
    const {token} = ctx.request.body;
    const payload = decode(token, Token.MagicLogin);
    const user = await this.authService.magicLogin(payload.id);
    ctx.log.info(`User with id=${user.id} logged in via magic login`);
    await this.userLogin(ctx, user);
  }

  @Post('/refresh')
  @Pre(refresh)
  async refresh(ctx: Context) {
    const user = await this.userRepository.findById(ctx.user);
    ctx.log.info(`Refreshing tokens for user with id=${user.id}`);
    validateSession(ctx.session, user.sessions);
    await this.authService.removeSession(user.id, ctx.session);
    ctx.log.info(`User with id=${user.id} successfully refreshed tokens`);
    await this.userLogin(ctx, user);
  }

  @Post('/invalidate')
  @Pre(refresh)
  async invalidate(ctx: Context) {
    const user = await this.userRepository.findById(ctx.user);
    ctx.log.info(`Invalidating refresh tokens for user with id=${user.id}`);
    validateSession(ctx.session, user.sessions);
    await this.authService.resetSessions(user.id);
    clearAuthTokens(ctx);
    ctx.log.info('Tokens successfully invalidated');
    ctx.send(200, 'Logged out of all devices.');
  }

  async userLogin(ctx: Context, user: User, rememberMe = false) {
    await userLogin(this.authService, ctx, user, rememberMe);
    ctx.send(200, {message: 'Successfully logged in.', user: UserDto.from(user)});
  }
}
