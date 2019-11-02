import { UserRepository } from '../repositories/user.repository';
import { Logger } from '../logger/logger';
import { Credentials, User } from '../models/user';
import { Errors } from '../error/errors';
import { compare } from 'bcrypt';
import { Transporter } from '../mail/transporter';
import { properties } from '../properties/properties';

export class UserService {
  private userRepository: UserRepository;
  private logger: Logger;
  private transporter: Transporter;

  constructor(userRepository: UserRepository, transporter: Transporter) {
    this.logger = new Logger();
    this.userRepository = userRepository;
    this.transporter = transporter;
  }

  async register(credentials: Credentials): Promise<User> {
    const { username, email } = credentials;
    this.logger.info(`Registering user: ${username} with email: ${email}`);
    await this.checkForConflicts(credentials);

    const user = await this.userRepository.create(User.create(credentials));
    this.logger.info(`User ${username} created successfully.`);
    this.sendVerificationEmail(user);
    return user;
  }

  async verifyEmail(userId: string) {
    const user = await this.userRepository.findById(userId);
    if (user.verified) {
      throw Errors.gone(`User with id=${userId} has already verified their email`);
    }
    await this.userRepository.verifyEmail(userId);
  }

  async changeEmail(userId: string, email: string, password: string) {
    await this.verifyPassword(userId, password);
    await this.userRepository.changeEmail(userId, email);
  }

  async resetPassword(userId: string, hash: string, newPassword: string) {
    const user = await this.userRepository.findById(userId);
    if (user.password !== hash) {
      throw Errors.unauthorized(`Current hash for user with id=${userId} does not match with the one in the token`);
    }
    await this.userRepository.changePassword(userId, newPassword);
  }

  async resetPasswordRequest(email: string) {
    const user = await this.userRepository.find({email});
    if (user) {
      this.logger.info(`Sending password reset email to ${email}`);
      await this.transporter.passwordReset(user);
    } else {
      this.logger.warn(`Cannot reset password; no account with email ${email}`);
    }
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    if (oldPassword === newPassword) {
      throw Errors.badRequest('Old and new passwords are the same');
    }
    await this.verifyPassword(userId, oldPassword);
    this.logger.info(`Changing password for userId=${userId}`);
    await this.userRepository.changePassword(userId, newPassword);
  }

  async deleteUser(userId: string, password: string) {
    await this.verifyPassword(userId, password);
    await this.userRepository.remove(userId);
  }

  private async checkForConflicts(credentials: Credentials) {
    const { username, email } = credentials;
    let user = await this.userRepository.find({username});
    if (user) {
      throw Errors.conflict(`User with username: ${username} already exists`);
    }
    user = await this.userRepository.find({email});
    if (user) {
      throw Errors.conflict(`User with email: ${email} already exists`);
    }
  }

  private async sendVerificationEmail(user: User) {
    if (properties.options.emailVerificationRequired) {
      this.logger.info(`Sending email to ${user.email} for verification`);
      await this.transporter.emailVerification(user);
    }
  }

  private async verifyPassword(userId: string, password: string) {
    const user = await this.userRepository.findById(userId);
    const success = await compare(password, user.password);
    if (!success) {
      throw Errors.badRequest('Invalid password');
    }
  }
}