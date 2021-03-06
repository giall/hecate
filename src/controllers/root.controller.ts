import { Controller, Get, KoaController } from 'koa-joi-controllers';
import { Context } from 'koa';

@Controller('/')
export class RootController extends KoaController {

  @Get('/ping')
  async ping(ctx: Context) {
    ctx.send(200, 'Authentication service is up and running...');
  }
}
