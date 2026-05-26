import { invokeLLM } from "./_core/llm";
import * as db from "./db";

export interface ExtractedBiomarker {
  name: string;
  value: string;
  unit: string;
  referenceMin?: string;
  referenceMax?: string;
  status: "normal" | "warning" | "abnormal" | "unknown";
}

export interface ExtractionResult {
  success: boolean;
  biomarkers: ExtractedBiomarker[];
  rawText?: string;
  error?: string;
}

/**
 * Extract biomarker values from a health report using Gemini Vision API
 */
export async function extractBiomarkersFromReport(
  reportUrl: string,
  reportType: "blood" | "urine" | "other"
): Promise<ExtractionResult> {
  try {
    // Determine mime type based on URL
    const mimeType = reportUrl.toLowerCase().endsWith(".pdf")
      ? "application/pdf"
      : "image/jpeg";

    // Prepare the extraction prompt
    const systemPrompt = `You are a medical data extraction specialist. Your task is to extract biomarker values from health test reports.

For each biomarker found, extract:
1. Name (e.g., "Hemoglobin", "Glucose", "Creatinine")
2. Value (numeric value)
3. Unit (e.g., "g/dL", "mg/dL", "mmol/L")
4. Reference range if available (min and max values)
5. Status: "normal" if within reference range, "warning" if slightly abnormal, "abnormal" if significantly abnormal, "unknown" if cannot determine

Return the data as a JSON array with this structure:
[
  {
    "name": "Hemoglobin",
    "value": "13.5",
    "unit": "g/dL",
    "referenceMin": "13.0",
    "referenceMax": "17.0",
    "status": "normal"
  }
]

Be thorough and extract ALL visible biomarkers from the report.`;

    const userPrompt = `Please extract all biomarker values from this ${reportType} test report. Return ONLY valid JSON array, no additional text.`;

    // Call Gemini Vision API through the platform's LLM wrapper
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: userPrompt,
            },
            mimeType === "application/pdf"
              ? {
                  type: "file_url" as const,
                  file_url: {
                    url: reportUrl,
                    mime_type: "application/pdf" as const,
                  },
                }
              : {
                  type: "image_url" as const,
                  image_url: {
                    url: reportUrl,
                  },
                },
          ] as any,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "biomarker_extraction",
          strict: true,
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string", description: "Biomarker name" },
                value: { type: "string", description: "Numeric value" },
                unit: { type: "string", description: "Unit of measurement" },
                referenceMin: { type: "string", description: "Minimum reference value" },
                referenceMax: { type: "string", description: "Maximum reference value" },
                status: {
                  type: "string",
                  enum: ["normal", "warning", "abnormal", "unknown"],
                  description: "Status based on reference range",
                },
              },
              required: ["name", "value", "unit", "status"],
              additionalProperties: false,
            },
          },
        },
      },
    });

    // Extract the JSON from the response
    const messageContent = response.choices[0]?.message?.content;
    if (!messageContent) {
      return {
        success: false,
        biomarkers: [],
        error: "No response from LLM",
      };
    }

    // Handle both string and array content types
    let contentStr: string = "";
    if (typeof messageContent === "string") {
      contentStr = messageContent;
    } else if (Array.isArray(messageContent)) {
      // Extract text from content array
      const textContent = messageContent.find((c: any) => c.type === "text") as any;
      contentStr = textContent?.text || "";
    }

    if (!contentStr) {
      return {
        success: false,
        biomarkers: [],
        error: "No text content in LLM response",
      };
    }

    // Parse the JSON response
    let extractedBiomarkers: ExtractedBiomarker[] = [];
    try {
      extractedBiomarkers = JSON.parse(contentStr);
      if (!Array.isArray(extractedBiomarkers)) {
        extractedBiomarkers = [];
      }
    } catch (e) {
      console.error("Failed to parse LLM response:", e);
      return {
        success: false,
        biomarkers: [],
        error: "Failed to parse extraction results",
      };
    }

    return {
      success: true,
      biomarkers: extractedBiomarkers,
      rawText: contentStr,
    };
  } catch (error) {
    console.error("Extraction error:", error);
    return {
      success: false,
      biomarkers: [],
      error: error instanceof Error ? error.message : "Unknown extraction error",
    };
  }
}

/**
 * Process extracted biomarkers and save them to the database
 */
export async function saveExtractedBiomarkers(
  userId: number,
  reportId: number,
  extractedBiomarkers: ExtractedBiomarker[]
): Promise<number> {
  let createdReadings = 0;

  for (const biomarker of extractedBiomarkers) {
    try {
      // Find or create the biomarker in the database
      let biomarkerRecord = await db.getBiomarkerByName(biomarker.name);

      if (!biomarkerRecord) {
        // Create new biomarker if it doesn't exist
        const biomarkerId = await db.createBiomarker({
          name: biomarker.name,
          unit: biomarker.unit,
          referenceMin: biomarker.referenceMin || "",
          referenceMax: biomarker.referenceMax || "",
        });
        biomarkerRecord = { id: biomarkerId, name: biomarker.name, unit: biomarker.unit } as any;
      }

      if (!biomarkerRecord) {
        throw new Error(`Failed to create biomarker ${biomarker.name}`);
      }

      // Create a reading for this biomarker
      await db.createReading({
        userId,
        reportId,
        biomarkerId: biomarkerRecord.id,
        value: biomarker.value,
        status: biomarker.status,
        readingDate: new Date(),
      });

      createdReadings++;
    } catch (error) {
      console.error(`Failed to save biomarker ${biomarker.name}:`, error);
    }
  }

  return createdReadings;
}
