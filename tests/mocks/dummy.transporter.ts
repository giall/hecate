import { MailOptions, Transporter } from '../../src/transporter/transporter';
import { log } from '../../src/logger/logger';

import { strict as assert } from 'assert';

export class DummyTransporter implements Transporter {
  private sent = false;

  send(options: MailOptions): Promise<void> {
    log.info('DummyTransporter sending mail with options:', options);
    this.sent = true;
    return Promise.resolve();
  }

  assertEmailSent() {
    assert(this.sent);
    this.sent = false;
  }

  assertNoEmailSent() {
    assert(!this.sent);
  }
}
