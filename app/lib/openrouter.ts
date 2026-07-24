import { OpenRouter } from '@openrouter/sdk';
import 'server-only'; // Ensure this runs only on the server

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-3.5-turbo'; // Default to a common free model if not specified

if (!OPENROUTER_API_KEY) {
  throw new Error('OPENROUTER_API_KEY is not configured. Please add OPENROUTER_API_KEY to your .env.local file.');
}

const openrouter = new OpenRouter({
  apiKey: OPENROUTER_API_KEY,
});

export async function getOpenRouterResponse(prompt: string): Promise<string | null> {
  try {
    const stream = await openrouter.chat.send({
      chatRequest: {
        model: OPENROUTER_MODEL,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        stream: true,
        temperature: 0.7, // Adjust as needed for creativity vs. consistency
        max_tokens: 50,    // Keep response concise for price
      },
    });

    let responseContent = '';
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        responseContent += content;
      }
      // You could log usage here if needed, as per the example:
      // if (chunk.usage) {
      //   console.log("Reasoning tokens:", chunk.usage.completionTokensDetails?.reasoningTokens);
      // }
    }

    if (!responseContent) {
      console.warn('OpenRouter returned an empty response.');
      return null;
    }

    return responseContent;
  } catch (error) {
    console.error('Error calling OpenRouter API:', error);
    return null;
  }
}
