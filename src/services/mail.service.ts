import { properties } from '../properties/properties';
import { User } from '../models/user';
import { TokenUtils } from '../utils/token.utils';
import { Address, Transporter } from '../transporter/transporter';
import { Logger } from '../logger/logger';

export class MailService {
  private log: Logger;
  private transporter: Transporter;

  private readonly app: string;
  private readonly from: Address;

  constructor(transporter: Transporter) {
    this.log = new Logger();
    this.transporter = transporter;
    this.app = properties.app.name;
    this.from = {
      email: properties.app.email,
      name: properties.app.name
    };
  }

  async emailVerification(user: User): Promise<void> {
    const token = TokenUtils.emailVerification(user);
    const emailVerificationUrl = `${properties.web.host}/${properties.web.endpoints.emailVerification}?token=${token}`;
    this.log.debug(`Email verification url: ${emailVerificationUrl}`);
    const subject = 'Please verify your email';
    const text = `Welcome to ${this.app}, ${user.username}!\n\nPlease verify your email by following this link: ${emailVerificationUrl}\n\nThank you,\nThe ${this.app} Team`;
    const html = `Welcome to ${this.app}, ${user.username}!<br/><br/>
        Please verify your email by <a href="${emailVerificationUrl}">following this link</a>.<br/><br/>
        Thank you,<br/>The ${(this.app)} Team`;
    return this.transporter.send({
      from: this.from, to: this.to(user), subject, text, html
    });
  }

  async passwordReset(user: User): Promise<void> {
    const token = TokenUtils.passwordReset(user);
    const passwordResetUrl = `${properties.web.host}/${properties.web.endpoints.passwordReset}?token=${token}`;
    this.log.debug(`Password reset url: ${passwordResetUrl}`);
    const subject = 'Password reset';
    const text = `Hi ${user.username},\n\nYou have requested to reset your password.\n\nYou can do so by following this link: ${passwordResetUrl}\n\n
      If this wasn't you, you can ignore this email.\n\nThank you,\nThe ${this.app} Team`;
    const html = `Hi ${user.username},<br/><br/>
      You have requested to reset your password.<br/><br/>
      You can do so by <a href=\"${passwordResetUrl}\">following this link</a>.<br/><br/>
      If this wasn't you, you can ignore this email.<br/><br/>
      Thank you,<br/>The ${this.app} Team`;
    return this.transporter.send({
      from: this.from, to: this.to(user), subject, text, html
    });
  }

  async magicLogin(user: User): Promise<void> {
    const token = TokenUtils.magicLogin(user);
    const magicLoginUrl = `${properties.web.host}/${properties.web.endpoints.magicLogin}?token=${token}`;
    this.log.debug(`Magic login url: ${magicLoginUrl}`);
    const subject = `Sign in to ${this.app}`;
    const text = `Hi ${user.username},\n\nYou can sign in to your account by following this link: ${magicLoginUrl}
      \n\nThe link can only be used once will expire in 5 minutes.
      \n\nThank you,\nThe ${this.app} Team`;
    const html = `Hi ${user.username},<br/><br/>
        You can sign in to your account by <a href="${magicLoginUrl}">following this link</a>.<br/><br/>
        The link can only be used once will expire in 5 minutes.<br/><br/>
        Thank you,<br/>The ${this.app} Team`;
    return this.transporter.send({
      from: this.from, to: this.to(user), subject, text, html
    });
  }

  private to(user: User): Address {
    return {
      email: user.email,
      name: user.username
    };
  }
}
