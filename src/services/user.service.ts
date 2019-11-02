import { UserRepository } from '../repositories/user.repository';
import { Logger } from '../logger/logger';
import { Credentials, User } from '../models/user';
import { Errors } from '../error/errors';
import { compare } from 'bcrypt';

export class UserService {
  private userRepository: UserRepository;
  private logger: Logger;

  constructor(userRepository: UserRepository) {
    this.logger = new Logger();
    this.userRepository = userRepository;
  }

  async register(credentials: Credentials): Promise<User> {
    const { username, email } = credentials;
    this.logger.info(`Registering user: ${username} with email: ${email}`);
    let user = await this.userRepository.find({username});
    if (user) {
      throw Errors.conflict(`User with username: ${username} already exists`);
    }
    user = await this.userRepository.find({email});
    if (user) {
      throw Errors.conflict(`User with email: ${email} already exists`);
    }
    this.logger.info(`User ${username} registered successfully.`);
    return this.userRepository.create(User.create(credentials));
  }

  async changeEmail(userId: string, email: string, password: string) {
    await this.verifyPassword(userId, password);
    await this.userRepository.changeEmail(userId, email);
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

  private async verifyPassword(userId: string, password: string) {
    const user = await this.userRepository.findById(userId);
    const success = await compare(password, user.password);
    if (!success) {
      throw Errors.badRequest('Invalid password');
    }
  }
}