import { MongoClient, Collection } from 'mongodb';
import { Logger } from '../logger/logger';
import { properties } from '../properties/properties';

export class Database {

  private log: Logger;
  private uri: string;

  name: string;
  client: MongoClient;

  constructor(uri: string) {
    this.log = new Logger();
    this.uri = uri;
    this.name = properties.mongodb.name;
  }

  isConnected(): boolean {
    return this.client?.isConnected();
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

  async getCollection(collection: string): Promise<Collection> {
    if (!this.isConnected()) {
      await this.connect();
    }
    return this.client.db(this.name).collection(collection);
  }
}
