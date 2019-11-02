import { Database } from '../database/database';
import { Collection, ObjectId } from 'mongodb';
import { User } from '../models/user';
import { hash } from 'bcrypt';

export class UserRepository {

  private collection: Collection;

  constructor(database: Database) {
    this.collection = database.getCollection('users');
  }

  async findById(id: string): Promise<User> {
    const entity = await this.collection.findOne({ _id: new ObjectId(id) });
    return entity && User.from(entity);
  }

  async find(options: {}): Promise<User> {
    const entity = await this.collection.findOne(options);
    return entity && User.from(entity);
  }

  async create(user: User): Promise<User> {
    const result = await this.collection.insertOne(user);
    return result.ops[0];
  }

  async changePassword(id: string, password: string) {
    return this.collection.updateOne({ _id: new ObjectId(id) }, {
      $set: { password: await hash(password, 10) }
    });
  }

  async verifyEmail(id: string) {
    return this.collection.updateOne({ _id: new ObjectId(id) }, {
      $set: { verified: true }
    });
  }

  async updateSessions(id: string, sessions: string[]) {
    return this.collection.updateOne({ _id: new ObjectId(id) }, {
      $set: { sessions }
    });
  }
}