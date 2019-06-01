import * as Koa from 'koa';
import * as koaLogger from 'koa-logger';
import * as helmet from 'koa-helmet';
import * as cors from '@koa/cors';

import { Server } from 'http';
import { configureRoutes, KoaController } from 'koa-joi-controllers';
import { Database } from './database/database';
import { UserRepository } from './repositories/user.repository';
import { AuthService } from './services/auth.service';
import { TokenService } from './services/token.service';
import { AuthController } from './controllers/auth.controller';
import { Logger } from './logger/logger';
import { setLogger, errorHandler } from './middleware/middleware';
import { Middleware } from 'koa';

export class App {
  server: Server;
  database: Database;
  logger: Logger;

  constructor() {
    this.logger = new Logger();
  }

  async bootstrap(): Promise<void> {
    this.database = new Database();
    await this.database.connect();

    const app = new Koa();
    this.configureMiddleware(app, [
      koaLogger(), setLogger, errorHandler, cors(), helmet()
    ]);

    configureRoutes(app, this.controllers());

    const port = process.env.NODE_PORT || 3000;
    this.server = app.listen(port);
    this.logger.info(`Server running on port ${port}...`);
  }

  terminate(): void {
    this.database.disconnect();
    this.server.close();
  }

  private configureMiddleware(app: Koa, middleware: Middleware[]) {
    middleware.forEach(middleware => app.use(middleware));
  }

  private controllers(): KoaController[] {
    const userRepository = new UserRepository(this.database);
    const authService = new AuthService(userRepository);
    const tokenService = new TokenService({
      access: process.env.ACCESS_SECRET,
      refresh: process.env.REFRESH_SECRET
    });
    return [
      new AuthController(userRepository, authService, tokenService)
    ];
  }
}