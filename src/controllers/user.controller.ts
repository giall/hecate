import { Controller, Delete, Json, KoaController, Post, Pre, Put, Validate } from 'koa-joi-controllers';
import { authOptions } from './validation';
import { Context } from 'koa';
import { properties } from '../properties/properties';
import { UserDto } from '../models/user';
import { UserRepository } from '../repositories/user.repository';
import { AuthService } from '../services/auth.service';
import { Transporter } from '../mail/transporter';
import { Token, TokenUtils } from '../utils/token.utils';
import { Errors } from '../error/errors';
import { requireAccessToken } from '../middleware/middleware';
import { UserService } from '../services/user.service';

@Controller('/user')
export class UserController extends KoaController {
  userRepository: UserRepository;
  userService: UserService;
  transporter: Transporter;

  constructor(userRepository: UserRepository, userService: UserService,
    transporter: Transporter) {
    super();
    this.userRepository = userRepository;
    this.userService = userService;
    this.transporter = transporter;
  }

  @Post('/register')
  @Validate(authOptions.register)
  async register(ctx: Context) {
    const {username, email, password} = ctx.request.body;
    const user = await this.userService.register({username, email, password});
    if (properties.options.emailVerificationRequired) {
      ctx.log.info(`Sending email to ${email} for verification`);
      await this.transporter.emailVerification(user);
    }
    ctx.status = 201;
    ctx.body = UserDto.from(user);
  }

  @Put('/email/verify')
  @Validate(authOptions.token)
  async verifyEmail(ctx: Context) {
    const {token} = ctx.request.body;
    ctx.log.debug(`email verification token: ${token}`);
    const payload = TokenUtils.decode(token, Token.EmailVerification);
    ctx.log.info(`Verifying email for user with id=${payload.id}`);
    const user = await this.userRepository.findById(payload.id);
    if (user.verified) {
      throw Errors.gone(`User with id=${payload.id} has already verified their email`);
    }
    await this.userRepository.verifyEmail(payload.id);
    ctx.status = 204;
  }

  @Put('/email/change')
  @Validate(authOptions.emailChange)
  @Pre(requireAccessToken)
  async changeEmail(ctx: Context) {
    const {email, password} = ctx.request.body;
    await this.userService.changeEmail(ctx.user, email, password);
  }

  @Post('/password/reset/request')
  @Json()
  async resetPasswordRequest(ctx: Context) {
    const email = ctx.body.email;
    const user = await this.userRepository.find({email});
    if (user) {
      ctx.log.info(`Sending password reset email to ${email}`);
      await this.transporter.passwordReset(user);
    } else {
      ctx.log.warn(`Cannot reset password; no account with email ${email}`);
    }
    ctx.status = 202;
  }

  @Put('/password/reset')
  @Validate(authOptions.passwordChange)
  async resetPassword(ctx: Context) {
    const {token, newPassword} = ctx.request.body;
    const payload = TokenUtils.decode(token, Token.PasswordReset);
    const user = await this.userRepository.findById(payload.id);
    if (user.password !== payload.password) {
      throw Errors.unauthorized(`Current hash for user with id=${payload.id} does not match with the one in the token`);
    }
    await this.userRepository.changePassword(payload.id, newPassword);
    ctx.status = 204;
  }

  @Put('/password/change')
  @Validate(authOptions.passwordChange)
  @Pre(requireAccessToken)
  async changePassword(ctx: Context) {
    const {oldPassword, newPassword} = ctx.request.body;
    await this.userService.changePassword(ctx.user, oldPassword, newPassword);
    ctx.status = 204;
  }

  @Delete('/user/delete')
  @Validate(authOptions.password)
  @Pre(requireAccessToken)
  async deleteUser(ctx: Context) {
    const {password} = ctx.request.body;
    await this.userService.deleteUser(ctx.user, password);
    ctx.status = 204;
  }
}