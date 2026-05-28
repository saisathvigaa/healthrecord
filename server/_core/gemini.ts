/**
 * Gemini API client for health report extraction.
 * Uses Gemini 1.5 Flash which supports PDF and image input.
 */
import { ENV } from "./env";

export interface ExtractedBiomarker {
  name: string;
  value: string;
  unit: string;
  referenceMin?: string;
  referenceMax?: string;
  status: "normal" | "warning" | "abnormal" | "unknown";
}

const EXTRACTION_PROMPT = `You are a medical data extraction specialist. Extract ALL biomarker values from this health test report.

For each biomarker found, return:
- name: the biomarker name (e.g. "Hemoglobin", "Glucose", "Creatinine")
- value: the numeric value as a string (e.g. "13.5")
- unit: the measurement unit (e.g. "g/dL", "mg/dL", "mmol/L")
- referenceMin: lower bound of normal range if shown (as string, or omit if not shown)
- referenceMax: upper bound of normal range if shown (as string, or omit if not shown)
- status: "normal" if within range, "warning" if slightly outside, "abnormal" if significantly outside, "unknown" if can't determine

Return ONLY a JSON array. No explanation, no markdown. Example:
[
  {"name":"Hemoglobin","value":"13.5","unit":"g/dL","referenceMin":"13.0","referenceMax":"17.0","status":"normal"},
  {"name":"Glucose","value":"105","unit":"mg/dL","referenceMin":"70","referenceMax":"100","status":"warning"}
]`;

export async function extractBiomarkersWithGemini(
  base64Data: string,
  mimeType: "application/pdf" | "image/jpeg" | "image/png",
): Promise<ExtractedBiomarker[]> {
  const apiKey = ENV.geminiApiKey;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured. Add it to Railway environment variables.");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const body = {
    contents: [
      {
        parts: [
          {
            inline_data: {
              mime_type: mimeType,
              data: base64Data,
            },
          },
          {
            text: EXTRACTION_PROMPT,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 4096,
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${err}`);
  }

  const data = (await response.json()) as any;
  const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  // Parse JSON out of the response (strip any markdown code fences)
  const clean = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const start = clean.indexOf("[");
  const end = clean.lastIndexOf("]");
  if (start === -1 || end === -1) {
    throw new Error("Gemini did not return a valid JSON array: " + clean.slice(0, 200));
  }

  const parsed = JSON.parse(clean.slice(start, end + 1)) as ExtractedBiomarker[];
  return parsed;
}
