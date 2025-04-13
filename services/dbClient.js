// File: /services/dbClient.js

import { Pool, neonConfig } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import ws from 'ws';
import fetch from 'node-fetch';

dotenv.config();

// Fix for WebSocket errors
neonConfig.webSocketConstructor = ws;
neonConfig.fetch = fetch;

const db = new Pool({ connectionString: process.env.DATABASE_URL });

export default db;