import { authOptions } from './validation';
import { Controller, KoaController, Post, Validate, Pre } from 'koa-joi-controllers';
import { Context } from 'koa';
import { AuthService } from '../services/auth.service';
import { TokenService, RefreshPayload, Token } from '../services/token.service';
import { v4 as uuid } from 'uuid';
import { UserRepository } from '../repositories/user.repository';
import { Errors } from '../error/errors';
import { loginRateLimit } from '../middleware/middleware';
import { User } from '../models/user';

@Controller('/api')
export class AuthController extends KoaController {

  userRepository: UserRepository;
  authService: AuthService;
  tokenService: TokenService;

  constructor(userRepository: UserRepository, authService: AuthService, tokenService: TokenService) {
    super();
    this.userRepository = userRepository;
    this.authService = authService;
    this.tokenService = tokenService;
  }

  @Post('/register')
  @Validate(authOptions.register)
  async register(ctx: Context) {
    const { username, email, password } = ctx.request.body;
    await this.authService.register({ username, email, password });
    ctx.status = 201;
  }

  @Post('/login')
  @Pre(loginRateLimit)
  @Validate(authOptions.login)
  async login(ctx: Context) {
    const { email, password } = ctx.request.body;
    const user = await this.authService.login(email, password);
    ctx.log.info(user._id.toHexString());
    ctx.log.info(user.id);
    ctx.log.info(`User with userId=${user.id} successfully logged in`);
    this.setTokens(ctx, user);
    ctx.status = 200;
  }

  @Post('/logout')
  async logout(ctx: Context) {
    const refreshToken = ctx.cookies.get('refresh');
    const payload: RefreshPayload = this.tokenService.decode(refreshToken, Token.Refresh) as RefreshPayload;
    this.authService.removeSession(payload.id, payload.session);
    this.clearTokens(ctx);
    ctx.status = 200;
  }

  @Post('/refresh')
  async refresh(ctx: Context) {
    const refreshToken = ctx.cookies.get('refresh');
    const payload: RefreshPayload = this.tokenService.decode(refreshToken, Token.Refresh) as RefreshPayload;
    const user: User = await this.userRepository.findById(payload.id);
    ctx.log.info(`Refreshing tokens for userId=${user.id}`);
    if (user.sessions.includes(payload.session)) {
      this.setTokens(ctx, user);
      this.authService.removeSession(user.id, payload.session);
      ctx.log.info('New access and refresh tokens set');
      ctx.status = 200;
    } else {
      throw Errors.forbidden('invalid session');
    }
  }

  @Post('/invalidate')
  async invalidate(ctx: Context) {
    const refreshToken = ctx.cookies.get('refresh');
    const payload: RefreshPayload = this.tokenService.decode(refreshToken, Token.Refresh) as RefreshPayload;
    const user: User = await this.userRepository.findById(payload.id);
    ctx.log.info(`Invalidating refresh tokens for userId=${user.id}`);
    if (user.sessions.includes(payload.session)) {
      this.authService.resetSessions(user.id);
      this.clearTokens(ctx);
      ctx.log.info('Tokens successfully invalidated');
      ctx.status = 200;
    } else {
      throw Errors.forbidden('invalid session');
    }
  }

  private setTokens(ctx: Context, user: User) {
    const options = { secure: false, httpOnly: false };
  
    const accessToken = this.tokenService.access(user);
    ctx.cookies.set('access', accessToken, options);

    const sessionId = uuid();
    const refreshToken = this.tokenService.refresh(user, sessionId);
    ctx.cookies.set('refresh', refreshToken, options);
    this.authService.addSession(user.id, sessionId);
  }

  private clearTokens(ctx: Context) {
    ctx.cookies.set('access', undefined);
    ctx.cookies.set('refresh', undefined);
  }
}