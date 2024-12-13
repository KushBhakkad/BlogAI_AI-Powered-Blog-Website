import db from './dbClient.js';

export const renderTemplate = async (req, res, category) => {
    try {
        const query = category === 'All' ? '' : `WHERE category = '${category}'`;
        const responseDate = await db.query(`SELECT * FROM blog ${query} ORDER BY date DESC;`);
        const responseLikes = await db.query(`SELECT * FROM blog ${query} ORDER BY likes DESC;`);
        const responseSaved = await db.query(`SELECT * FROM blog ${query} ORDER BY saves DESC;`);

        res.render('index.ejs', {
            posts: responseDate.rows,
            posts_saved: responseSaved.rows,
            posts_rate: responseLikes.rows,
            activeCategory: category,
            user: req.user, // Pass user information
        });
    } catch (error) {
        console.error('Error rendering template:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};