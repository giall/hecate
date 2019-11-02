import { Database } from '../database/database';
import { Collection, ObjectId } from 'mongodb';
import { User } from '../models/user';
import { hash } from 'bcrypt';
import { Errors } from '../error/errors';

export class UserRepository {

  private collection: Collection;

  constructor(database: Database) {
    this.collection = database.getCollection('users');
  }

  async findById(id: string): Promise<User> {
    const entity = await this.collection.findOne(this.getFilter(id));
    if (!entity) throw Errors.badRequest(`user with id=${id} does not exist`);
    return User.from(entity);
  }

  async find(options: {}): Promise<User> {
    const entity = await this.collection.findOne(options);
    return entity && User.from(entity);
  }

  async create(user: User): Promise<User> {
    const result = await this.collection.insertOne(user);
    return result.ops[0] as User;
  }

  async remove(id: string) {
    return this.collection.deleteOne(this.getFilter(id));
  }

  async changePassword(id: string, password: string) {
    return this.collection.updateOne(this.getFilter(id), {
      $set: { hash: await hash(password, 10) }
    });
  }

  async changeEmail(id: string, email: string) {
    return this.collection.updateOne(this.getFilter(id), {
      $set: { email, verified: false }
    });
  }

  async verifyEmail(id: string) {
    return this.collection.updateOne(this.getFilter(id), {
      $set: { verified: true }
    });
  }

  async updateSessions(id: string, sessions: string[]) {
    return this.collection.updateOne(this.getFilter(id), {
      $set: { sessions }
    });
  }

  private getFilter(id: string) {
    return { _id: new ObjectId(id) };
  }
}