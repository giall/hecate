export interface Address {
  email: string;
  name: string;
}

export interface MailOptions {
  from: Address;
  to: Address;
  subject: string;
  text: string;
  html: string;
}

export interface Transporter {
  send(options: MailOptions): Promise<void>;
}
