import * as request from 'supertest';
import {App} from '../../src/app';
import {Database} from '../../src/database/database';
import {MongoMemoryServer} from 'mongodb-memory-server';
import {User} from '../../src/models/user';
import {properties} from '../../src/properties/properties';
import {TokenUtils} from '../../src/utils/token.utils';

let app: App;
let mongod: MongoMemoryServer;
let database: Database;

let user: User;

async function getUser(): Promise<User> {
  try {
    const users = await database.getCollection('users').find({username: 'TESTUSER'}).toArray();
    return User.from(users[0]);
  } catch (err) {
    throw Error('error getting user from database');
  }
}

beforeAll(async () => {
  properties.logging.level = 'test';
  properties.options.emailVerificationRequired = false;
  mongod = new MongoMemoryServer({
    instance: {
      dbName: 'hecate'
    }
  });
  const dbUri = await mongod.getConnectionString();
  database = new Database(dbUri);
  app = new App(database);
  await app.bootstrap();

  await request(app.server)
    .post('/api/user/register')
    .send({
      username: 'TESTUSER',
      email: 'test@email.com',
      password: 'password'
    });
  user = await getUser();
});

afterAll(async () => {
  await app.terminate();
  await mongod.stop();
});

describe('/api/user/register', () => {
  const endpoint = '/api/user/register';

  test('Should register user successfully', async () => {
    const response = await request(app.server)
      .post(endpoint)
      .send({
        username: 'ausername',
        email: 'an@email.com',
        password: 'password1'
      });
    expect(response.status).toEqual(201);
  });

  test('Should fail if email already exists', async () => {
    const response = await request(app.server)
      .post(endpoint)
      .send({
        username: 'anotherusername',
        email: 'an@email.com',
        password: 'password2'
      });
    expect(response.status).toEqual(409);
  });

  test('Should fail if username already exists', async () => {
    const response = await request(app.server)
      .post(endpoint)
      .send({
        username: 'ausername',
        email: 'another@email.com',
        password: 'password3'
      });
    expect(response.status).toEqual(409);
  });
});

describe('/api/auth/login', () => {
  const endpoint = '/api/auth/login';

  test('Should be successful', async () => {
    const response = await request(app.server).post(endpoint).send({
      email: 'an@email.com',
      password: 'password1'
    });
    expect(response.status).toEqual(200);

    const cookies: string[] = response.header['set-cookie'];
    expect(cookies.length).toEqual(2);
    expect(cookies[0]).toContain('access=');
    expect(cookies[1]).toContain('refresh=');
  });

  test('Should fail if password is incorrect', async () => {
    const response = await request(app.server).post(endpoint).send({
      email: 'an@email.com',
      password: 'password2'
    });
    expect(response.status).toEqual(401);
    expect(response.header['set-cookie']).toBe(undefined);
  });

  test('Should fail if user does not exist', async () => {
    const response = await request(app.server).post(endpoint).send({
      email: 'another@email.com',
      password: 'password2'
    });
    expect(response.status).toEqual(401);
    expect(response.header['set-cookie']).toBe(undefined);
  });
});

describe('/api/auth/logout', () => {
  const endpoint = '/api/auth/logout';

  test('Should logout successfully', async () => {
    const cookie = `refresh=${TokenUtils.refresh(user, user.sessions[0])}`;
    ;

    const response = await request(app.server).post(endpoint).set('Cookie', cookie);

    expect(response.status).toEqual(204);
    const updatedUser = await getUser();
    expect(updatedUser.sessions.length).toEqual(0);
  });

  test('Should fail if there is no token', async () => {
    const response = await request(app.server).post(endpoint);
    expect(response.status).toEqual(401);
  });
});

describe('/api/user/password/change', () => {
  const endpoint = '/api/user/password/change';
  let cookie: string;

  beforeAll(async () => {
    const user = await getUser();
    cookie = `access=${TokenUtils.access(user)}`;
  });

  test('Should fail if old and new passwords are the same', async () => {
    const response = await request(app.server).put(endpoint).set('Cookie', cookie).send({
      oldPassword: 'password',
      newPassword: 'password'
    });
    expect(response.status).toEqual(400);
  });

  test('Should change user password', async () => {
    const response = await request(app.server).put(endpoint).set('Cookie', cookie).send({
      oldPassword: 'password',
      newPassword: 'newPassword'
    });
    expect(response.status).toEqual(204);
    const updatedUser = await getUser();
    expect(updatedUser.sessions.length).toEqual(0);
  });

  test('Should fail if password is invalid', async () => {
    const response = await request(app.server).put(endpoint).set('Cookie', cookie).send({
      oldPassword: 'wrongPassword',
      newPassword: 'newPassword'
    });
    expect(response.status).toEqual(400);
  });
});

describe('/api/user/email/verify', () => {
  const endpoint = '/api/user/email/verify';

  test('Should verify user', async () => {
    const response = await request(app.server).put(endpoint).send({
      token: TokenUtils.emailVerification(await getUser())
    });
    expect(response.status).toEqual(204);
    const user = await getUser();
    expect(user.verified).toBeTruthy();
  });

  test('Should fail if user is already verified', async () => {
    const response = await request(app.server).put(endpoint).send({
      token: TokenUtils.emailVerification(await getUser())
    });
    expect(response.status).toEqual(410);
  });
});