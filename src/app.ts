import * as Koa from 'koa';
import * as helmet from 'koa-helmet';

import { Middleware } from 'koa';
import { Server } from 'http';
import { Database } from './database/database';
import { Logger } from './logger/logger';

import { RootController } from './controllers/root.controller';
import { AuthController } from './controllers/auth.controller';
import { UserController } from './controllers/user.controller';
import { AuthService } from './services/auth.service';
import { UserService } from './services/user.service';
import { MailService } from './services/mail.service';
import { UserRepository } from './repositories/user.repository';
import { RateLimiter } from './rate.limiter/rate.limiter';
import { Transporter } from './transporter/transporter';

import { configureRoutes, KoaController } from 'koa-joi-controllers';
import { cors, errorHandler } from './middleware/middleware';
import { ctxLog, requestLogger } from './middleware/logging.middleware';

export class App {
  log: Logger;

  server: Server;
  database: Database;
  mail: MailService;

  constructor(database: Database, transporter: Transporter) {
    this.log = new Logger();
    this.database = database;
    this.mail = new MailService(transporter);
  }

  async bootstrap(): Promise<void> {
    this.log.info('Bootstrapping app...');
    const app = new Koa();
    await this.database.connect();
    this.configureMiddleware(app, [
      requestLogger(), ctxLog, errorHandler, helmet(), cors()
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
    const authService = new AuthService(userRepository, this.mail);
    const userService = new UserService(userRepository, this.mail);
    const rateLimiter = new RateLimiter(this.database);
    return [
      new AuthController(userRepository, authService, rateLimiter),
      new UserController(userService),
      new RootController()
    ];
  }
}
