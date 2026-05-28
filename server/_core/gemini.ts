/**
 * OpenRouter API client for health report extraction.
 * Uses google/gemini-2.0-flash via OpenRouter (OpenAI-compatible API).
 * Supports PDF and image input.
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

CRITICAL OUTPUT RULES — YOU MUST FOLLOW THESE EXACTLY:
- Output ONLY a raw JSON array. Nothing else.
- NO markdown, NO code fences, NO backticks, NO bullet points, NO asterisks, NO explanation text.
- Do NOT write \`\`\`json or \`\`\` anywhere.
- Do NOT write any text before or after the array.
- The VERY FIRST character of your response must be [ and the VERY LAST character must be ]

Each object in the array must have these fields:
- "name": biomarker name as a string (e.g. "Hemoglobin")
- "value": the measured value as a string (e.g. "13.5")
- "unit": measurement unit as a string (e.g. "g/dL"), empty string if none
- "referenceMin": lower bound of normal range as a string, omit if not shown
- "referenceMax": upper bound of normal range as a string, omit if not shown
- "status": one of "normal", "warning", "abnormal", or "unknown"

EXAMPLE OF CORRECT OUTPUT (copy this format exactly):
[{"name":"Hemoglobin","value":"13.5","unit":"g/dL","referenceMin":"13.0","referenceMax":"17.0","status":"normal"},{"name":"Glucose","value":"105","unit":"mg/dL","referenceMin":"70","referenceMax":"100","status":"warning"}]`;

/**
 * Multi-strategy parser — handles all known model response formats:
 * 1. Clean JSON array: [{...}, {...}]
 * 2. Markdown code fenced: ```json [...] ```
 * 3. Bullet points with embedded JSON: * *Name*: {...}
 * 4. Mixed/partial text with JSON objects scattered throughout
 */
function parseModelResponse(raw: string): ExtractedBiomarker[] {
  // Step 1: Strip all markdown code fences and common decorators
  const cleaned = raw
    .replace(/```[\w]*\r?\n?/gi, "")   // ```json or ```JSON etc.
    .replace(/```\r?\n?/g, "")          // closing ```
    .replace(/^\s*#+\s+.*$/gm, "")      // markdown headers
    .trim();

  // Strategy A: look for a top-level JSON array and parse it directly
  const arrStart = cleaned.indexOf("[");
  const arrEnd = cleaned.lastIndexOf("]");
  if (arrStart !== -1 && arrEnd > arrStart) {
    try {
      const candidate = cleaned.slice(arrStart, arrEnd + 1);
      const parsed = JSON.parse(candidate) as ExtractedBiomarker[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      // fall through to next strategy
    }
  }

  // Strategy B: extract every {...} object from the text (handles bullet-point formats),
  // then collect the ones that look like biomarker objects
  const objects: ExtractedBiomarker[] = [];
  // Match balanced braces (handles nested strings, not nested objects)
  const objectRegex = /\{[^{}]*\}/g;
  let match: RegExpExecArray | null;
  while ((match = objectRegex.exec(cleaned)) !== null) {
    try {
      const obj = JSON.parse(match[0]);
      if (obj && typeof obj.name === "string" && typeof obj.value === "string") {
        objects.push({
          name: obj.name,
          value: obj.value,
          unit: obj.unit ?? "",
          referenceMin: obj.referenceMin,
          referenceMax: obj.referenceMax,
          status: ["normal", "warning", "abnormal", "unknown"].includes(obj.status)
            ? obj.status
            : "unknown",
        });
      }
    } catch {
      // skip malformed objects
    }
  }
  if (objects.length > 0) return objects;

  // Strategy C: parse line by line — each line may be "Name: value unit [range] status"
  // or "* *Name*: {...}" style bullet points — pull out any valid JSON object per line
  const lineObjects: ExtractedBiomarker[] = [];
  for (const line of cleaned.split(/\r?\n/)) {
    const trimmed = line.replace(/^[\s*•\-]+/, "").trim(); // strip bullet chars
    // Try to find a JSON fragment on this line
    const lStart = trimmed.indexOf("{");
    const lEnd = trimmed.lastIndexOf("}");
    if (lStart !== -1 && lEnd > lStart) {
      try {
        const obj = JSON.parse(trimmed.slice(lStart, lEnd + 1));
        if (obj && typeof obj.name === "string" && typeof obj.value === "string") {
          lineObjects.push({
            name: obj.name,
            value: obj.value,
            unit: obj.unit ?? "",
            referenceMin: obj.referenceMin,
            referenceMax: obj.referenceMax,
            status: ["normal", "warning", "abnormal", "unknown"].includes(obj.status)
              ? obj.status
              : "unknown",
          });
        }
      } catch {
        // skip
      }
    }
  }
  if (lineObjects.length > 0) return lineObjects;

  throw new Error(
    "Could not parse any biomarkers from model response. Raw (first 300 chars): " +
      raw.slice(0, 300)
  );
}

export async function extractBiomarkersWithGemini(
  base64Data: string,
  mimeType: "application/pdf" | "image/jpeg" | "image/png",
): Promise<ExtractedBiomarker[]> {
  const apiKey = ENV.openrouterApiKey;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured. Add it to Railway environment variables.");
  }

  const url = "https://openrouter.ai/api/v1/chat/completions";

  // Build the content array — file type for PDFs, image_url for images
  const fileContent = mimeType === "application/pdf"
    ? {
        type: "file",
        file: {
          filename: "report.pdf",
          file_data: `data:application/pdf;base64,${base64Data}`,
        },
      }
    : {
        type: "image_url",
        image_url: {
          url: `data:${mimeType};base64,${base64Data}`,
        },
      };

  const body = {
    model: "google/gemini-3.5-flash",
    messages: [
      {
        role: "user",
        content: [
          fileContent,
          { type: "text", text: EXTRACTION_PROMPT },
        ],
      },
    ],
    temperature: 0.1,
    max_tokens: 4096,
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60_000); // 60s timeout

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://healthrecord-production-68cc.up.railway.app",
        "X-Title": "HealthRecord",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err: any) {
    if (err?.name === "AbortError") {
      throw new Error("OpenRouter request timed out after 60 seconds. Try a smaller or clearer image.");
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenRouter API error ${response.status}: ${err}`);
  }

  const data = (await response.json()) as any;
  const text: string = data?.choices?.[0]?.message?.content ?? "";

  return parseModelResponse(text);
}
