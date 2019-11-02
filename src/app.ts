import * as Koa from 'koa';
import * as helmet from 'koa-helmet';
import * as cors from '@koa/cors';

import { Server } from 'http';
import { configureRoutes, KoaController } from 'koa-joi-controllers';
import { Database } from './database/database';
import { UserRepository } from './repositories/user.repository';
import { AuthService } from './services/auth.service';
import { ApiController } from './controllers/api.controller';
import { Logger } from './logger/logger';
import { ctxLogger, errorHandler, requestLogger } from './middleware/middleware';
import { Middleware } from 'koa';
import { Transporter } from './mail/transporter';
import { RateLimiter } from './rate.limiter/rate.limiter';
import { MongoMemoryServer } from 'mongodb-memory-server-core';

export class App {
  server: Server;
  database: Database;
  logger: Logger;

  constructor(database: Database) {
    this.database = database;
    this.logger = new Logger();
  }

  async bootstrap(): Promise<void> {
    await this.database.connect();

    const app = new Koa();
    this.configureMiddleware(app, [
      requestLogger(this.logger), ctxLogger(this.logger), errorHandler, cors(), helmet()
    ]);

    configureRoutes(app, this.controllers());

    const port = process.env.NODE_PORT || 3000;
    this.server = app.listen(port);
    this.logger.info(`Server running on port ${port}...`);
  }

  async terminate(): Promise<void> {
    this.logger.info('Shutting down...');
    await this.database.disconnect();
    this.server.close();
  }

  private configureMiddleware(app: Koa, middleware: Middleware[]) {
    middleware.forEach(middleware => app.use(middleware));
  }

  private controllers(): KoaController[] {
    const userRepository = new UserRepository(this.database);
    const authService = new AuthService(userRepository);
    const transporter = new Transporter();
    const rateLimiter = new RateLimiter(this.database, this.logger);
    return [
      new ApiController(userRepository, authService, transporter, rateLimiter)
    ];
  }
}