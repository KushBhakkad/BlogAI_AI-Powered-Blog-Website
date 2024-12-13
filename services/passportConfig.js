// File: /services/passportConfig.js

import passport from 'passport';
import bcrypt from "bcrypt";
import  dotenv from 'dotenv';
import { Strategy } from 'passport-local';
import GoogleStrategy from 'passport-google-oauth2';
import db from './dbClient.js';

dotenv.config();

passport.use(
    "local",
    new Strategy(async function verify(email, password, cb) {
      try {
        const result = await db.query("SELECT * FROM public.user WHERE email = $1 ", [
          email,
        ]);
        if (result.rows.length > 0) {
          const user = result.rows[0];
          const storedHashedPassword = user.password;
          bcrypt.compare(password, storedHashedPassword, (err, valid) => {
            if (err) {
              console.error("Error comparing passwords:", err);
              return cb(err);
            } else {
              if (valid) {
                return cb(null, user);
              } else {
                return cb(null, false);
              }
            }
          });
        } else {
          return cb("User not found");
        }
      } catch (err) {
        console.log(err);
        return cb(err);
      }
    })
  );
  
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
        userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
      },
      async (accessToken, refreshToken, profile, cb) => {
        try {
          const result = await db.query("SELECT * FROM public.user WHERE email = $1", [
            profile.email,
          ]);
          if (result.rows.length === 0) {
            const newUser = await db.query(
              "INSERT INTO public.user (username, email, password) VALUES ($1, $2, $3)",
              [profile.displayName, profile.email, "google"]
            );
            return cb(null, newUser.rows[0]);
          } else {
            return cb(null, result.rows[0]);
          }
        } catch (err) {
          console.error("Error during Google OAuth:", err);
          return cb(err);
        }
      }
    )
  );

  passport.serializeUser((user, cb) => {
    cb(null, user.id);  // Serialize user ID into session
  });
  
  passport.deserializeUser(async (id, cb) => {
    try {
      const result = await db.query("SELECT * FROM public.user WHERE id = $1", [id]);
      if (result.rows.length > 0) {
        cb(null, result.rows[0]);  // Deserialize user from session
      } else {
        cb(new Error("User not found"));
      }
    } catch (err) {
      cb(err);
    }
  });

export default passport;