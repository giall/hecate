import { auth } from './index';
import * as http from 'http';

http.createServer(auth).listen(3000);
