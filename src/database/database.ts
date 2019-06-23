import { MongoClient, Collection } from 'mongodb';
import { Logger } from '../logger/logger';

export class Database {
  uri: string;

  client: MongoClient;
  logger: Logger;

  constructor(uri: string) {
    this.uri = uri;
    this.logger = new Logger();
  }

  async connect(): Promise<void> {
    this.logger.info('Connecting to database...');

    const options = { useNewUrlParser: true };
    console.log(this.uri);
    this.client = await new MongoClient(this.uri, options).connect();

    this.logger.info('Successfully connected to database.');
  }

  disconnect(): void {
    this.client.close();
    this.logger.info('Disconnected from database.');
  }

  getCollection(collection: string): Collection {
    const name = process.env.MONGODB_NAME;
    return this.client.db(name).collection(collection);
  }
}