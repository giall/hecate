import * as nodemailer from 'nodemailer';
import { properties } from '../properties/properties';
import { MailOptions, Transporter } from './transporter';

export class SmtpTransporter implements Transporter {
  transporter: nodemailer.Transporter;

  constructor() {
    const { host, auth } = properties.smtp;
    this.transporter = nodemailer.createTransport({
      host,
      port: 587,
      secure: true,
      auth
    });
  }

  send(options: MailOptions): Promise<void> {
    return this.transporter.sendMail({
      from: `"${options.from.name}" <${options.from.email}>`,
      to: options.to.email,
      subject: options.subject,
      text: options.text,
      html: options.html
    });
  }
}
