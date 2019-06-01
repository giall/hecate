import { compare } from 'bcrypt';
import { User } from '../database/entity/user';
import { UserRepository } from '../repositories/user.repository';
import { Logger } from '../logger/logger';
import { Errors } from '../error/errors';

export class AuthService {
  private userService: UserRepository;
  private logger: Logger;

  constructor(userRepository: UserRepository) {
    this.logger = new Logger();
    this.userService = userRepository;
  }

  async register(newUser: { username: string; email: string; password: string }) {
    const { username, email } = newUser;
    this.logger.info(`Registering user: ${username} with email: ${email}`);
    let user = await this.userService.find({username});
    if (user) {
      throw Errors.conflict(`User with username: ${username} already exists`);
    }
    user = await this.userService.find({email});
    if (user) {
      throw Errors.conflict(`User with email: ${email} already exists`);
    }
    this.userService.create(newUser);
  }

  async login(email: string, password: string): Promise<User> {
    const user = await this.userService.find({email});
    if (!user) {
      throw Errors.unauthorized('User does not exist');
    }
    const success = await compare(password, user.hash);
    if (!success) {
      throw Errors.unauthorized('Invalid password');
    }
    return user;
  }

  async addSession(userId: number, sessionId: string) {
    const user: User = await this.userService.findById(userId);
    let sessions = user.getSessions();
    if (sessions.length >= 5) {
      sessions.shift();
    }
    sessions.push(sessionId);
    user.setSessions(sessions);
    this.userService.update(user);
  }

  async removeSession(userId: number, sessionId: string) {
    const user = await this.userService.findById(userId);
    const sessions = user.getSessions().filter(session => session !== sessionId);
    user.setSessions(sessions);
    this.userService.update(user);
  }

  async resetSessions(userId: number) {
    const user = await this.userService.findById(userId);
    user.sessions = '';
    this.userService.update(user);
  }
}