import { User } from '../models/user';
import { Address, MailOptions } from '../transporter/transporter';

function to(user: User): Address {
  return {
    email: user.email,
    name: user.username
  };
}

function mailJetRequest(auth: string, options: MailOptions) {
  const data = JSON.stringify({
    Messages: [{
      From: {Email: options.from.email, Name: options.from.name},
      To: [{Email: options.to.email, Name: options.to.name}],
      Subject: options.subject,
      TextPart: options.text,
      HTMLPart: options.html
    }]
  });
  return {
    data,
    args: {
      hostname: 'api.mailjet.com',
      port: 443,
      path: '/v3.1/send',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
        'Authorization': `Basic ${auth}`
      }
    }
  }
}

export { to, mailJetRequest }
