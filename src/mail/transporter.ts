import * as nodemailer from 'nodemailer';
import { properties } from '../properties/properties';

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

  async passwordReset(email: string) {
    await this.transporter.sendMail({
      from: '"App Name" <giall.dev@gmail.com>',
      to: email,
      subject: 'Password Reset',
      text: 'Reset your password',
      html: '<b>Password reset</b><br/>Reset your password'
    });
  }
}