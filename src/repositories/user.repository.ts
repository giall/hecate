import { Database } from '../database/database';
import { Collection, ObjectId } from 'mongodb';
import { User } from '../models/user';
import { hash } from 'bcrypt';
import { Errors } from '../error/errors';
import { Logger } from '../logger/logger';

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
    const entity = await collection.findOne(this.getFilter(id));
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

  async remove(id: string) {
    const collection = await this.collection();
    return collection.deleteOne(this.getFilter(id));
  }

  async changePassword(id: string, password: string) {
    const collection = await this.collection();
    return collection.updateOne(this.getFilter(id), {
      $set: {hash: await hash(password, 10)}
    });
  }

  async changeEmail(id: string, email: string) {
    const collection = await this.collection();
    return collection.updateOne(this.getFilter(id), {
      $set: {email, verified: false}
    });
  }

  async verifyEmail(id: string) {
    const collection = await this.collection();
    return collection.updateOne(this.getFilter(id), {
      $set: {verified: true}
    });
  }

  async updateSessions(id: string, sessions: string[]) {
    const collection = await this.collection();
    return collection.updateOne(this.getFilter(id), {
      $set: {sessions}
    });
  }

  async allowMagicLogin(id: string) {
    const collection = await this.collection();
    return collection.updateOne(this.getFilter(id), {
      $set: {allowMagicLogin: true}
    });
  }

  async useMagicLogin(id: string) {
    const collection = await this.collection();
    return collection.updateOne(this.getFilter(id), {
      $set: {allowMagicLogin: false}
    });
  }

  private getFilter(id: string) {
    return {_id: new ObjectId(id)};
  }
}
