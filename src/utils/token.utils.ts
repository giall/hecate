import { sign, verify } from 'jsonwebtoken';
import { Errors } from '../error/errors';
import { User } from '../models/user';
import { properties } from '../properties/properties';
import { log } from '../logger/logger';

export interface Payload {
  type: Token;
  id: string;
  session?: string; // used by refresh token
  hash?: string; // used by password reset token
}

export enum Token {
  Access = 'access',
  Refresh = 'refresh',
  EmailVerification = 'emailVerification',
  PasswordReset = 'passwordReset',
  MagicLogin = 'magicLogin'
}

interface Data {
  id: string;
  session?: string;
  hash?: string;
}

export class TokenUtils {

  private static secret = properties.jwt.secret;

  static access(user: User) {
    const {id} = user;
    return this.token({id}, Token.Access);
  }

  static refresh(user: User, session: string, extended = false) {
    const {id} = user;
    return this.token({id, session}, Token.Refresh, extended);
  }

  static emailVerification(user: User) {
    const {id} = user;
    return this.token({id}, Token.EmailVerification);
  }

  static passwordReset(user: User) {
    const {id, hash} = user;
    return this.token({id, hash}, Token.PasswordReset);
  }

  static magicLogin(user: User) {
    const {id} = user;
    return this.token({id}, Token.MagicLogin);
  }

  static decode(token: string, type: Token) {
    let payload: Payload;
    try {
      payload = verify(token, this.secret) as Payload;
    } catch (err) {
      log.warn(`Invalid token: ${err.name}`);
      throw Errors.unauthorized('Invalid token.');
    }
    if (payload.type !== type) {
      log.warn(`Token payload is of type ${payload.type} and not expected type ${type}`);
      throw Errors.forbidden('Invalid token.');
    }
    return payload;
  }

  private static token(data: Data, type: Token, extended = false): string {
    const key = extended ? 'extendedRefresh' : type;
    const options = {
      expiresIn: properties.jwt.expiration[key]
    };
    const payload: Payload = {
      ...data, type
    };
    log.info(`Signing ${type} token that expiresIn=${options.expiresIn}`);
    return sign(payload, this.secret, options);
  }
}
