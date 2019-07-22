import * as request from 'supertest';
import { App } from '../../src/app';
import { Database } from '../../src/database/database';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { User } from '../../src/models/user';
import { properties } from '../../src/properties/properties';
import { TokenUtils } from '../../src/utils/token.utils';

let app: App;
let mongod: MongoMemoryServer;
let dbUri: string;
let dbName: string;
let database: Database;

async function getUser(): Promise<User> {
  const users = await database.getCollection('users').find().toArray();
  return new User(users[0]);
}

beforeAll(async () => {
  properties.logging.level = 'silent';
  mongod = new MongoMemoryServer({
    instance: {
      dbName
    }
  });
  dbUri = await mongod.getConnectionString();
  database = new Database(dbUri);
  app = new App(database);
  await app.bootstrap();
});

afterAll(async () => {
  await app.terminate();
  await mongod.stop();
});

describe('/api/register', () => {
  test('Should register user successfully', async () => {
    const response = await request(app.server)
      .post('/api/register')
      .send({
        username: 'a_username',
        email: 'an@email.com',
        password: 'password1'
      });
    expect(response.status).toEqual(201);
  });

  test('Should fail if email already exists', async () => {
    const response = await request(app.server)
      .post('/api/register')
      .send({
        username: 'another_username',
        email: 'an@email.com',
        password: 'password2'
      });
    expect(response.status).toEqual(409);
  });

  test('Should fail if username already exists', async () => {
    const response = await request(app.server)
      .post('/api/register')
      .send({
        username: 'a_username',
        email: 'another@email.com',
        password: 'password3'
      });
    expect(response.status).toEqual(409);
  });
});

describe('/api/login', () => {
  test('Should be successful', async () => {
    const response = await request(app.server).post('/api/login').send({
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
    const response = await request(app.server).post('/api/login').send({
      email: 'an@email.com',
      password: 'password2'
    });
    expect(response.status).toEqual(401);
    expect(response.header['set-cookie']).toBe(undefined);
  });

  test('Should fail if user does not exist', async () => {
    const response = await request(app.server).post('/api/login').send({
      email: 'another@email.com',
      password: 'password2'
    });
    expect(response.status).toEqual(401);
    expect(response.header['set-cookie']).toBe(undefined);
  });
});

describe('/api/logout', () => {
  test('Should logout successfully', async () => {
    const user = await getUser();
    const cookie = `refresh=${TokenUtils.refresh(user, user.sessions[0])}`;;
    
    const response = await request(app.server).post('/api/logout').set('Cookie', cookie);
    
    expect(response.status).toEqual(200);
    const updatedUser = await getUser();
    expect(updatedUser.sessions.length).toEqual(0);
  });

  test('Should fail if there is no token', async () => {
    const response = await request(app.server).post('/api/logout');
    expect(response.status).toEqual(401);
  });
});