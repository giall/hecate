import * as Koa from 'koa';
import * as helmet from 'koa-helmet';

import { Server } from 'http';
import { configureRoutes, KoaController } from 'koa-joi-controllers';
import { Database } from './database/database';
import { UserRepository } from './repositories/user.repository';
import { AuthService } from './services/auth.service';
import { Logger } from './logger/logger';
import { ctxLogger, errorHandler, requestLogger } from './middleware/middleware';
import { Middleware } from 'koa';
import { Transporter } from './mail/transporter';
import { RateLimiter } from './rate.limiter/rate.limiter';
import { AuthController } from './controllers/auth.controller';
import { UserController } from './controllers/user.controller';
import { UserService } from './services/user.service';
import { RootController } from './controllers/root.controller';

export class App {
  server: Server;
  database: Database;
  log: Logger;

  constructor(database: Database) {
    this.database = database;
    this.log = new Logger();
  }

  async bootstrap(): Promise<void> {
    this.log.info('Bootstrapping app...');
    const app = new Koa();
    await this.database.connect();
    this.configureMiddleware(app, [
      requestLogger(this.log), ctxLogger(this.log), errorHandler, helmet()
    ]);
    configureRoutes(app, this.controllers(), '/api');

    const port = process.env.PORT || 3000;
    this.server = app.listen(port);
    this.log.info(`Server running on port ${port}...`);
  }

  async terminate(): Promise<void> {
    this.log.info('Shutting down...');
    await this.database.disconnect();
    this.server?.close();
  }

  private configureMiddleware(app: Koa, middleware: Middleware[]) {
    middleware.forEach(middleware => app.use(middleware));
  }

  private controllers(): KoaController[] {
    const userRepository = new UserRepository(this.database);
    const transporter = new Transporter();
    const authService = new AuthService(userRepository, transporter);
    const userService = new UserService(userRepository, transporter);
    const rateLimiter = new RateLimiter(this.database);
    return [
      new AuthController(userRepository, authService, rateLimiter),
      new UserController(userService),
      new RootController()
    ];
  }
}
