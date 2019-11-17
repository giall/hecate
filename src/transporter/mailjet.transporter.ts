import { MailOptions, Transporter } from './transporter';
import * as https from 'https';
import { ClientRequestArgs } from 'http';
import { properties } from '../properties/properties';
import { Logger } from '../logger/logger';

export class MailJetTransporter implements Transporter {
  log: Logger;
  auth: string;

  constructor() {
    this.log = new Logger();
    const {username, password} = properties.mailjet;
    this.auth = Buffer.from(`${username}:${password}`).toString('base64');
  }

  send(options: MailOptions): Promise<void> {
    const data = this.data(options);
    const args = this.args(data.length);
    this.log.debug(`Sending request to MailJet API with data=${data} and args:`, args);
    const request = https.request(args, res => {
      this.log.info(`Sent request to MailJet API and received response with statusCode=${res.statusCode}`);
      res.on('data', data => {
        this.log.info('MailJetAPI response: ', Buffer.from(data).toString());
      })
    });
    request.on('error', err => this.log.error(err));
    request.write(data);
    request.end();
    return Promise.resolve();
  }

  private args(length: number): ClientRequestArgs {
    return {
      hostname: 'api.mailjet.com',
      port: 443,
      path: '/v3.1/send',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': length,
        'Authorization': `Basic ${this.auth}`
      }
    };
  }

  private data(options: MailOptions): string {
    return JSON.stringify({
      Messages: [{
        From: {Email: options.from.email, Name: options.from.name},
        To: [{Email: options.to.email, Name: options.to.name}],
        Subject: options.subject,
        TextPart: options.text,
        HTMLPart: options.html
      }]
    });
  }
}
