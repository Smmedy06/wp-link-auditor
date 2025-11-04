
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Link } from '../types';

export const analyzeLinksWithAI = async (links: Link[], focusKeyphrase?: string): Promise<string> => {
  try {
    if (!process.env.API_KEY) {
      throw new Error("API_KEY environment variable not set");
    }
    
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const externalLinks = links
      .filter(link => link.isExternal)
      .map(link => `- URL: ${link.href}, Anchor Text: "${link.anchorText}"`)
      .join('\n');

    if (!externalLinks) {
        return "No external links found to analyze.";
    }

    let prompt = `
      As an expert SEO and link auditor, analyze the following list of external links from a blog post.
      Provide a concise, actionable analysis in Markdown format.

      Your analysis should include:
      1.  **Overall Summary:** A brief overview of the outbound link profile quality.
      2.  **Anchor Text Suggestions:** Identify up to 3 links with weak anchor text and suggest specific, SEO-friendly alternatives.
      3.  **Potential Issues:** Point out any links that might seem low-quality, irrelevant, or potentially spammy.
      4.  **Positive Points:** Highlight any high-authority or particularly relevant links.
    `;

    if (focusKeyphrase) {
      prompt += `
      \n**The post's focus keyphrase is "${focusKeyphrase}".** Pay special attention to how the links and their anchor text relate to this keyphrase. Are they supportive? Are there missed opportunities to use anchor text that aligns better with the keyphrase?\n
      `;
    }

    prompt += `
      Here is the list of external links:
      ${externalLinks}
    `;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    return response.text;
  } catch (error) {
    console.error("Error analyzing links with Gemini API:", error);
    if (error instanceof Error) {
        return `An error occurred during AI analysis: ${error.message}. Please check your Gemini API key and configuration.`;
    }
    return "An unknown error occurred during AI analysis.";
  }
};