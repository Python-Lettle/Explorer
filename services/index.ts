
import { USE_MOCK_SERVER } from '../constants';
import { server as mockServer } from './MockServer';
import { server as realServer } from './RealServer';
import { GameService } from '../types';

export const server: GameService = USE_MOCK_SERVER ? mockServer : realServer;
