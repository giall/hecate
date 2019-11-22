import * as Koa from 'koa';
import { Middleware } from 'koa';
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
import { errorHandler, functionsFramework, send } from './middleware/middleware';
import { ctxLog, requestLogger } from './middleware/logging.middleware';
import { helmet, cors } from './middleware/security.middleware';
import { properties } from './properties/properties';

export class App {
  log: Logger;

  database: Database;
  mail: MailService;

  constructor(database: Database, transporter: Transporter) {
    this.log = new Logger();
    this.database = database;
    this.mail = new MailService(transporter);
  }

  bootstrap(): Koa {
    this.log.info('Bootstrapping app...');
    this.log.info(`Environment is ${process.env.NODE_ENV}`);
    const app = new Koa();
    this.configureMiddleware(app, [
      functionsFramework, requestLogger(), ctxLog, send, errorHandler, helmet(), cors()
    ]);
    configureRoutes(app, this.controllers(), '/api');
    this.log.info('Controllers and middleware configured.');
    app.proxy = properties.config.proxy;
    return app;
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
