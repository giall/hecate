import { Logger } from '../logger/logger';
import { SqliteConnectionOptions } from 'typeorm/driver/sqlite/SqliteConnectionOptions';
import { createConnection, Connection, Repository } from 'typeorm';
import { User } from './entity/user';

export class Database {

  connection: Connection;

  private logger: Logger;

  private options: SqliteConnectionOptions = {
    type: 'sqlite',
    database: 'db.sqlite',
    synchronize: true,
    entities: [
      __dirname + '/entity/*.{js,ts}'
    ],
    logging: true // disable in PROD?
  }

  constructor() {
    this.logger = new Logger();
  }

  async connect(): Promise<void> {
    this.logger.info('Connecting to database...');
    this.connection = await createConnection(this.options);
    this.logger.info('Successfully connected to database.');
  }

  disconnect(): void {
    this.connection.close();
  }

  getUsers(): Repository<User> {
    return this.connection.getRepository(User);
  }

}