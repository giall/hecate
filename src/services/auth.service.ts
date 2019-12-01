import { UserRepository } from '../repositories/user.repository';
import { Logger } from '../logger/logger';
import { Errors } from '../error/errors';
import { User } from '../models/user';
import { v4 as uuid } from 'uuid';
import { compare } from 'bcrypt';
import { MailService } from './mail.service';

export class AuthService {
  private readonly log: Logger;
  private readonly userRepository: UserRepository;
  private readonly mailService: MailService;

  constructor(userRepository: UserRepository, mail: MailService) {
    this.log = new Logger();
    this.userRepository = userRepository;
    this.mailService = mail;
  }

  async login(email: string, password: string): Promise<User> {
    const user = await this.userRepository.find({email});
    // do comparison even if user does not exist to prevent timing attacks
    const hash = user && user.hash || '.';
    const success = await compare(password, hash);
    if (!user) {
      this.log.warn(`User with email ${email} does not exist`);
    } else if (!success) {
      this.log.warn(`Invalid password for user with email ${email}`);
    }
    return success ? user : null;
  }

  async requestMagicLogin(email: string) {
    const user = await this.userRepository.find({email});
    if (user) {
      this.log.info(`Sending magic login email to userId=${user.id}`);
      await this.userRepository.update(user.id, {allowMagicLogin: true});
      await this.mailService.magicLogin(user);
    } else {
      this.log.warn(`User with email=${email} does not exist, unable to send magic login link.`);
    }
  }

  async magicLogin(userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user.allowMagicLogin) {
      this.log.warn(`Magic login token for userId=${userId} has already been used`);
      throw Errors.gone('Invalid token.');
    }
    await this.userRepository.update(userId, {allowMagicLogin: false});
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
