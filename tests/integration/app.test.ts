import * as request from 'supertest';

import { App } from '../../src/app';
import { Database } from '../../src/database/database';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { User } from '../../src/models/user';
import { properties } from '../../src/properties/properties';
import { TokenUtils } from '../../src/utils/token.utils';
import { chance } from '../utils/chance';
import { v4 as uuid } from 'uuid';
import { UserRepository } from '../../src/repositories/user.repository';
import { DummyTransporter } from '../mocks/dummy.transporter';

let app: App;
let mongod: MongoMemoryServer;
let database: Database;
let transporter: DummyTransporter;

let user: User;
const userDetails = {
  username: chance.username(),
  email: chance.email(),
  password: chance.password()
};

async function getUser(): Promise<User> {
  try {
    const users = await database.getCollection('users').find({
      username: userDetails.username
    }).toArray();
    return User.from(users[0]);
  } catch (err) {
    throw Error('error getting user from database');
  }
}

async function login() {
  const response = await request(app.server).post('/api/auth/login')
    .send({
      email: userDetails.email,
      password: userDetails.password
    });
  expect(response.status).toEqual(200);
}

async function run() {
  properties.logging.level = 'test';
  properties.options.emailVerificationRequired = true;
  mongod = new MongoMemoryServer({
    instance: {
      dbName: 'hecate'
    }
  });
  const dbUri = await mongod.getConnectionString();
  database = new Database(dbUri);
  transporter = new DummyTransporter();
  app = new App(database, transporter);
  await app.bootstrap();
}

beforeAll(async () => {
  await run();
  await request(app.server)
    .post('/api/user/register')
    .send(userDetails);
  user = await getUser();
});

afterAll(async () => {
  await app.terminate();
  await mongod.stop();
});

describe('/api/ping', () => {
  test('Should return OK', async () => {
    const response = await request(app.server).get('/api/ping');
    expect(response.status).toEqual(200);
  });
});

describe('/api/user/register', () => {
  const endpoint = '/api/user/register';
  const username = chance.username();
  const email = chance.email();

  test('Should register user successfully', async () => {
    const response = await request(app.server)
      .post(endpoint)
      .send({
        username: username,
        email: email,
        password: chance.password()
      });
    expect(response.status).toEqual(201);
    transporter.assertEmailSent();
  });

  test('Should fail if email already exists', async () => {
    const response = await request(app.server)
      .post(endpoint)
      .send({
        username: chance.username(),
        email: email,
        password: chance.password()
      });
    expect(response.status).toEqual(409);
  });

  test('Should fail if username already exists', async () => {
    const response = await request(app.server)
      .post(endpoint)
      .send({
        username: username,
        email: chance.emailAddress(),
        password: chance.password()
      });
    expect(response.status).toEqual(409);
  });
});

describe('/api/auth/login', () => {
  const endpoint = '/api/auth/login';

  test('Should fail if password is incorrect', async () => {
    const response = await request(app.server).post(endpoint).send({
      email: userDetails.email,
      password: chance.password()
    });
    expect(response.status).toEqual(401);
    expect(response.header['set-cookie']).toBeUndefined();
  });

  test('Should fail if user does not exist', async () => {
    const response = await request(app.server).post(endpoint).send({
      email: chance.emailAddress(),
      password: userDetails.password
    });
    expect(response.status).toEqual(401);
    expect(response.header['set-cookie']).toBeUndefined();
  });

  test('Should be successful', async () => {
    const response = await request(app.server).post(endpoint).send({
      email: userDetails.email,
      password: userDetails.password
    });
    expect(response.status).toEqual(200);

    const cookies: string[] = response.header['set-cookie'];
    expect(cookies.length).toEqual(2);
    expect(cookies[0]).toContain('access=');
    expect(cookies[1]).toContain('refresh=');
  });
});

describe('/api/auth/refresh', () => {
  const endpoint = '/api/auth/refresh';
  let cookie: string;

  beforeAll(async () => {
    await login();
    user = await getUser();
  });

  test('Should fail if there is no refresh token', async () => {
    const response = await request(app.server).post(endpoint);
    expect(response.status).toEqual(401);
  });

  test('Should fail if session is invalid', async () => {
    cookie = `refresh=${TokenUtils.refresh(user, uuid())}`;
    const response = await request(app.server).post(endpoint).set('Cookie', cookie);
    expect(response.status).toEqual(403);
  });

  test('Should refresh session successfully', async () => {
    const [sessionId] = user.sessions;
    cookie = `refresh=${TokenUtils.refresh(user, sessionId)}`;
    const response = await request(app.server).post(endpoint).set('Cookie', cookie);
    expect(response.status).toEqual(200);

    user = await getUser();
    expect(user.sessions.includes(sessionId)).toBeFalsy();
  });
});

describe('/api/auth/logout', () => {
  const endpoint = '/api/auth/logout';

  beforeAll(async () => {
    await login();
    user = await getUser();
  });

  test('Should fail if there is no refresh token', async () => {
    const response = await request(app.server).post(endpoint);
    expect(response.status).toEqual(401);
  });

  test('Should logout successfully', async () => {
    const [sessionId] = user.sessions;
    expect(sessionId).toBeDefined();
    const cookie = `refresh=${TokenUtils.refresh(user, sessionId)}`;

    const response = await request(app.server).post(endpoint).set('Cookie', cookie);
    expect(response.status).toEqual(204);

    const updatedUser = await getUser();
    expect(updatedUser.sessions.includes(sessionId)).toBeFalsy();
  });
});

describe('/api/auth/invalidate', () => {
  const endpoint = '/api/auth/invalidate';

  beforeAll(async () => {
    await login();
    user = await getUser();
  });

  test('Should fail if there is no refresh token', async () => {
    const response = await request(app.server).post(endpoint);
    expect(response.status).toEqual(401);
  });

  test('Should remove all sessions', async () => {
    const [sessionId] = user.sessions;
    expect(sessionId).toBeDefined();
    const cookie = `refresh=${TokenUtils.refresh(user, sessionId)}`;

    const response = await request(app.server).post(endpoint).set('Cookie', cookie);
    expect(response.status).toEqual(204);

    const updatedUser = await getUser();
    expect(updatedUser.sessions.length).toEqual(0);
  });
});

describe('/api/auth/magic.login', () => {
  const endpoint = '/api/auth/magic.login';

  test('Should fail if token user is not valid', async () => {
    const response = await request(app.server).post(endpoint)
      .send({
        token: chance.string({length: 48})
      });
    expect(response.status).toEqual(401);
  });

  test('Should fail if token is not of magic login type', async () => {
    const response = await request(app.server).post(endpoint)
      .send({
        token: TokenUtils.passwordReset(user)
      });
    expect(response.status).toEqual(403);
  });

  test('Should fail if token user ID is not valid', async () => {
    const response = await request(app.server).post(endpoint)
      .send({
        token: TokenUtils.magicLogin({
          id: chance.string({length: 12})
        } as User)
      });
    expect(response.status).toEqual(400);
  });

  test('Should login successfully', async () => {
    await new UserRepository(database).allowMagicLogin(user.id);
    const response = await request(app.server).post(endpoint)
      .send({
        token: TokenUtils.magicLogin(user)
      });
    expect(response.status).toEqual(200);
  });

  test('Should fail if magic login is not allowed', async () => {
    const response = await request(app.server).post(endpoint)
      .send({
        token: TokenUtils.magicLogin(user)
      });
    expect(response.status).toEqual(410);
  });
});

describe('/api/auth/magic.login/request', () => {
  const endpoint = '/api/auth/magic.login/request';

  test('Should not send email if user does not exist', async () => {
    const response = await request(app.server).post(endpoint)
      .send({
        email: chance.email()
      });
    expect(response.status).toEqual(202);
    transporter.assertNoEmailSent();
  });

  test('Should send magic login email', async () => {
    const response = await request(app.server).post(endpoint)
      .send({
        email: user.email
      });
    expect(response.status).toEqual(202);
    transporter.assertEmailSent();
  });
});

describe('/api/user/password/reset', () => {
  const endpoint = '/api/user/password/reset';
  const newPassword = chance.password();

  test('Should fail if token hash does not match user hash', async () => {
    const response = await request(app.server).put(endpoint)
      .send({
        token: TokenUtils.passwordReset({
          id: user.id,
          hash: chance.string()
        } as User),
        newPassword: newPassword
      });
    expect(response.status).toEqual(410);
  });

  test('Should reset password', async () => {
    const response = await request(app.server).put(endpoint)
      .send({
        token: TokenUtils.passwordReset(user),
        newPassword: newPassword
      });
    expect(response.status).toEqual(204);

    userDetails.password = newPassword;
    await login();
  });
});

describe('/api/user/password/reset/request', () => {
  const endpoint = '/api/user/password/reset/request';

  test('Should not send email if user does not exist', async () => {
    const response = await request(app.server).post(endpoint)
      .send({
        email: chance.email()
      });
    expect(response.status).toEqual(202);
    transporter.assertNoEmailSent();
  });

  test('Should send password reset email', async () => {
    const response = await request(app.server).post(endpoint)
      .send({
        email: user.email
      });
    expect(response.status).toEqual(202);
    transporter.assertEmailSent();
  });
});

describe('/api/user/password/change', () => {
  const endpoint = '/api/user/password/change';
  const newPassword = chance.password();
  let cookie: string;

  beforeAll(() => {
    cookie = `access=${TokenUtils.access(user)}`;
  });

  test('Should fail if there is no access token', async () => {
    const response = await request(app.server).put(endpoint);
    expect(response.status).toEqual(401);
  });

  test('Should fail if old and new passwords are the same', async () => {
    const response = await request(app.server).put(endpoint)
      .set('Cookie', cookie)
      .send({
        oldPassword: userDetails.password,
        newPassword: userDetails.password
      });
    expect(response.status).toEqual(400);
  });

  test('Should fail if password is invalid', async () => {
    const response = await request(app.server).put(endpoint)
      .set('Cookie', cookie)
      .send({
        oldPassword: chance.password(),
        newPassword: newPassword
      });
    expect(response.status).toEqual(401);
  });

  test('Should change user password', async () => {
    const response = await request(app.server).put(endpoint)
      .set('Cookie', cookie)
      .send({
        oldPassword: userDetails.password,
        newPassword: newPassword
      });
    expect(response.status).toEqual(204);

    userDetails.password = newPassword;
    await login();
  });
});

describe('/api/user/email/verification', () => {
  const endpoint = '/api/user/email/verification';

  test('Should verify user', async () => {
    const response = await request(app.server).put(endpoint).send({
      token: TokenUtils.emailVerification(user)
    });
    expect(response.status).toEqual(204);
    const updatedUser = await getUser();
    expect(updatedUser.verified).toBeTruthy();
  });

  test('Should fail if user is already verified', async () => {
    const response = await request(app.server).put(endpoint).send({
      token: TokenUtils.emailVerification(user)
    });
    expect(response.status).toEqual(410);
  });
});

describe('/api/user/email/change', () => {
  const endpoint = '/api/user/email/change';
  let cookie;

  beforeAll(() => {
    cookie = `access=${TokenUtils.access(user)}`;
  });

  test('Should fail if there is no access token', async () => {
    const response = await request(app.server).put(endpoint);
    expect(response.status).toEqual(401);
  });

  test('Should fail if new and old emails are the same', async () => {
    const response = await request(app.server).put(endpoint)
      .set('Cookie', cookie)
      .send({
        email: userDetails.email,
        password: userDetails.password
      });
    expect(response.status).toEqual(400);
  });

  test('Should fail if invalid password', async () => {
    const response = await request(app.server).put(endpoint)
      .set('Cookie', cookie)
      .send({
        email: chance.emailAddress(),
        password: chance.password()
      });
    expect(response.status).toEqual(401);
  });

  test('Should change user email and unverify', async () => {
    const newEmail = chance.emailAddress();
    const response = await request(app.server).put(endpoint)
      .set('Cookie', cookie)
      .send({
        email: newEmail,
        password: userDetails.password
      });
    expect(response.status).toEqual(204);
    const updatedUser = await getUser();
    expect(updatedUser.email).toEqual(newEmail);
    userDetails.email = newEmail;
    expect(updatedUser.verified).toBeFalsy();
  });
});

describe('/api/auth/login [Rate Limit]', () => {
  const endpoint = '/api/auth/login';

  function validateRateLimitHeaders(headers, limit, remaining) {
    expect(headers['x-ratelimit-limit']).toBe(`${limit}`);
    expect(headers['x-ratelimit-remaining']).toBe(`${remaining}`);
    expect(headers['x-ratelimit-reset']).toBeDefined();
  }

  test('Should block user if too many attempts', async () => {
    const data = {
      email: userDetails.email,
      password: chance.password()
    };
    const attempts = properties.limiter.retry.attempts;
    for (let attempt = 1; attempt <= attempts; attempt++) {
      const response = await request(app.server).post(endpoint).send(data);
      expect(response.status).toEqual(401);
      validateRateLimitHeaders(response.header, attempts, attempts - attempt);
    }
    const response = await request(app.server).post(endpoint).send(data);
    expect(response.status).toEqual(429);
    validateRateLimitHeaders(response.header, attempts, 0);
  });
});

describe('/api/user/delete', () => {
  const endpoint = '/api/user/delete';
  let cookie;

  beforeAll(() => {
    cookie = `access=${TokenUtils.access(user)}`;
  });

  test('Should fail if there is no access token', async () => {
    const response = await request(app.server).put(endpoint);
    expect(response.status).toEqual(401);
  });

  test('Should fail if password is invalid', async () => {
    const response = await request(app.server).put(endpoint)
      .set('Cookie', cookie)
      .send({
        password: chance.password()
      });
    expect(response.status).toEqual(401);
  });

  test('Should delete user', async () => {
    const response = await request(app.server).put(endpoint)
      .set('Cookie', cookie)
      .send({
        password: userDetails.password
      });
    expect(response.status).toEqual(204);
    const updatedUser = await getUser();
    expect(updatedUser.email).toBeUndefined();
  });
});
