// File: /routes/authRoutes.js

import express from 'express';
import passport from 'passport';
import db from '../services/dbClient.js';
import bcrypt from "bcrypt";

const router = express.Router();

const saltRounds = 10;

router.get('/login', (req, res) => res.render('login.ejs'));
router.post('/login', passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/subscribe',
}));

router.get("/subscribe", (req, res) => res.render("subscribe.ejs"));
router.post("/subscribe", async (req, res) => {
    const username = req.body.username;
    const email = req.body.email;
    const password = req.body.password;
  
    try {
      const checkResult = await db.query("SELECT * FROM public.user WHERE email = $1", [
        email,
      ]);
  
      if (checkResult.rows.length > 0) {
        res.redirect("/login");
      } else {
        bcrypt.hash(password, saltRounds, async (err, hash) => {
          if (err) {
            console.error("Error hashing password:", err);
          } else {
            const result = await db.query(
              "INSERT INTO public.user (username, email, password) VALUES ($1, $2, $3) RETURNING *",
              [username, email, hash]
            );
            const user = result.rows[0];
            req.login(user, (err) => {
              if (err) {
                console.error("Login error:", err);
                res.redirect("/login");
              } else {
                res.redirect("/");
              }
            });
          }
        });
      }
    } catch (err) {
      console.log(err);
      res.status(500).json({ message: "Internal Server Error" });
    }
});

// Define the logout route
router.get('/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error('Logout error:', err);
        return res.status(500).json({ message: 'Internal Server Error' });
      }
      req.session.destroy((err) => {
        if (err) {
          console.error('Session destroy error:', err);
          return res.status(500).json({ message: 'Internal Server Error' });
        }
        res.redirect('/');
      });
    });
  });

router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/auth/google/callback', passport.authenticate('google', {
    successRedirect: '/',
    failureRedirect: '/login',
}));

export default router;