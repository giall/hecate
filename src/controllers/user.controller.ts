import { Controller, Delete, Json, KoaController, Post, Pre, Put, Validate } from 'koa-joi-controllers';
import { authOptions } from './validation';
import { Context } from 'koa';
import { UserDto } from '../models/user';
import { Token, TokenUtils } from '../utils/token.utils';
import { requireAccessToken } from '../middleware/middleware';
import { UserService } from '../services/user.service';

@Controller('/user')
export class UserController extends KoaController {
  private userService: UserService;

  constructor(userService: UserService) {
    super();
    this.userService = userService;
  }

  @Post('/register')
  @Validate(authOptions.register)
  async register(ctx: Context) {
    const {username, email, password} = ctx.request.body;
    const user = await this.userService.register({username, email, password});
    ctx.status = 201;
    ctx.body = UserDto.from(user);
  }

  @Put('/email/verify')
  @Validate(authOptions.token)
  async verifyEmail(ctx: Context) {
    const {token} = ctx.request.body;
    ctx.log.debug(`email verification token: ${token}`);
    const userId = TokenUtils.decode(token, Token.EmailVerification).id;
    ctx.log.info(`Verifying email for user with id=${userId}`);
    await this.userService.verifyEmail(userId);
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
    const {email} = ctx.body;
    await this.userService.resetPasswordRequest(email);
    ctx.status = 202;
  }

  @Put('/password/reset')
  @Validate(authOptions.passwordChange)
  async resetPassword(ctx: Context) {
    const {token, newPassword} = ctx.request.body;
    const payload = TokenUtils.decode(token, Token.PasswordReset);
    await this.userService.resetPassword(payload.id, payload.password, newPassword);
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