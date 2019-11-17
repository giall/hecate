import { App } from './app';
import { Database } from './database/database';
import { properties } from './properties/properties';
import { log } from './logger/logger';
import { MailJetTransporter } from './transporter/mailjet.transporter';

const {user, password, url} = properties.mongodb;
const database = new Database(`mongodb+srv://${user}:${password}@${url}?retryWrites=true&w=majority`);

const transporter = new MailJetTransporter();

const app = new App(database, transporter);

app.bootstrap()
  .then(() => log.info(`App started successfully in ${process.env.NODE_ENV} environment.`))
  .catch(err => {
    log.error(err);
    app.terminate();
  });
