import * as http from 'http';
import { auth } from './index';
import { log } from './logger/logger';

const port = process.env.PORT || 3000;
http.createServer(auth).listen(port);
log.info(`Server running on port ${port}...`);
