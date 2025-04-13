// File: /services/dbClient.js

import { Pool } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

const db = new Pool({ connectionString: process.env.DATABASE_URL });

export default db;