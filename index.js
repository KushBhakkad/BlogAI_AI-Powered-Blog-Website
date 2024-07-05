import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import bcrypt from "bcrypt";
import passport from "passport";
import { Strategy } from "passport-local";
import GoogleStrategy from "passport-google-oauth2";
import session from "express-session";
import { GoogleGenerativeAI } from "@google/generative-ai";
import translate from "translate";
import axios from 'axios';
import * as textgears from 'textgears-api';
import dictionaryEn from 'dictionary-en';
import { retext } from 'retext';
import retextSpell from 'retext-spell';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// Set up Unsplash API
import { createApi } from 'unsplash-js';
import nodeFetch from 'node-fetch';

const unsplash = createApi({
  accessKey: process.env.UNSPLASH_ACCESS_KEY,
  fetch: nodeFetch,
});

const app = express();
const port = 8080;
const saltRounds = 10;

const db = new pg.Client({
  user: process.env.POSTGRESQL_ADDON_USER,
  host: process.env.POSTGRESQL_ADDON_HOST,
  database: process.env.POSTGRESQL_ADDON_DB,
  password: process.env.POSTGRESQL_ADDON_PASSWORD,
  port: process.env.POSTGRESQL_ADDON_PORT,
});
db.connect();

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(bodyParser.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }, // Set secure: true if using https
  })
);


// Initialize Passport and restore authentication state, if any, from the session.
app.use(passport.initialize());
app.use(passport.session());

// Helper function to render the template with the active category
// Helper function to render the template with the active category and user information
const renderTemplate = async (req, res, category) => {
  try {
    const query = category === 'All' ? '' : `WHERE category = '${category}'`;
    const response_date = await db.query(`SELECT * FROM blog ${query} ORDER BY date DESC;`);
    const response_likes = await db.query(`SELECT * FROM blog ${query} ORDER BY likes DESC;`);
    const response_saved = await db.query(`SELECT * FROM blog ${query} ORDER BY saves DESC;`)

    res.render("index.ejs", {
      posts: response_date.rows,
      posts_saved: response_saved.rows,
      posts_rate: response_likes.rows,
      activeCategory: category,
      user: req.user,  // Pass user information
    });
  } catch (error) {
    console.error("Database query failed:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// All
app.get("/", async (req, res) => {
  renderTemplate(req, res, 'All');
});

// Lifestyle
app.get("/lifestyle", async (req, res) => {
  renderTemplate(req, res, 'Lifestyle');
});

// Politics
app.get("/politics", async (req, res) => {
  renderTemplate(req, res, 'Politics');
});

// Technology
app.get("/technology", async (req, res) => {
  renderTemplate(req, res, 'Technology');
});

// Finance
app.get("/finance", async (req, res) => {
  renderTemplate(req, res, 'Finance');
});

// Food
app.get("/food", async (req, res) => {
  renderTemplate(req, res, 'Food');
});

// Environment
app.get("/environment", async (req, res) => {
  renderTemplate(req, res, 'Environment');
});

// Health
app.get("/health", async (req, res) => {
  renderTemplate(req, res, 'Health');
});

// Fitness
app.get("/fitness", async (req, res) => {
  renderTemplate(req, res, 'Fitness');
});

// History
app.get("/history", async (req, res) => {
  renderTemplate(req, res, 'History');
});

// Career
app.get("/career", async (req, res) => {
  renderTemplate(req, res, 'Career');
});

// Arts
app.get("/arts", async (req, res) => {
  renderTemplate(req, res, 'Arts');
});

// Travel
app.get("/travel", async (req, res) => {
  renderTemplate(req, res, 'Travel');
});

const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
};


app.get("/login", async (req, res) => {
  res.render("login.ejs");
});

app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/subscribe",
  })
);

app.get("/subscribe", (req, res) => {
  res.render("subscribe.ejs");
});

app.post("/subscribe", async (req, res) => {
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

app.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    successRedirect: "/",
    failureRedirect: "/login",
  })
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

app.get("/profile", ensureAuthenticated, async (req, res) => {
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


app.get("/search", async (req, res) => {
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

app.get("/posts/:postId", async (req, res) => {
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

app.get("/archives/:monthYear", async (req, res) => {
  const monthYear = req.params.monthYear;
  const [month, year] = monthYear.split(/(?<=^[a-zA-Z]+)(?=\d+$)/);
  
  // Convert month name to number
  const monthNames = ["January", "February", "March", "April", "May", "June", 
                      "July", "August", "September", "October", "November", "December"];
  const monthNumber = monthNames.indexOf(month) + 1;

  try {
    // Fetch the blog posts from the database based on the month and year
    const result = await db.query(
      "SELECT * FROM blog WHERE EXTRACT(MONTH FROM date) = $1 AND EXTRACT(YEAR FROM date) = $2 ORDER BY date DESC",
      [monthNumber, year]
    );

    // Render the archives template with the retrieved data
    res.render("archives.ejs", { posts: result.rows, user: req.user, monthYear: monthYear });
  } catch (error) {
    console.error("Error fetching blog posts:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.post("/posts/:postId/like", async (req, res) => {
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

app.post("/posts/:postId/unlike", async (req, res) => {
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

app.post("/posts/:postId/save", async (req, res) => {
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

app.post("/posts/:postId/unsave", async (req, res) => {
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

// Define the logout route
app.get('/logout', (req, res) => {
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

app.get("/profile/blogs", ensureAuthenticated, async (req, res) => {
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

app.get("/profile/drafts", ensureAuthenticated, async (req, res) => {
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

app.get("/profile/saved", ensureAuthenticated, async (req, res) => {
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

app.get("/profile/liked", ensureAuthenticated, async (req, res) => {
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

// Function to correct misspelled words
async function correctText(inputText) {
  const file = await retext()
  .use(retextSpell, {dictionary: dictionaryEn})
  .process(inputText)

  let correctedText = inputText;
  file.messages.forEach(message => {
    const { actual, expected } = message;
    if (expected && expected.length > 0) {
      const suggestion = expected[0]; // take the first suggestion
      const regex = new RegExp(`\\b${actual}\\b`, 'g');
      correctedText = correctedText.replace(regex, suggestion);
    }
  });

  return correctedText;
}

// // Interceptor for logging requests
// axios.interceptors.request.use(request => {
//   console.log('Starting Request', request);
//   return request;
// });

// // Interceptor for logging responses
// axios.interceptors.response.use(response => {
//   console.log('Response:', response);
//   return response;
// });

// // Function to check grammar using TextGears API
// async function checkGrammar(inputText) {
//   const apiKey = process.env.TEXTGEARS_API_KEY; // Replace with your TextGears API key
//   const apiUrl = `https://api.textgears.com/grammar?key=${apiKey}&text=${encodeURIComponent(inputText)}`;

//   try {
//     const response = await axios.get(apiUrl, {
//       family: 4,
//       timeout: 10000
//     });
//     const data = response.data;

//     if (data.response && data.response.errors) {
//       let correctedText = inputText;
//       data.response.errors.forEach(error => {
//         const { bad, better } = error;
//         if (better && better.length > 0) {
//           const suggestion = better[0]; // take the first suggestion
//           const regex = new RegExp(`\\b${bad}\\b`, 'g');
//           correctedText = correctedText.replace(regex, suggestion);
//         }
//       });
//       return correctedText;
//     } else {
//       throw new Error('Invalid response from TextGears API');
//     }
//   } catch (err) {
//     console.error('Error checking grammar:', err);
//     throw err;
//   }
// }

  // Access your API key as an environment variable (see "Set up your API key" above)
  const API_KEY = process.env.API_KEY;
  const genAI = new GoogleGenerativeAI(API_KEY);

  // For text-only input, use the gemini-pro model
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

// Function to generate blog content
async function generateBlog(title, category) {
  const prompt = `Generate a detailed and expansive single-paragraph blog content on the title of "${title}" within the "${category}" category. Explore various dimensions of "${title}". Avoid any points, headings, or structured format, presenting the information in a continuous, narrative paragraph. Ensure the content is as comprehensive and informative as possible while strictly adhering to the specified token size.`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = await response.text();
    return text;
  } catch (error) {
    console.error("Error generating blog content:", error);
    throw error;
  }
}

// Route to display the form
app.get("/profile/write", ensureAuthenticated, async (req, res) => {
  res.render("writeblog.ejs", { user: req.user, content: '' });
});

// Route to handle blog generation
app.post("/generateblog", ensureAuthenticated, async (req, res) => {
  try {
    const { title, category } = req.body;
    console.log("Generating blog for:", { title, category }); // Debug statement
    const content = await generateBlog(title, category);
    console.log("Generated content:", content); // Debug statement
    res.json({ content });
  } catch (error) {
    res.status(500).json({ error: "Failed to generate blog content" });
  }
});

// Route to handle form submission and correct text
app.post("/writeblog", ensureAuthenticated, async (req, res) => {
  try {
    let { title, content, query, category, previousBlogId } = req.body;
    const userId = req.user.id;

    // Correct the content
    content = await correctText(content);
    // content = await checkGrammar(content);

    // Fetch image URL asynchronously
    const imageURL = await fetchImageURL(query);

    const currentDate = new Date(); // Get current date and time

    // Insert new blog into database
    const newBlog = await db.query(
      "INSERT INTO blog (title, content, image, author, category, date, UserId) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
      [title, content, imageURL, req.user.username, category, currentDate, userId]
    );

    // Delete the previous blog if exists
    if (previousBlogId) {      
      // Then, delete the blog entry
      const deleteResult = await db.query("DELETE FROM blog WHERE id = $1", [previousBlogId]);
      if (deleteResult.rowCount === 0) {
        throw new Error("Previous blog not found or not deleted.");
      }
    }

    res.redirect("/profile/blogs");
  } catch (error) {
    console.error("Error saving blog:", error);
    res.status(500).send("An error occurred while saving the blog.");
  }
});

app.post("/draftblog", ensureAuthenticated, async (req, res) => {
  try {
    let { title, content, query, category } = req.body;
    const userId = req.user.id;

    // Correct the content
    content = await correctText(content);
    // content = await checkGrammar(content);

    // Fetch image URL asynchronously
    const imageURL = await fetchImageURL(query);

    const currentDate = new Date(); // Get current date and time

    // Insert new blog into database
    await db.query(
      "INSERT INTO draft (title, content, image, author, category, date, user_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
      [title, content, imageURL, req.user.username, category, currentDate, userId]
    );

    // Delete the draft from drafts table
    await db.query("DELETE FROM draft WHERE id = $1", [req.body.previousBlogId]);

    res.redirect("/profile/drafts");
  } catch (error) {
    console.error("Error saving draft:", error);
    res.status(500).send("An error occurred while saving the draft.");
  }
});

// Function to fetch image URL asynchronously
const fetchImageURL = async (query) => {
  try {
    const response = await unsplash.search.getPhotos({
      query: query,
      perPage: 1, // Limit to 1 photo
    });

    if (response.errors) {
      throw new Error(response.errors[0]);
    }

    const firstPhoto = response.response.results[0];
    if (firstPhoto && firstPhoto.urls && firstPhoto.urls.full) {
      return firstPhoto.urls.full;
    } else {
      throw new Error("Image not found");
    }
  } catch (error) {
    console.error("Error fetching image:", error);
    throw error; // Re-throw the error to be caught in the route handler
  }
};

app.get("/completedraft", ensureAuthenticated, async (req, res) => {
  try {
    const draftId = req.query.draftId;
    const draft = await db.query("SELECT * FROM draft WHERE id = $1", [draftId]);
    res.render("editblogs.ejs", { blog: draft.rows[0], user: req.user });
  } catch (error) {
    console.error("Error fetching draft:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.get("/editblog", ensureAuthenticated, async (req, res) => {
  try {
    const blogId = req.query.blogId;
    const blog = await db.query("SELECT * FROM blog WHERE id = $1", [blogId]);
    res.render("editblogs.ejs", { blog: blog.rows[0], user: req.user });
  } catch (error) {
    console.error("Error fetching blog:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.get("/deleteblog", ensureAuthenticated, async (req, res) => {
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
app.get("/deletedraft", ensureAuthenticated, async (req, res) => {
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

app.get("/profile/stats", async (req, res) => {
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

app.listen(port, () => {
  console.log(`API is running at http://localhost:${port}`);
});