import { MongoClient, Collection } from 'mongodb';
import { Logger } from '../logger/logger';

export class Database {
  name: string;
  uri: string;

  client: MongoClient;
  logger: Logger;

  constructor() {
    this.logger = new Logger();
    this.name = process.env.MONGODB_NAME;

    const user = process.env.MONGODB_USER;
    const password = process.env.MONGODB_PASSWORD;
    const url = process.env.MONGODB_URL;
    this.uri = `mongodb+srv://${user}:${password}@${url}?retryWrites=true`;
  }

  async connect(): Promise<void> {
    this.logger.info(`Connecting to database ${this.name}...`)
    const options = { useNewUrlParser: true };
    this.client = await new MongoClient(this.uri, options).connect();
    this.logger.info('Successfully connected to database.');
  }

  disconnect(): void {
    this.client.close();
  }
  
  getCollection(collection: string): Collection {
    return this.client.db(this.name).collection(collection);
  }
}