import { authOptions } from './validation';
import { Controller, KoaController, Post, Validate, Pre, Put } from 'koa-joi-controllers';
import { Context } from 'koa';
import { AuthService } from '../services/auth.service';
import { TokenUtils, Token, Payload } from '../services/token.service';
import { UserRepository } from '../repositories/user.repository';
import { Errors } from '../error/errors';
import { loginRateLimit, requireAccessToken } from '../middleware/middleware';
import { User } from '../models/user';
import { Transporter } from '../mail/transporter';

@Controller('/api')
export class ApiController extends KoaController {

  userRepository: UserRepository;
  authService: AuthService;
  transporter: Transporter;

  constructor(userRepository: UserRepository, authService: AuthService, transporter: Transporter) {
    super();
    this.userRepository = userRepository;
    this.authService = authService;
    this.transporter = transporter;
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
    ctx.log.info(`User with id=${user.id} successfully logged in`);
    await this.setTokens(ctx, user);
    ctx.status = 200;
  }

  @Post('/logout')
  async logout(ctx: Context) {
    const refreshToken = ctx.cookies.get(Token.Refresh);
    const payload = TokenUtils.decode(refreshToken, Token.Refresh) as Payload;
    await this.authService.removeSession(payload.id, payload.session);
    this.clearTokens(ctx);
    ctx.status = 200;
  }

  @Post('/refresh')
  async refresh(ctx: Context) {
    const refreshToken = ctx.cookies.get('refresh');
    const payload = TokenUtils.decode(refreshToken, Token.Refresh) as Payload;
    const user: User = await this.userRepository.findById(payload.id);
    ctx.log.info(`Refreshing tokens for user with id=${user.id}`);
    if (user.sessions.includes(payload.session)) {
      await this.setTokens(ctx, user);
      await this.authService.removeSession(user.id, payload.session);
      ctx.log.info('New access and refresh tokens set');
      ctx.status = 200;
    } else {
      throw Errors.forbidden('invalid session');
    }
  }

  @Post('/invalidate')
  async invalidate(ctx: Context) {
    const refreshToken = ctx.cookies.get(Token.Refresh);
    const payload = TokenUtils.decode(refreshToken, Token.Refresh) as Payload;
    const user: User = await this.userRepository.findById(payload.id);
    ctx.log.info(`Invalidating refresh tokens for user with id=${user.id}`);
    if (user.sessions.includes(payload.session)) {
      await this.authService.resetSessions(user.id);
      this.clearTokens(ctx);
      ctx.log.info('Tokens successfully invalidated');
      ctx.status = 200;
    } else {
      throw Errors.forbidden('invalid session');
    }
  }

  @Put('/email/verify')
  async verifyEmail(ctx: Context) {
    // TODO verify email
  }

  @Put('/password/reset')
  async resetPassword(ctx: Context) {
    const email = 'giallouros.christos@outlook.com';
    ctx.log.info(`Sending password reset email to ${email}`);
    await this.transporter.passwordReset(email);
    ctx.status = 200;
  }

  @Put('/password/change')
  @Pre(requireAccessToken)
  @Validate(authOptions.passwordChange)
  async changePassword(ctx: Context) {
    const { oldPassword, newPassword } = ctx.request.body;
    await this.authService.changePassword(ctx.user, oldPassword, newPassword);
    ctx.status = 200;
  }

  private async setTokens(ctx: Context, user: User) {
    const options = { secure: false, httpOnly: false };

    const accessToken = TokenUtils.access(user);
    ctx.cookies.set(Token.Access, accessToken, options);

    const session = await this.authService.addSession(user.id);
    const refreshToken = TokenUtils.refresh(user, session);
    ctx.cookies.set(Token.Refresh, refreshToken, options);
  }

  private clearTokens(ctx: Context) {
    ctx.cookies.set(Token.Access, undefined);
    ctx.cookies.set(Token.Refresh, undefined);
  }
}