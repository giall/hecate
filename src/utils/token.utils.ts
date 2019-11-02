import { sign, verify } from 'jsonwebtoken';
import { Errors } from '../error/errors';
import { User } from '../models/user';
import { properties } from '../properties/properties';

export interface Payload {
  type: Token;
  id: string;
  session?: string; // used by refresh token
  password?: string; // used by password reset token
}

export enum Token {
  Access = 'access',
  Refresh = 'refresh',
  EmailVerification = 'emailVerification',
  PasswordReset = 'passwordReset',
  TempLogin = 'tempLogin'
}

export class TokenUtils {

  private static secret = properties.jwt.secret;

  static access(user: User) {
    const { id } = user;
    return this.token({ id }, Token.Access);
  }

  static refresh(user: User, session: string) {
    const { id } = user;
    return this.token({ id, session }, Token.Refresh);
  }

  static emailVerification(user: User) {
    const { id } = user;
    return this.token({ id }, Token.EmailVerification);
  }

  static passwordReset(user: User) {
    const { id, password } = user;
    return this.token({ id, password }, Token.PasswordReset);
  }

  static tempLogin(user: User) {
    const { id } = user;
    return this.token({ id }, Token.TempLogin);
  }

  static decode(token: string, type: Token) {
    let payload: Payload;
    try {
      payload = verify(token, this.secret) as Payload;
    } catch (err) {
      throw Errors.unauthorized(`Invalid token: ${err.name}`);
    }
    if (payload.type !== type) {
      throw Errors.forbidden(`Token payload is of type ${payload.type} and not expected type ${type}`);
    }
    return payload;
  }

  private static token(data: {id: string; session?: string, password?: string}, type: Token): string {
    const options = {
      expiresIn: properties.jwt.expirations[type]
    }
    const payload: Payload = {
      ...data, type
    }
    return sign(payload, this.secret, options);
  }
}