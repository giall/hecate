import * as request from 'supertest';
import { App } from '../../src/app';
import { config } from 'dotenv';
import { Database } from '../../src/database/database';
import { MongoMemoryServer } from 'mongodb-memory-server';

let app: App;
let mongod: MongoMemoryServer;
let dbUri: string;
let dbName: string;

beforeAll(async () => {
  config();
  mongod = new MongoMemoryServer({
    instance: {
      dbName
    }
  });
  dbUri = await mongod.getConnectionString();
  const database = new Database(dbUri);
  app = new App(database);
  await app.bootstrap();
});

afterAll(async () => {
  app.terminate();
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

  test('Should not register user if email already exists', async () => {
    const response = await request(app.server)
    .post('/api/register')
    .send({
      username: 'another_username',
      email: 'an@email.com',
      password: 'password2'
    });
    expect(response.status).toEqual(409);
  });

  test('Should not register user if username already exists', async () => {
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
  test('Login should be successful', async () => {
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

  test('Login should fail if password is incorrect', async () => {
    const response = await request(app.server).post('/api/login').send({
      email: 'an@email.com',
      password: 'password2'
    });
    expect(response.status).toEqual(401);
    expect(response.header['set-cookie']).toBe(undefined);
  });

  test('Login should fail if user does not exist', async () => {
    const response = await request(app.server).post('/api/login').send({
      email: 'another@email.com',
      password: 'password2'
    });
    expect(response.status).toEqual(404);
    expect(response.header['set-cookie']).toBe(undefined);
  });
});