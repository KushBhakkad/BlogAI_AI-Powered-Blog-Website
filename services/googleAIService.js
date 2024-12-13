import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = process.env.API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

// For text-only input, use the gemini-pro model
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

export const generateBlog = async (title, category) => {
    const prompt = `Write a detailed blog about ${title} in the ${category} category.`;
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
