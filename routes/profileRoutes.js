// File: /routes/profileRoutes.js

import express from 'express';
import { ensureAuthenticated } from '../middlewares/authMiddleware.js';
import db from '../services/dbClient.js';

const router = express.Router();

// Render the profile page
router.get("/", ensureAuthenticated, async (req, res) => {
    let totalBlogs = 0; 
    let likedBlogs = 0;
    let savedBlogs = 0;
    let mostLikedBlog;
    let mostSavedBlog;
    let mostRecentBlog;
    let lastDraft;
    try {
      // Fetch user information from the database
      const userResult = await db.query("SELECT * FROM public.user WHERE id = $1", [
        req.user.id
      ]);
  
      // Fetch the total number of blogs posted by the user
      const totalBlogsResult = await db.query(
        "SELECT COUNT(*) FROM blog WHERE UserId = $1",
        [req.user.id]
      );
      totalBlogs = totalBlogsResult.rows[0].count;
  
      // Fetch the number of liked blogs by the user
      const likedBlogsResult = await db.query(
        "SELECT COUNT(*) FROM liked_blogs WHERE likedUserId = $1",
        [req.user.id]
      );
      likedBlogs = likedBlogsResult.rows[0].count;
  
      // Fetch the number of saved blogs by the user
      const savedBlogsResult = await db.query(
        "SELECT COUNT(*) FROM saved_blogs WHERE savedUserId = $1",
        [req.user.id]
      );
      savedBlogs = savedBlogsResult.rows[0].count;
  
      const mostLikedBlogResult = await db.query(
        `SELECT b.*
         FROM blog b
         LEFT JOIN liked_blogs lb ON b.id = lb.likedBlogId
         WHERE b.UserId = $1
         GROUP BY b.id
         ORDER BY COUNT(lb.likedBlogId) DESC
         LIMIT 1`,
        [req.user.id]
      );
      mostLikedBlog = mostLikedBlogResult.rows[0];
      
  
      const mostSavedBlogResult = await db.query(
        `SELECT b.*
         FROM blog b
         LEFT JOIN saved_blogs sb ON b.id = sb.savedBlogId
         WHERE b.UserId = $1
         GROUP BY b.id
         ORDER BY COUNT(sb.savedBlogId) DESC
         LIMIT 1`,
        [req.user.id]
      );
      mostSavedBlog = mostSavedBlogResult.rows[0];
      
  
      // Fetch the most recent blog by the user
      const mostRecentBlogResult = await db.query(
        `SELECT *
         FROM blog
         WHERE UserId = $1
         ORDER BY date DESC
         LIMIT 1`,
        [req.user.id]
      );
      mostRecentBlog = mostRecentBlogResult.rows[0];
  
      // Fetch the last draft by the user
      const lastDraftResult = await db.query(
        `SELECT *
         FROM draft
         WHERE user_Id = $1
         ORDER BY date DESC
         LIMIT 1`,
        [req.user.id]
      );
      lastDraft = lastDraftResult.rows[0];
  
      // Render the profile page with the fetched data
      res.render("profile.ejs", {
        user: userResult.rows[0],
        totalBlogs: totalBlogs,
        likedBlogs: likedBlogs,
        savedBlogs: savedBlogs,
        mostLikedBlog: mostLikedBlog,
        mostSavedBlog: mostSavedBlog,
        mostRecentBlog: mostRecentBlog,
        lastDraft: lastDraft
      });
    } catch (error) {
      console.error("Error fetching profile data:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

// List blogs created by the user
router.get('/blogs', ensureAuthenticated, async (req, res) => {
    try {
        const result = await db.query(
          "SELECT * FROM blog WHERE UserId = $1 ORDER BY date DESC",
          [req.user.id]
        );
        res.render("blog_list.ejs", {
          posts: result.rows,
          user: req.user,
          query: "Blogs"
        });
    } catch (error) {
        console.error("Search query failed:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

// List drafts created by the user
router.get('/drafts', ensureAuthenticated, async (req, res) => {
    try {
        const result = await db.query(
          `SELECT * FROM draft WHERE user_id = $1 ORDER BY date DESC`,
          [req.user.id]
        );
        res.render("draft_list.ejs", {
          posts: result.rows,
          user: req.user,
          query: "Drafts"
        });
    } catch (error) {
        console.error("Search query failed:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

// List saved blogs
router.get('/saved', ensureAuthenticated, async (req, res) => {
    try {
        const result = await db.query(
          `SELECT b.*
           FROM blog b
           JOIN saved_blogs sb ON b.id = sb.savedBlogId
           WHERE sb.savedUserId = $1
           ORDER BY b.date DESC`,
          [req.user.id]
        );
        res.render("saved_list.ejs", {
          posts: result.rows,
          user: req.user,
          query: "Saved Blogs"
        });
    } catch (error) {
        console.error("Search query failed:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

// List liked blogs
router.get('/liked', ensureAuthenticated, async (req, res) => {
    try {
        const result = await db.query(
          `SELECT b.*
           FROM blog b
           JOIN liked_blogs lb ON b.id = lb.likedBlogId
           WHERE lb.likedUserId = $1
           ORDER BY b.date DESC`,
          [req.user.id]
        );
        res.render("liked_list.ejs", {
          posts: result.rows,
          user: req.user,
          query: "Liked Blogs"
        });
    } catch (error) {
        console.error("Search query failed:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

// Route to display the form
router.get("/write", ensureAuthenticated, async (req, res) => {
    res.render("writeblog.ejs", { user: req.user, content: '' });
});

// View user statistics
router.get('/stats', ensureAuthenticated, async (req, res) => {
    try {
        // Fetch likes and saves data from the database
        const likesData = await db.query("SELECT likes FROM blog WHERE UserId = $1 ORDER BY date", [req.user.id]);
        const savesData = await db.query("SELECT saves FROM blog WHERE UserId = $1 ORDER BY date", [req.user.id]);
    
        const maxlikes = await db.query("SELECT * FROM blog WHERE UserId = $1 ORDER BY likes DESC", [req.user.id]);
        const maxsaves = await db.query("SELECT * FROM blog WHERE UserId = $1 ORDER BY saves DESC", [req.user.id]);
    
        // Extract the likes and saves counts into separate arrays
        const likes = likesData.rows.map(row => row.likes);
        const saves = savesData.rows.map(row => row.saves);
    
        // Render the stats page and pass the data
        res.render("stats", { likes, saves,  maxlikes: maxlikes.rows[0], maxsaves: maxsaves.rows[0]});
    } catch (error) {
        console.error("Error fetching chart data:", error);
        res.status(500).send("Internal Server Error");
    }
});

export default router;