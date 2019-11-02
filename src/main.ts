import { App } from './app';
import { Database } from './database/database';
import { properties } from './properties/properties';

const {user, password, url} = properties.mongodb;
const database = new Database(`mongodb+srv://${user}:${password}@${url}?retryWrites=true&w=majority`);

const app = new App(database);

app.bootstrap();