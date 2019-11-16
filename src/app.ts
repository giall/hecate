import * as Koa from 'koa';

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
  database: Database;
  log: Logger;

  constructor(database: Database) {
    this.database = database;
    this.log = new Logger();
  }

  bootstrap(): (req, res) => void {
    this.log.info('Bootstrapping app...');
    const app = new Koa();
    this.log.info('Environment: ', process.env.NODE_ENV);

    this.configureMiddleware(app, [
      requestLogger(this.log), ctxLogger(this.log), errorHandler
    ]);

    this.database.connect().then(() => {
      configureRoutes(app, this.controllers(), '/api');
    });
    return app.callback();
  }

  async terminate(): Promise<void> {
    this.log.info('Shutting down...');
    await this.database.disconnect();
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
