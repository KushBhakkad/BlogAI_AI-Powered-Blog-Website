import { GoogleGenAI } from '@google/genai';

const API_KEY = process.env.API_KEY;
const ai = new GoogleGenAI({ apiKey: API_KEY });

export const generateBlog = async (title, category) => {
  const prompt = `Generate a detailed and expansive single-paragraph blog content on the title of "${title}" within the "${category}" category. Explore various dimensions of "${title}". Avoid any points, headings, or structured format, presenting the information in a continuous, narrative paragraph. Ensure the content is as comprehensive and informative as possible while strictly adhering to the specified token size.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-lite-001",
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
    });
    // Extract the generated text
    if (
      response &&
      response.candidates &&
      response.candidates[0] &&
      response.candidates[0].content &&
      response.candidates[0].content.parts &&
      response.candidates[0].content.parts[0].text
    ) {
      const generatedContent = response.candidates[0].content.parts[0].text;
      return generatedContent;
    } else {
      throw new Error('Response does not contain expected content field');
    }
  } catch (error) {
    console.error("Error generating blog content:", error);
    throw error;
  }
};
