import { properties } from '../properties/properties';
import { MailOptions, Transporter } from './transporter';

// if using this class, run:
//  npm install nodemailer
//  npm install @types/nodemailer --save
export class SmtpTransporter implements Transporter {
  private transporter; // nodemailer.Transporter

  constructor() {
    const nodemailer = { createTransport: (_) => 0 }; // remove this line if using class
    this.transporter = nodemailer.createTransport(properties.smtp);
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
