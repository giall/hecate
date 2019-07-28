import { authOptions } from './validation';
import { Controller, KoaController, Post, Validate, Pre, Put } from 'koa-joi-controllers';
import { Context } from 'koa';
import { AuthService } from '../services/auth.service';
import { TokenUtils, Token, Payload } from '../utils/token.utils';
import { UserRepository } from '../repositories/user.repository';
import { Errors } from '../error/errors';
import { loginRateLimit, requireAccessToken } from '../middleware/middleware';
import { User, UserDto } from '../models/user';
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
    const user = await this.authService.register({ username, email, password });
    ctx.status = 201;
    ctx.body = UserDto.from(user);
  }

  @Post('/login')
  @Pre(loginRateLimit)
  @Validate(authOptions.login)
  async login(ctx: Context) {
    const { email, password } = ctx.request.body;
    const user = await this.authService.login(email, password);
    ctx.log.info(`User with id=${user.id} successfully logged in`);
    await this.setAuthTokens(ctx, user);
    ctx.status = 200;
    ctx.body = UserDto.from(user);
  }

  @Post('/tokenLogin')
  async tokenLogin(ctx: Context) {
    const refreshToken = ctx.cookies.get(Token.Refresh);
    if (!refreshToken) {
      throw Errors.unauthorized('No refresh token cookie included in /tokenLogin request');
    }
    const payload = TokenUtils.decode(refreshToken, Token.Refresh) as Payload;
    const user = await this.userRepository.findById(payload.id);
    ctx.log.info(`User with id=${user.id} successfully logged in via refresh token`);
    await this.setAuthTokens(ctx, user);
    ctx.status = 200;
    ctx.body = {
      username: user.username,
      email: user.email,
      role: user.role,
      verified: user.verified
    }
  }

  @Post('/logout')
  async logout(ctx: Context) {
    const refreshToken = ctx.cookies.get(Token.Refresh);
    const payload = TokenUtils.decode(refreshToken, Token.Refresh) as Payload;
    await this.authService.removeSession(payload.id, payload.session);
    this.clearAuthTokens(ctx);
    ctx.status = 200;
  }

  @Post('/refresh')
  async refresh(ctx: Context) {
    const refreshToken = ctx.cookies.get('refresh');
    const payload = TokenUtils.decode(refreshToken, Token.Refresh) as Payload;
    const user = await this.userRepository.findById(payload.id);
    ctx.log.info(`Refreshing tokens for user with id=${user.id}`);
    if (user.sessions.includes(payload.session)) {
      await this.setAuthTokens(ctx, user);
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
    const user = await this.userRepository.findById(payload.id);
    ctx.log.info(`Invalidating refresh tokens for user with id=${user.id}`);
    if (user.sessions.includes(payload.session)) {
      await this.authService.resetSessions(user.id);
      this.clearAuthTokens(ctx);
      ctx.log.info('Tokens successfully invalidated');
      ctx.status = 200;
    } else {
      throw Errors.forbidden('invalid session');
    }
  }

  @Put('/email/verify')
  async verifyEmail(ctx: Context) {
    const token = ctx.query.token;
    const payload = TokenUtils.decode(token, Token.EmailVerification);
    const user = await this.userRepository.findById(payload.id);
    if (user.verified) {
      throw Errors.badRequest(`User with id=${payload.id} has already verified their email`);
    }
    await this.userRepository.verifyEmail(payload.id);
    ctx.status = 200;
  }

  @Put('/password/reset')
  async resetPassword(ctx: Context) {
    const email = 'giallouros.christos@outlook.com'; // {} ctx.body.email
    const user = await this.userRepository.find({email});
    if (user) {
      const token = TokenUtils.passwordReset(user);
      // send email with token in reset link
      ctx.log.info(`Sending password reset email to ${email}`);
      await this.transporter.passwordReset(email);
    } else {
      ctx.log.warn(`Cannot reset password; no account with email ${email}`);
    }
    ctx.status = 202;
  }

  @Put('/password/change')
  @Pre(requireAccessToken)
  @Validate(authOptions.passwordChange)
  async changePassword(ctx: Context) {
    const { oldPassword, newPassword } = ctx.request.body;
    await this.authService.changePassword(ctx.user, oldPassword, newPassword);
    ctx.status = 200;
  }

  @Put('/password/change')
  @Validate(authOptions.passwordChange)
  async changePassword2(ctx: Context) {
    const { token, newPassword } = ctx.request.body;
    const payload = TokenUtils.decode(token, Token.PasswordReset);
    const user = await this.userRepository.findById(payload.id);
    if (user.password !== payload.password) {
      throw Errors.unauthorized(`Current hash for user with id=${payload.id} does not match with the one in the token`);
    }
    await this.userRepository.changePassword(payload.id, newPassword);
    ctx.status = 200;
  }

  @Post('/temp/login/request')
  async tempLoginReq(ctx: Context) {
    const { email } = ctx.body;
    const user = await this.userRepository.find({ email });
    const token = TokenUtils.tempLogin(user);
    // await this.transporter.tempLogin(email)
    ctx.status = 202;
  }

  @Put('/temp/login')
  async tempLogin(ctx: Context) {
    const { token } = ctx.request.body;
    const payload = TokenUtils.decode(token, Token.TempLogin);
    const user = await this.userRepository.findById(payload.id);
    this.setAuthTokens(ctx, user);
    ctx.status = 200;
  }

  private async setAuthTokens(ctx: Context, user: User) {
    const options = { secure: false, httpOnly: false };

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
}