import { compare, hash } from 'bcrypt';
import { UserRepository } from '../repositories/user.repository';
import { Logger } from '../logger/logger';
import { Errors } from '../error/errors';
import { User } from '../models/user';

export class AuthService {
  private userRepository: UserRepository;
  private logger: Logger;

  constructor(userRepository: UserRepository) {
    this.logger = new Logger();
    this.userRepository = userRepository;
  }

  async register(newUser: { username: string; email: string; password: string }) {
    const { username, email, password } = newUser;
    this.logger.info(`Registering user: ${username} with email: ${email}`);
    let user = await this.userRepository.find({username});
    if (user) {
      throw Errors.conflict(`User with username: ${username} already exists`);
    }
    user = await this.userRepository.find({email});
    if (user) {
      throw Errors.conflict(`User with email: ${email} already exists`);
    }
    return this.userRepository.create(new User({username, email, password: await hash(password, 10)}));
  }

  async login(email: string, password: string): Promise<User> {
    const user = await this.userRepository.find({email});
    if (!user) {
      throw Errors.notFound('User does not exist');
    }
    const success = await compare(password, user.password);
    if (!success) {
      throw Errors.unauthorized('Invalid password');
    }
    return user;
  }

  async addSession(userId: string, sessionId: string) {
    const user = await this.userRepository.findById(userId);
    if (user.sessions.length > 5) {
      user.sessions.shift(); // save up to 5 sessions at a time
    }
    user.sessions.push(sessionId);
    return this.userRepository.updateSessions(userId, user.sessions);
  }

  async removeSession(userId: string, sessionId: string) {
    const user = await this.userRepository.findById(userId);
    const sessions = user.sessions.filter(session => session !== sessionId);
    return this.userRepository.updateSessions(userId, sessions);
  }

  async resetSessions(userId: string) {
    return this.userRepository.updateSessions(userId, []);
  }
}