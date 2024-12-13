// File: /routes/generalRoutes.js

import express from 'express';
import { renderTemplate } from '../services/templateService.js';
import db from '../services/dbClient.js';

const router = express.Router();

// Define category routes
router.get('/', (req, res) => renderTemplate(req, res, 'All'));
router.get('/lifestyle', (req, res) => renderTemplate(req, res, 'Lifestyle'));
router.get('/politics', (req, res) => renderTemplate(req, res, 'Politics'));
router.get('/technology', (req, res) => renderTemplate(req, res, 'Technology'));
router.get('/finance', (req, res) => renderTemplate(req, res, 'Finance'));
router.get('/food', (req, res) => renderTemplate(req, res, 'Food'));
router.get('/environment', (req, res) => renderTemplate(req, res, 'Environment'));
router.get('/health', (req, res) => renderTemplate(req, res, 'Health'));
router.get('/fitness', (req, res) => renderTemplate(req, res, 'Fitness'));
router.get('/history', (req, res) => renderTemplate(req, res, 'History'));
router.get('/career', (req, res) => renderTemplate(req, res, 'Career'));
router.get('/arts', (req, res) => renderTemplate(req, res, 'Arts'));
router.get('/travel', (req, res) => renderTemplate(req, res, 'Travel'));

router.get("/search", async (req, res) => {
    const searchQuery = req.query.query;
    try {
      const result = await db.query(
        "SELECT * FROM blog WHERE title ILIKE $1 OR content ILIKE $1 OR category ILIKE $1 ORDER BY date DESC",
        [`%${searchQuery}%`]
      );
      res.render("search_results.ejs", {
        posts: result.rows,
        query: searchQuery,
        user: req.user,
      });
    } catch (error) {
      console.error("Search query failed:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
});

export default router;