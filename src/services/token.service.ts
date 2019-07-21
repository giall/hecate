import { sign, verify } from 'jsonwebtoken';
import { Errors } from '../error/errors';
import { User } from '../models/user';
import { properties } from '../properties/properties';

export interface Payload {
  type: Token;
  id: string;
  session?: string;
}

export enum Token {
  Access = 'access',
  Refresh = 'refresh'
}

export class TokenService {

  secret: string;

  constructor() {
    this.secret = properties.jwt.secret;
  }

  access(user: User) {
    const payload: Payload = {
      type: Token.Access,
      id: user.id
    }
    const options = {
      expiresIn: '1m'
    }
    return sign(payload, this.secret, options);
  }

  refresh(user: User, sessionId: string) {
    const payload: Payload = {
      type: Token.Refresh,
      id: user.id,
      session: sessionId
    }
    const options = {
      expiresIn: '5m'
    }
    return sign(payload, this.secret, options);
  }

  decode(token: string, type: Token) {
    let payload: Payload;
    try {
      payload = verify(token, this.secret) as Payload;
    } catch (err) {
      throw Errors.unauthorized('invalid token');
    }
    if (payload.type !== type) {
      throw Errors.forbidden(`Token payload is of type ${payload.type} and not expected type ${type}`);
    }
    return payload;
  }
}