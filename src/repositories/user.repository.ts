import { User } from '../database/entity/user';
import { Repository } from 'typeorm';
import { Database } from '../database/database';
import { hash as hashPassword } from 'bcrypt';

export class UserRepository {
  private repository: Repository<User>;

  constructor(database: Database) {
    this.repository = database.getUsers();
  }

  async findById(id: number): Promise<User> {
    return this.repository.findOne(id);
  }

  async find(params: {}): Promise<User> {
    return this.repository.findOne(params);
  }

  async create(user: {username: string; password: string; email: string}) {
    const {username, password, email} = user;
    const hash = await hashPassword(password, 10);
    return this.repository.save({username, hash, email, role: 'user'});
  }

  async update(user: User) {
    return this.repository.save(user);
  }
}