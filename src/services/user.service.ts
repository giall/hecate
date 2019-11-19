import { UserRepository } from '../repositories/user.repository';
import { Logger } from '../logger/logger';
import { Credentials, User } from '../models/user';
import { Errors } from '../error/errors';
import { properties } from '../properties/properties';
import { MailService } from './mail.service';
import { comparePassword, hashPassword } from '../utils/auth.utils';

export class UserService {
  private log: Logger;

  private userRepository: UserRepository;
  private mailService: MailService;

  constructor(userRepository: UserRepository, mailService: MailService) {
    this.log = new Logger();

    this.userRepository = userRepository;
    this.mailService = mailService;
  }

  async register(credentials: Credentials): Promise<User> {
    const {username, email} = credentials;
    this.log.info(`Registering user: ${username} with email: ${email}`);
    await this.checkForConflicts(credentials);

    const user = await this.userRepository.create(User.create(credentials));
    this.log.info(`User ${username} created successfully.`);
    this.sendVerificationEmail(user);
    return user;
  }

  async verifyEmail(userId: string, email: string) {
    const user = await this.userRepository.findById(userId);
    if (user.email !== email) {
      this.log.warn(`Email in token does not match current email for user with id=${userId}`);
      throw Errors.badRequest('Invalid token.');
    }
    if (user.verified) {
      this.log.warn(`User with id=${userId} has already verified their email`);
      throw Errors.gone('Invalid token.');
    }
    await this.userRepository.update(userId, {verified: true});
  }

  async changeEmail(userId: string, email: string, password: string) {
    const user = await this.userRepository.findById(userId);
    if (user.email === email) {
      throw Errors.badRequest('Old and new email addresses cannot be the same.');
    }
    this.verifyPassword(user, password);
    await this.userRepository.update(userId, {email, verified: false});
    this.log.info(`Changed email for userId=${userId}`);
    this.sendVerificationEmail({...user, email} as User);
  }

  async resetPassword(userId: string, hash: string, newPassword: string) {
    const user = await this.userRepository.findById(userId);
    if (user.hash !== hash) {
      this.log.warn(`Current hash for user with id=${userId} does not match with the one in the token`);
      throw Errors.gone('Invalid token.');
    }
    await this.userRepository.update(userId, {hash: hashPassword(newPassword)});
    this.log.info(`Reset password for userId=${userId}`);
  }

  async resetPasswordRequest(email: string) {
    const user = await this.userRepository.find({email});
    if (user) {
      this.log.info(`Sending password reset email to ${email}`);
      await this.mailService.passwordReset(user);
    } else {
      this.log.warn(`Cannot reset password; no account with email ${email}`);
    }
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    if (oldPassword === newPassword) {
      throw Errors.badRequest('Old and new passwords cannot be the same.');
    }
    const user = await this.userRepository.findById(userId);
    this.verifyPassword(user, oldPassword);
    await this.userRepository.update(userId, {hash: hashPassword(newPassword)});
    this.log.info(`Changed password for userId=${userId}`);
  }

  async deleteUser(userId: string, password: string) {
    const user = await this.userRepository.findById(userId);
    this.verifyPassword(user, password);
    await this.userRepository.remove(userId);
    this.log.info(`Delete userId=${userId}`);
  }

  private async checkForConflicts(credentials: Credentials) {
    const {username, email} = credentials;
    let user = await this.userRepository.find({username});
    if (user) {
      this.log.info(`User with username: ${username} already exists`);
      throw Errors.conflict('A user with this username already exists.');
    }
    user = await this.userRepository.find({email});
    if (user) {
      this.log.info(`User with email: ${email} already exists`);
      throw Errors.conflict('A user with this email already exists.');
    }
  }

  private async sendVerificationEmail(user: User) {
    if (properties.options.emailVerificationRequired) {
      this.log.info(`Sending email to ${user.email} for verification`);
      await this.mailService.emailVerification(user);
    }
  }

  private verifyPassword(user: User, password: string) {
    const success = comparePassword(password, user.hash);
    if (!success) {
      this.log.warn(`Invalid password for userId=${user.id}`);
      throw Errors.unauthorized('Invalid credentials.');
    }
  }
}
