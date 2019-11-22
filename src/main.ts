import * as http from 'http';
import { hecate } from './index';
import { log } from './logger/logger';

const port = process.env.PORT || 3000;
http.createServer(hecate).listen(port);
log.info(`Server running on port ${port}...`);
