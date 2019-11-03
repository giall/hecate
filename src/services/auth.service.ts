import { UserRepository } from '../repositories/user.repository';
import { Logger } from '../logger/logger';
import { Errors } from '../error/errors';
import { User } from '../models/user';
import { v4 as uuid } from 'uuid';
import { compare } from 'bcrypt';
import { Transporter } from '../mail/transporter';

export class AuthService {
  private userRepository: UserRepository;
  private logger: Logger;
  private transporter: Transporter;

  constructor(userRepository: UserRepository, transporter: Transporter) {
    this.logger = new Logger();
    this.userRepository = userRepository;
    this.transporter = transporter;
  }

  async login(email: string, password: string): Promise<User> {
    const user = await this.userRepository.find({email});
    // do comparison even if user does not exist to prevent timing attacks
    const hash = user && user.hash || '.';
    const success = await compare(password, hash);
    if (!user) {
      throw Errors.unauthorized(`User with email ${email} does not exist`);
    }
    if (!success) {
      throw Errors.unauthorized(`Invalid password for user with email ${email}`);
    }
    return user;
  }

  async requestMagicLogin(email: string) {
    const user = await this.userRepository.find({email});
    await this.userRepository.allowMagicLogin(user.id);
    await this.transporter.magicLogin(user);
  }

  async magicLogin(userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user.allowMagicLogin) {
      throw Errors.gone('magic login token has already been used');
    }
    await this.userRepository.useMagicLogin(userId);
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