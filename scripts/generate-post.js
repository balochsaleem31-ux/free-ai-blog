const fs = require('fs');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function generateBlog() {
  try {
    const prompt = `Write a comprehensive, SEO-optimized blog post about a trending digital business or productivity topic. 
    Return the output strictly as a raw JSON object (with no markdown block tags like \`\`\`json) with the following structure:
    {
      "title": "Your Blog Title",
      "slug": "url-friendly-slug",
      "description": "Short meta description",
      "content": "Full blog article content formatted in markdown with headings ##, bullet points, and paragraphs."
    }`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    let rawText = response.text.trim();
    rawText = rawText.replace(/^```json/, '').replace(/^```/, '').replace(/```$/, '').trim();
    
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
