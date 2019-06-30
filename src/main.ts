import { config } from 'dotenv';
import { App } from './app';
import { Database } from './database/database';

config();

const user = process.env.MONGODB_USER;
const password = process.env.MONGODB_PASSWORD;
const url = process.env.MONGODB_URL;

const database = new Database(`mongodb+srv://${user}:${password}@${url}?retryWrites=true`);

const app = new App(database);

app.bootstrap();