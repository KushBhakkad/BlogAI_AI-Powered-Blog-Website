import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = process.env.API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

// For text-only input, use the gemini-pro model
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

export const generateBlog = async (title, category) => {
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
};
