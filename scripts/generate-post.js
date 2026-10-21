const fs = require('fs');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const modelsToTry = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-flash'];

async function callGemini(prompt) {
  for (const model of modelsToTry) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model: model,
          contents: prompt,
        });
        return response.text;
      } catch (err) {
        console.warn(`Model ${model} attempt ${attempt} failed:${err.message}`);
        await new Promise((res) => setTimeout(res, 3000));
      }
    }
  }
  throw new Error("API call failed across all models.");
}

async function runAutonomousBlogPipeline() {
  try {
    console.log("🤖 [Stage 1/3] Selecting trending tech topic...");
    const topicPrompt = `Identify a single, highly engaging trending topic in Tech, AI, Software, or Digital Business. Return ONLY the title string.`;
    const chosenTopic = (await callGemini(topicPrompt)).trim();
    console.log(`📌 Topic selected: "${chosenTopic}"`);

    console.log("✍️ [Stage 2/3] Writing draft & fetching visual metadata...");
    const draftPrompt = `Write an authoritative, engaging, SEO-optimized blog article about: "${chosenTopic}".
Include:
- Clear subheadings (##)
- Key takeaways bullet list
- Practical examples
- A single English keyword representing the topic image (e.g., "artificial-intelligence", "workspace", "coding")`;

    const rawDraft = await callGemini(draftPrompt);

    console.log("🔍 [Stage 3/3] AI Editor polishing layout & visual media...");
    const reviewPrompt = `You are a professional web publisher. Polish the following draft into a modern, magazine-style blog post.

Draft:
${rawDraft}

Return strictly a raw JSON object (without markdown code fences like \`\`\`json) with this exact schema:
{
  "title": "Engaging Article Title",
  "slug": "clean-url-slug",
  "description": "Short catchy summary under 150 characters",
  "imageKeyword": "single-word-topic-keyword-for-image-search",
  "content": "Polished markdown article text. Include 1 inline image in the middle of the article using markdown tag: ![Topic Image](https://source.unsplash.com/featured/800x450/?your-keyword). Use clear headings (##), blockquotes (>), and bullet lists."
}`;

    let reviewOutput = await callGemini(reviewPrompt);
    reviewOutput = reviewOutput.trim().replace(/^```json/, '').replace(/^```/, '').replace(/```$/, '').trim();

    const postData = JSON.parse(reviewOutput);
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `${dateStr}-${postData.slug}.md`;
    const heroImageUrl = `https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80`;

    const finalArticle = `---
layout: post
title: "${postData.title.replace(/"/g, '\\"')}"
date: ${dateStr}
categories: [Tech, AI]
description: "${postData.description.replace(/"/g, '\\"')}"
---

![Header Banner](${heroImageUrl})

> **Editor's Note:** ${postData.description}

---

${postData.content}
`;

    const targetDir = path.join(__dirname, '../_posts');
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    fs.writeFileSync(path.join(targetDir, fileName), finalArticle);
    
    // Save a live status JSON file for your ULTRON-OS UI dashboard
    const statusData = {
      lastUpdate: new Date().toISOString(),
      activeAgent: "SCRIBE",
      lastAction: `Published article: "${postData.title}"`,
      status: "ONLINE"
    };
    fs.writeFileSync(path.join(__dirname, '../agent-status.json'), JSON.stringify(statusData, null, 2));

    console.log(`🎉 Successfully published rich professional article & status log: ${fileName}`);

  } catch (error) {
    console.error("❌ Pipeline failed:", error);
    process.exit(1);
  }
}

runAutonomousBlogPipeline();
