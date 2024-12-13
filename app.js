// File: app.js

import express from 'express';
import bodyParser from 'body-parser';
import session from 'express-session';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import generalRoutes from './routes/generalRoutes.js';
import authRoutes from './routes/authRoutes.js';
import postsRoutes from './routes/postsRoutes.js';
import archivesRoutes from './routes/archivesRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import blogRoutes from './routes/blogRoutes.js';
import passport from './services/passportConfig.js';
import db from './services/dbClient.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: true,
    })
);
app.use(passport.initialize());
app.use(passport.session());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
app.use('/', generalRoutes);
app.use('/', authRoutes);
app.use('/posts', postsRoutes);
app.use('/archives', archivesRoutes);
app.use('/profile', profileRoutes);
app.use('/', blogRoutes);

export default app;