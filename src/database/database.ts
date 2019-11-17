import { MongoClient, Collection } from 'mongodb';
import { Logger } from '../logger/logger';
import { properties } from '../properties/properties';

export class Database {
  uri: string;
  name: string;

  client: MongoClient;
  log: Logger;

  constructor(uri: string) {
    this.uri = uri;
    this.name = properties.mongodb.name;
    this.log = new Logger();
  }

  async connect(): Promise<void> {
    this.log.info('Connecting to database...');

    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true
    };
    this.client = await new MongoClient(this.uri, options).connect();

    this.log.info('Successfully connected to database.');
  }

  async disconnect(): Promise<void> {
    await this.client?.close();
    this.log.info('Disconnected from database.');
  }

  getCollection(collection: string): Collection {
    return this.client.db(this.name).collection(collection);
  }
}
