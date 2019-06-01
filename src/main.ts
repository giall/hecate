import { App } from './app';
import { config } from 'dotenv';

config();

const app = new App();
app.bootstrap();