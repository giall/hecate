import { User } from '../database/entity/user';
import { sign, verify } from 'jsonwebtoken';
import { Errors } from '../error/errors';

export interface AccessPayload {
  id: number;
  username: string; 
  role: string;
}

export interface RefreshPayload {
  id: number;
  session: string;
}

export class TokenService {
  private secret: {
    access: string;
    refresh: string;
  }

  constructor(secret: {access: string; refresh: string}) {
    this.secret = secret;
  }

  access(user: User) {
    const payload: AccessPayload = {
      id: user.id,
      username: user.username,
      role: user.role
    }
    const options = {
      expiresIn: '1m'
    }
    return sign(payload, this.secret.access, options);
  }

  refresh(user: User, sessionId: string) {
    const payload: RefreshPayload = {
      id: user.id,
      session: sessionId
    }
    const options = {
      expiresIn: '5m'
    }
    return sign(payload, this.secret.refresh, options);
  }

  decode(token: string, type: 'access' | 'refresh') {
    try {
      return verify(token, this.secret[type]);
    } catch (err) {
      throw Errors.unauthorized('invalid token');
    }
  }
}