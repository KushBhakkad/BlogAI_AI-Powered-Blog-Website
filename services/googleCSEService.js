import fetch from 'node-fetch';

export const fetchGoogleImage = async (query) => {
    const apiKey = process.env.GOOGLE_API_KEY;
    const cseId = process.env.GOOGLE_CSE_ID;

    const url = `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(query)}&key=${apiKey}&cx=${cseId}&searchType=image&num=1`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.items && data.items.length > 0) {
            return data.items[0].link; // URL of the image
        } else {
            throw new Error('No images found');
        }
    } catch (err) {
        console.error('Google CSE Error:', err);
        throw err;
    }
};