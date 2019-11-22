import { Controller, KoaController, Post, Pre, Put, Validate } from 'koa-joi-controllers';
import { Field, params } from '../utils/validation.utils';
import { Context } from 'koa';
import { UserDto } from '../models/user';
import { decode, Token } from '../utils/token.utils';
import { access } from '../middleware/auth.middleware';
import { UserService } from '../services/user.service';
import { userLogin } from '../utils/auth.utils';
import { AuthService } from '../services/auth.service';

@Controller('/user')
export class UserController extends KoaController {
  private readonly userService: UserService;
  private readonly authService: AuthService;

  constructor(userService: UserService, authService: AuthService) {
    super();
    this.userService = userService;
    this.authService = authService;
  }

  @Post('/register')
  @Validate(params({
    email: Field.Email,
    username: Field.Username,
    password: Field.Password
  }))
  async register(ctx: Context) {
    const {username, email, password} = ctx.request.body;
    const user = await this.userService.register({username, email, password});
    await userLogin(this.authService, ctx, user);
    ctx.send(201, {message: 'Registered successfully.', user: UserDto.from(user)});
  }

  @Put('/email/verification')
  @Validate(params({
    token: Field.Token
  }))
  async emailVerification(ctx: Context) {
    const {token} = ctx.request.body;
    ctx.log.debug(`email verification token: ${token}`);
    const { id, email } = decode(token, Token.EmailVerification);
    ctx.log.info(`Verifying email for user with id=${id}`);
    await this.userService.verifyEmail(id, email);
    ctx.send(200, 'Email has been verified.');
  }

  @Put('/email/change')
  @Validate(params({
    email: Field.Email,
    password: Field.Password
  }))
  @Pre(access)
  async changeEmail(ctx: Context) {
    const {email, password} = ctx.request.body;
    await this.userService.changeEmail(ctx.user, email, password);
    ctx.send(200, 'Email changed.');
  }

  @Put('/password/change')
  @Validate(params({
    oldPassword: Field.Password,
    newPassword: Field.Password
  }))
  @Pre(access)
  async changePassword(ctx: Context) {
    const {oldPassword, newPassword} = ctx.request.body;
    await this.userService.changePassword(ctx.user, oldPassword, newPassword);
    ctx.send(200, 'Password was changed.');
  }

  @Post('/password/reset/request')
  @Validate(params({
    email: Field.Email
  }))
  async resetPasswordRequest(ctx: Context) {
    const {email} = ctx.request.body;
    await this.userService.resetPasswordRequest(email);
    ctx.send(202, 'Password reset email was sent.');
  }

  @Put('/password/reset')
  @Validate(params({
    token: Field.Token,
    newPassword: Field.Password
  }))
  async resetPassword(ctx: Context) {
    const {token, newPassword} = ctx.request.body;
    const payload = decode(token, Token.PasswordReset);
    await this.userService.resetPassword(payload.id, payload.hash, newPassword);
    ctx.send(200, 'Password was changed.');
  }

  @Put('/delete')
  @Validate(params({
    password: Field.Password
  }))
  @Pre(access)
  async deleteUser(ctx: Context) {
    const {password} = ctx.request.body;
    await this.userService.deleteUser(ctx.user, password);
    ctx.cookies.set(Token.Access, undefined);
    ctx.cookies.set(Token.Refresh, undefined);
    ctx.send(200, 'Account deleted.');
  }
}
