import { ObjectId } from 'bson';
import { hashSync } from 'bcrypt';

export enum Role {
  User,
  Admin
}

export class User {
  _id?: ObjectId;
  username: string;
  hash: string;
  email: string;
  role: Role;
  verified: boolean;
  allowMagicLogin: boolean;
  sessions: string[];

  get id(): string {
    return this._id.toHexString();
  }

  private constructor(values: {}) {
    Object.assign(this, values);
  }

  static from(values: {}): User {
    return new User(values);
  }

  static create(credentials: Credentials): User {
    return new User({
      username: credentials.username,
      email: credentials.email,
      hash: hashSync(credentials.password, 10),
      role: Role.User,
      magicLogin: false,
      verified: false,
      sessions: []
    });
  }
}

export class Credentials {
  username: string;
  email: string;
  password: string;
}

export class UserDto {
  username: string;
  email: string;
  role: Role;
  verified: boolean;

  private constructor(values: {}) {
    Object.assign(this, values);
  }

  static from(user: User): UserDto {
    return new UserDto({
      username: user.username,
      email: user.email,
      role: user.role,
      verified: user.verified
    });
  }
}