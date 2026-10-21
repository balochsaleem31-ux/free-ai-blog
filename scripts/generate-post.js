const fs = require('fs');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// List of fallback models if one is under high demand
const modelsToTry = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-flash-latest'];

async function callGeminiWithRetry() {
  const prompt = 'Write a comprehensive, SEO-optimized blog post about a trending digital productivity topic. Return the output strictly as a raw JSON object with this exact structure: {"title": "Your Blog Title", "slug": "url-friendly-slug", "description": "Short meta description", "content": "Full blog article content formatted in markdown with headings ## and bullet points."}';

  for (const model of modelsToTry) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`Trying model ${model} (Attempt ${attempt})...`);
        const response = await ai.models.generateContent({
          model: model,
          contents: prompt,
        });
        return response.text;
      } catch (err) {
        console.warn(`Model ${model} attempt ${attempt} failed: ${err.message}`);
        // Wait 3 seconds before retrying on 503 overload
        await new Promise((res) => setTimeout(res, 3000));
      }
    }
  }
  throw new Error("All models and retry attempts failed due to API server demand.");
}

async function generateBlog() {
  try {
    console.log("Generating blog post with Gemini...");
    
    let rawText = await callGeminiWithRetry();
    rawText = rawText.trim().replace(/^```json/, '').replace(/^```/, '').replace(/```$/, '').trim();
    
    const postData = JSON.parse(rawText);
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `${dateStr}-${postData.slug}.md`;
    
    const fileContent = `# ${postData.title}

*Published on: ${dateStr}*

> ${postData.description}

---

${postData.content}
`;

    const targetDir = path.join(__dirname, '../posts');
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    fs.writeFileSync(path.join(targetDir, fileName), fileContent);
    console.log(`Successfully generated free blog post: ${fileName}`);
  } catch (error) {
    console.error("Error generating post:", error);
    process.exit(1);
  }
}

generateBlog();
