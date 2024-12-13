// File: /routes/postsRoutes.js

import express from 'express';
import db from '../services/dbClient.js';

const router = express.Router();

router.get("/:monthYear", async (req, res) => {
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

export default router;