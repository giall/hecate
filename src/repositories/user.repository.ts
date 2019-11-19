import { Database } from '../database/database';
import { User } from '../models/user';
import { Errors } from '../error/errors';
import { Logger } from '../logger/logger';
import { filter } from '../utils/db.utils';

export class UserRepository {

  private log: Logger;
  private database: Database;

  constructor(database: Database) {
    this.log = new Logger();
    this.database = database;
  }

  async collection() {
    return this.database.getCollection('users');
  }

  async findById(id: string): Promise<User> {
    const collection = await this.collection();
    const entity = await collection.findOne(filter(id));
    if (!entity) {
      this.log.warn(`user with id=${id} does not exist`);
      throw Errors.badRequest('Invalid user.');
    }
    return User.from(entity);
  }

  async find(options: {}): Promise<User> {
    const collection = await this.collection();
    const entity = await collection.findOne(options);
    return entity && User.from(entity);
  }

  async create(user: User): Promise<User> {
    const collection = await this.collection();
    const result = await collection.insertOne(user);
    return result.ops[0] as User;
  }

  async update(id: string, options: {}) {
    const collection = await this.collection();
    return collection.updateOne(filter(id), {
      $set: options
    });
  }

  async remove(id: string) {
    const collection = await this.collection();
    return collection.deleteOne(filter(id));
  }

  async updateSessions(id: string, sessions: string[]) {
    const collection = await this.collection();
    return collection.updateOne(filter(id), {
      $set: {sessions}
    });
  }
}
