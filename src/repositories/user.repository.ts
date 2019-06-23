import { Database } from '../database/database';
import { Collection, ObjectId } from 'mongodb';
import { User } from '../models/user';

export class UserRepository {

  private collection: Collection;

  constructor(database: Database) {
    this.collection = database.getCollection('users');
  }

  async findById(id: string): Promise<User> {
    const entity = await this.collection.findOne({ _id: new ObjectId(id) });
    return entity && new User(entity);
  }

  async find(options: {}): Promise<User> {
    const entity = await this.collection.findOne(options);
    return entity && new User(entity);
  }

  async create(user: User) {
    return this.collection.insertOne(user);
  }

  async updateSessions(id: string, sessions: string[]) {
    return this.collection.updateOne({ _id: new ObjectId(id) }, {
      $set: { sessions }
    });
  }
}