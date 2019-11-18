import { MailOptions, Transporter } from './transporter';
import * as https from 'https';
import { properties } from '../properties/properties';
import { Logger } from '../logger/logger';
import { mailJetRequest } from '../utils/mail.utils';

export class MailJetTransporter implements Transporter {
  log: Logger;
  auth: string;

  constructor() {
    this.log = new Logger();
    const {username, password} = properties.mailjet;
    this.auth = Buffer.from(`${username}:${password}`).toString('base64');
  }

  send(options: MailOptions): Promise<void> {
    const { data, args } = mailJetRequest(this.auth, options);
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
}
