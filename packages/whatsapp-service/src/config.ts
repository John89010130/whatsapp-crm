import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  backendApiUrl: process.env.BACKEND_API_URL || 'http://localhost:3000',
  sessionsPath: path.resolve(process.env.SESSIONS_PATH || './sessions')
};
