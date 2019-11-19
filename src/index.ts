import { properties } from './properties/properties';
import { Database } from './database/database';
import { MailJetTransporter } from './transporter/mailjet.transporter';
import { App } from './app';

function create(): App {
  const {user, password, url} = properties.mongodb;
  const database = new Database(`mongodb+srv://${user}:${password}@${url}?retryWrites=true&w=majority`);
  const transporter = new MailJetTransporter();
  return new App(database, transporter);
}

const app = create();
const auth = app.bootstrap().callback();

export { auth };
