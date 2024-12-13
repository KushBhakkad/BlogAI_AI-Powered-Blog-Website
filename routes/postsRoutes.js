// File: /routes/postsRoutes.js

import express from 'express';
import db from '../services/dbClient.js';

const router = express.Router();

router.get("/:postId", async (req, res) => {
    const postId = req.params.postId;
    const userId = req.user ? req.user.id : null;  // Get the user ID from the session
    try {
      const post = await db.query("SELECT * FROM blog WHERE id = $1", [postId]);
      if (userId) {
        const liked = await db.query("SELECT * FROM liked_blogs WHERE likedUserId = $1 AND likedBlogId = $2", [userId, postId]);
        const saved = await db.query("SELECT * FROM saved_blogs WHERE savedUserId = $1 AND savedBlogId = $2", [userId, postId]);
        post.rows[0].liked = liked.rows.length > 0;
        post.rows[0].saved = saved.rows.length > 0;
      } else {
        post.rows[0].liked = false;
        post.rows[0].saved = false;
      }
      res.render("blog.ejs", { post: post.rows[0], user: req.user });
    } catch (error) {
      console.error("Error fetching blog post:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });
  
  router.post("/:postId/like", async (req, res) => {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const postId = req.params.postId;
    const userId = req.user.id;
  
    try {
      await db.query("INSERT INTO liked_blogs (likedUserId, likedBlogId) VALUES ($1, $2)", [userId, postId]);
      await db.query("UPDATE public.blog SET likes = likes + 1 WHERE id = $1", [postId]);
      res.status(200).json({ message: "Post liked" });
    } catch (error) {
      console.error("Error liking post:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });
  
  router.post("/:postId/unlike", async (req, res) => {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const postId = req.params.postId;
    const userId = req.user.id;
  
    try {
      await db.query("DELETE FROM liked_blogs WHERE likedUserId = $1 AND likedBlogId = $2", [userId, postId]);
      await db.query("UPDATE public.blog SET likes = likes - 1 WHERE id = $1", [postId]);
      res.status(200).json({ message: "Post unliked" });
    } catch (error) {
      console.error("Error unliking post:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });
  
  router.post("/:postId/save", async (req, res) => {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const postId = req.params.postId;
    const userId = req.user.id;
  
    try {
      await db.query("INSERT INTO saved_blogs (savedUserId, savedBlogId) VALUES ($1, $2)", [userId, postId]);
      await db.query("UPDATE public.blog SET saves = saves + 1 WHERE id = $1", [postId]);
      res.status(200).json({ message: "Post saved" });
    } catch (error) {
      console.error("Error saving post:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });
  
  router.post("/:postId/unsave", async (req, res) => {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const postId = req.params.postId;
    const userId = req.user.id;
  
    try {
      await db.query("DELETE FROM saved_blogs WHERE savedUserId = $1 AND savedBlogId = $2", [userId, postId]);
      await db.query("UPDATE public.blog SET saves = saves - 1 WHERE id = $1", [postId]);
      res.status(200).json({ message: "Post unsaved" });
    } catch (error) {
      console.error("Error unsaving post:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });
  

export default router;