import { ObjectId } from 'bson';
import { hashSync } from 'bcrypt';

export class User {
  _id?: ObjectId;
  username: string;
  hash: string;
  email: string;
  verified: boolean;
  allowMagicLogin: boolean;
  sessions: string[];

  get id(): string {
    return this._id.toHexString();
  }

  private constructor(values: Partial<User>) {
    Object.assign(this, values);
  }

  static from(values: Partial<User>): User {
    return new User(values);
  }

  static create(credentials: Credentials): User {
    return new User({
      username: credentials.username,
      email: credentials.email,
      hash: hashSync(credentials.password, 10),
      allowMagicLogin: false,
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
  verified: boolean;

  private constructor(values: Partial<User>) {
    Object.assign(this, values);
  }

  static from(user: User): UserDto {
    return new UserDto({
      username: user.username,
      email: user.email,
      verified: user.verified
    });
  }
}
