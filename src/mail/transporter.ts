import * as nodemailer from 'nodemailer';
import { properties } from '../properties/properties';
import { User } from '../models/user';
import { TokenUtils } from '../utils/token.utils';

export class Transporter {
  transporter: nodemailer.Transporter;

  constructor() {
    const { host, auth } = properties.smtp;
    this.transporter = nodemailer.createTransport({
      host,
      port: 587,
      secure: false,
      auth
    });
  }

  async emailVerification(user: User) {
    const token = TokenUtils.emailVerification(user);
    const emailVerificationUrl = `${properties.web.host}/${properties.web.endpoints.emailVerification}?token=${token}`;
    const appName = properties.app.name;
    await this.transporter.sendMail({
      from: `"${appName}" <hello@giall.dev>`,
      to: user.email,
      subject: 'Please verify your email',
      text: `Hi ${user.username}!\n\nPlease verify your email by following this link: ${emailVerificationUrl}\n\nThank you,\nThe ${appName} Team`,
      html: `Hi <b>${user.username}</b>!<br/><br/>
        Please verify your email by <a href="${emailVerificationUrl}">following this link</a>.<br/><br/>
        Thank you,<br/>The ${appName} Team`
    });
  }

  async passwordReset(user: User) {
    const token = TokenUtils.passwordReset(user);
    const passwordResetUrl = `${properties.web.host}/${properties.web.endpoints.passwordReset}?token=${token}`;
    const appName = properties.app.name;
    await this.transporter.sendMail({
      from: `"${appName} <hello@giall.dev>"`,
      to: user.email,
      subject: 'Password reset',
      text: `Hi, ${user.username}</b>.\n\nYou have requested to reset your password.\n\nYou can do so by following this link: ${passwordResetUrl}\n\n
      If this wasn't you, you can ignore this email.\n\nThank you,\nThe ${appName} Team`,
      html: `Hi, <b>${user.username}.<br/><br/>
      You have requested to reset your password.<br/><br/>
      You can do so <a href=\"${passwordResetUrl}\">following this link</a>.<br/><br/>
      If this wasn't you, you can ignore this email.<br/><br/>
      Thank you,<br/>The ${appName} Team`
    });
  }

  async tempLogin(user: User) {
    const token = TokenUtils.magicLogin(user);
    const magicLoginUrl = `${properties.web.host}/${properties.web.endpoints.magicLogin}?token=${token}`;
    const appName = properties.app.name;
    await this.transporter.sendMail({
      from: `"${appName}" <hello@giall.dev>`,
      to: user.email,
      subject: `Sign in to ${appName}`,
      text: `Hi ${user.username},\n\nYou can sign in to your account by following this link: ${magicLoginUrl}
      \n\nThe link can only be used once will expire in 5 minutes.
      \n\nThank you,\nThe ${appName} Team`,
      html: `Hi ${appName}, <b>${user.username}</b>,<br/><br/>
        You can sign in to your account by <a href="${magicLoginUrl}">following this link</a>.<br/><br/>
        The link can only be used once will expire in 5 minutes.<br/><br/>
        Thank you,<br/>The ${appName} Team`
    });
  }
}