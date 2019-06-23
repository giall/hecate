import { sign, verify } from 'jsonwebtoken';
import { Errors } from '../error/errors';
import { User } from '../models/user';

export interface AccessPayload {
  id: string;
  username: string;
}

export interface RefreshPayload {
  id: string;
  session: string;
}

export enum Token {
  Access,
  Refresh
}

export class TokenService {

  access(user: User) {
    const payload: AccessPayload = {
      id: user.id,
      username: user.username
    }
    const options = {
      expiresIn: '1m'
    }
    return sign(payload, this.token(Token.Access), options);
  }

  refresh(user: User, sessionId: string) {
    const payload: RefreshPayload = {
      id: user.id,
      session: sessionId
    }
    const options = {
      expiresIn: '5m'
    }
    return sign(payload, this.token(Token.Refresh), options);
  }

  decode(token: string, type: Token) {
    try {
      return verify(token, this.token(type));
    } catch (err) {
      throw Errors.unauthorized('invalid token');
    }
  }

  private token(type: Token): string {
    if (type === Token.Access) return process.env.ACCESS_SECRET;
    else if (type === Token.Refresh) return process.env.REFRESH_SECRET;
  }
}