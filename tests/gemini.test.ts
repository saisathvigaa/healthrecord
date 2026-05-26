import { describe, it, expect } from 'vitest';

describe('Gemini API Integration', () => {
  it('should validate Gemini API key is set', async () => {
    const apiKey = process.env.GEMINI_API_KEY;
    expect(apiKey).toBeDefined();
    expect(apiKey).toHaveLength(39); // Gemini keys are typically 39 chars
  });

  it.skip('should be able to call Gemini API', async () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not set');
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: 'What is 2+2?',
                },
              ],
            },
          ],
        }),
      }
    );

    const data = await response.json();
    if (!response.ok) {
      console.log('API Error:', { status: response.status, data });
    }
    expect(response.ok).toBe(true);
    expect(data.candidates || data.content).toBeDefined();
  });
});
