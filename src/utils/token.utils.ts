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

const secret = properties.jwt.secret;

function token(data: Data, type: Token, extended = false): string {
  const key = extended ? 'extendedRefresh' : type;
  const options = {
    expiresIn: properties.jwt.expiration[key]
  };
  const payload: Payload = {
    ...data, type
  };
  log.info(`Signing ${type} token that expiresIn=${options.expiresIn}`);
  return sign(payload, secret, options);
}

function accessToken(user: User) {
  const {id} = user;
  return token({id}, Token.Access);
}

function refreshToken(user: User, session: string, extended = false) {
  const {id} = user;
  return token({id, session}, Token.Refresh, extended);
}

function emailVerification(user: User) {
  const {id} = user;
  return token({id}, Token.EmailVerification);
}

function passwordReset(user: User) {
  const {id, hash} = user;
  return token({id, hash}, Token.PasswordReset);
}

function magicLogin(user: User) {
  const {id} = user;
  return token({id}, Token.MagicLogin);
}

function decode(token: string, type: Token) {
  let payload: Payload;
  try {
    payload = verify(token, secret) as Payload;
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

export { accessToken, refreshToken, emailVerification, passwordReset, magicLogin, decode };
