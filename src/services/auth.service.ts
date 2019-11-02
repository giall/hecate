import { UserRepository } from '../repositories/user.repository';
import { Logger } from '../logger/logger';
import { Errors } from '../error/errors';
import { User } from '../models/user';
import { v4 as uuid } from 'uuid';
import { compare } from 'bcrypt';

export class AuthService {
  private userRepository: UserRepository;
  private logger: Logger;

  constructor(userRepository: UserRepository) {
    this.logger = new Logger();
    this.userRepository = userRepository;
  }

  async login(email: string, password: string): Promise<User> {
    const user = await this.userRepository.find({email});
    // do comparison even if user does not exist to prevent timing attacks
    const hash = user && user.password || '.';
    const success = await compare(password, hash);
    if (!user) {
      throw Errors.unauthorized(`User with email ${email} does not exist`);
    }
    if (!success) {
      throw Errors.unauthorized(`Invalid password for user with email ${email}`);
    }
    return user;
  }

  async addSession(userId: string): Promise<string> {
    const user = await this.userRepository.findById(userId);
    const session = uuid();
    if (user.sessions.length > 5) {
      user.sessions.shift(); // save up to 5 sessions at a time
    }
    user.sessions.push(session);
    await this.userRepository.updateSessions(userId, user.sessions);
    return session;
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