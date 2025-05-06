// File: /routes/blogRoutes.js

import express from 'express';
import { ensureAuthenticated } from '../middlewares/authMiddleware.js';
import { generateBlog } from '../services/googleAIService.js';
import { fetchImageURL } from '../services/unsplashService.js';
import { fetchGoogleImage } from '../services/googleCSEService.js';
import {correctText} from '../services/textCorrectionService.js';
import db from '../services/dbClient.js';

const router = express.Router();

router.post("/generateblog", ensureAuthenticated, async (req, res) => {
  try {
    const { title, category } = req.body;
    const content = await generateBlog(title, category);
    res.json({ content });
  } catch (error) {
    res.status(500).json({ error: "Failed to generate blog content" });
  }
});

// Route to handle form submission and correct text
router.post("/writeblog", ensureAuthenticated, async (req, res) => {
  try {
    let { title, content, query, category, previousBlogId, skipCorrection, useUnsplash } = req.body;
    const userId = req.user.id;
    skipCorrection = skipCorrection === "true";

    if (!skipCorrection) {
      content = await correctText(content);
    }

    // decide source based on checkbox
    let imageURL;
    if (useUnsplash) {
      imageURL = await fetchImageURL(query);       // your Unsplash wrapper
    } else {
      imageURL = await fetchGoogleImage(query);    // your Google CSE wrapper
    }

    const currentDate = new Date();
    const newBlog = await db.query(
      `INSERT INTO blog
         (title, content, image, author, category, date, UserId)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [title, content, imageURL, req.user.username, category, currentDate, userId]
    );

    if (previousBlogId) {
      await db.query("DELETE FROM blog WHERE id = $1", [previousBlogId]);
    }

    res.redirect("/profile/blogs");
  } catch (error) {
    console.error("Error saving blog:", error);
    res.status(500).send("An error occurred while saving the blog.");
  }
});
  
router.post("/draftblog", ensureAuthenticated, async (req, res) => {
  try {
    let { title, content, query, category, skipCorrection, previousBlogId, useUnsplash } = req.body;
    const userId = req.user.id;
    skipCorrection = skipCorrection === "true";

    if (!skipCorrection) {
      content = await correctText(content);
    }

    let imageURL;
    if (useUnsplash) {
      imageURL = await fetchImageURL(query);
    } else {
      imageURL = await fetchGoogleImage(query);
    }

    const currentDate = new Date();
    await db.query(
      `INSERT INTO draft
         (title, content, image, author, category, date, user_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [title, content, imageURL, req.user.username, category, currentDate, userId]
    );

    if (previousBlogId) {
      await db.query("DELETE FROM draft WHERE id = $1", [previousBlogId]);
    }

    res.redirect("/profile/drafts");
  } catch (error) {
    console.error("Error saving draft:", error);
    res.status(500).send("An error occurred while saving the draft.");
  }
});

router.get("/completedraft", ensureAuthenticated, async (req, res) => {
    try {
      const draftId = req.query.draftId;
      const draft = await db.query("SELECT * FROM draft WHERE id = $1", [draftId]);
      res.render("editblogs.ejs", { blog: draft.rows[0], user: req.user });
    } catch (error) {
      console.error("Error fetching draft:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });
  
  router.get("/editblog", ensureAuthenticated, async (req, res) => {
    try {
      const blogId = req.query.blogId;
      const blog = await db.query("SELECT * FROM blog WHERE id = $1", [blogId]);
      res.render("editblogs.ejs", { blog: blog.rows[0], user: req.user });
    } catch (error) {
      console.error("Error fetching blog:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
});
  
router.get("/deleteblog", ensureAuthenticated, async (req, res) => {
    try {
      const blogId = req.query.blogId;
  
      // Then, delete the blog entry
      let deleteResult = await db.query("DELETE FROM liked_blogs WHERE likedblogid = $1", [blogId]);
      deleteResult = await db.query("DELETE FROM saved_blogs WHERE savedblogid = $1", [blogId]);
      deleteResult = await db.query("DELETE FROM blog WHERE id = $1", [blogId]);
      if (deleteResult.rowCount === 0) {
        throw new Error("Blog not found or not deleted.");
      }
  
      res.redirect("/profile/blogs");
    } catch (error) {
      console.error("Error deleting blog:", error);
      res.status(500).json({ message: "An error occurred while deleting the blog." });
    }
});
  
  // Delete Draft Route
router.get("/deletedraft", ensureAuthenticated, async (req, res) => {
    try {
      const draftId = req.query.draftId;
  
      // Delete the draft from drafts table
      const deleteResult = await db.query("DELETE FROM draft WHERE id = $1", [draftId]);
      if (deleteResult.rowCount === 0) {
        throw new Error("Draft not found or not deleted.");
      }
  
      res.redirect("/profile/drafts");
    } catch (error) {
      console.error("Error deleting draft:", error);
      res.status(500).json({ message: "An error occurred while deleting the draft." });
    }
});

export default router;