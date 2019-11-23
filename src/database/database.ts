import { MongoClient, Collection } from 'mongodb';
import { Logger } from '../logger/logger';
import { properties } from '../properties/properties';

export class Database {

  private log: Logger;

  name: string;
  client: MongoClient;

  constructor(uri: string) {
    this.log = new Logger();
    this.name = properties.mongodb.name;
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true
    };
    this.client = new MongoClient(uri, options);
  }

  async ensureConnected() {
    if (!this.client.isConnected()) {
      await this.connect();
    }
  }

  private async connect(): Promise<void> {
    this.log.info('Connecting to database...');
    await this.client.connect();
    this.log.info('Successfully connected to database.');
  }

  async disconnect(): Promise<void> {
    await this.client.close();
    this.log.info('Disconnected from database.');
  }

  async getCollection(collection: string): Promise<Collection> {
    await this.ensureConnected();
    return this.client.db(this.name).collection(collection);
  }
}
