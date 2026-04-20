import { GoogleGenAI, Type } from "@google/genai";
import type {
  Audience,
  ChatMessage,
  SimulationResult,
  Study,
} from "./types";
import { uid } from "./storage";
import {
  AUDIENCE_NORMALIZE_PROMPT,
  CREATE_STUDY_SYSTEM,
  EDIT_STUDY_SYSTEM,
  SIMULATE_STUDY_PROMPT,
} from "./prompts";

// Model choices are intentionally hardcoded. Users cannot (and should not be
// able to) select a model. Keep these in one place so they're easy to bump
// when Google promotes previews to GA or ships a newer generation.
//
// As of April 2026:
//  - Latest general-purpose Flash model: gemini-3-flash-preview
//  - Latest Pro model: gemini-3.1-pro-preview
//    (gemini-3-pro-preview was deprecated and shut down 2026-03-09)
//
// Flash handles the fast turns (study drafting, conversational edits,
// audience normalization, API-key validation). Pro handles simulateStudy
// because it has to generate respondents, full transcripts, AND a
// synthesized report that references real quotes in one call - that's
// exactly where Pro's reasoning / consistency pays off.
const FLASH_MODEL = "gemini-3-flash-preview";
const PRO_MODEL = "gemini-3.1-pro-preview";

function client(apiKey: string) {
  if (!apiKey) throw new Error("Missing Gemini API key");
  return new GoogleGenAI({ apiKey });
}

function toContents(messages: ChatMessage[]) {
  return messages.map((m) => ({
    role: m.role === "user" ? "user" : "model",
    parts: [{ text: m.text }],
  }));
}

function parseJson<T>(raw: string | undefined): T {
  if (!raw) throw new Error("Empty response from model");
  try {
    return JSON.parse(raw) as T;
  } catch {
    // Try to salvage: find first { or [ and last } or ]
    const first = raw.search(/[\[{]/);
    const lastCurly = raw.lastIndexOf("}");
    const lastBracket = raw.lastIndexOf("]");
    const last = Math.max(lastCurly, lastBracket);
    if (first >= 0 && last > first) {
      return JSON.parse(raw.slice(first, last + 1)) as T;
    }
    throw new Error("Model did not return valid JSON");
  }
}

// ---------- Schemas ----------

const questionSchema = {
  type: Type.OBJECT,
  properties: {
    prompt: { type: Type.STRING },
    type: { type: Type.STRING, enum: ["open", "scale", "choice"] },
    choices: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    probe: { type: Type.STRING },
  },
  required: ["prompt", "type"],
};

const studyDraftSchema = {
  type: Type.OBJECT,
  properties: {
    ready: { type: Type.BOOLEAN },
    assistantMessage: { type: Type.STRING },
    draft: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        description: { type: Type.STRING },
        goal: { type: Type.STRING },
        questions: { type: Type.ARRAY, items: questionSchema },
      },
      required: ["title", "description", "questions"],
    },
  },
  required: ["ready", "assistantMessage"],
};

const studyPatchSchema = {
  type: Type.OBJECT,
  properties: {
    assistantMessage: { type: Type.STRING },
    changelog: { type: Type.ARRAY, items: { type: Type.STRING } },
    study: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        description: { type: Type.STRING },
        goal: { type: Type.STRING },
        questions: { type: Type.ARRAY, items: questionSchema },
      },
      required: ["title", "description", "questions"],
    },
  },
  required: ["assistantMessage", "changelog", "study"],
};

const audienceSchema = {
  type: Type.OBJECT,
  properties: {
    label: { type: Type.STRING },
    filters: {
      type: Type.OBJECT,
      properties: {
        ageMin: { type: Type.INTEGER },
        ageMax: { type: Type.INTEGER },
        genders: { type: Type.ARRAY, items: { type: Type.STRING } },
        regions: { type: Type.ARRAY, items: { type: Type.STRING } },
        roles: { type: Type.ARRAY, items: { type: Type.STRING } },
        traits: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
    },
  },
  required: ["label", "filters"],
};

const simulationSchema = {
  type: Type.OBJECT,
  properties: {
    respondents: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          name: { type: Type.STRING },
          age: { type: Type.INTEGER },
          gender: { type: Type.STRING },
          role: { type: Type.STRING },
          location: { type: Type.STRING },
          tags: { type: Type.ARRAY, items: { type: Type.STRING } },
          bio: { type: Type.STRING },
        },
        required: ["id", "name", "age", "role", "location", "tags", "bio"],
      },
    },
    interviews: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          respondentId: { type: Type.STRING },
          summary: { type: Type.STRING },
          answers: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                questionId: { type: Type.STRING },
                text: { type: Type.STRING },
              },
              required: ["questionId", "text"],
            },
          },
        },
        required: ["respondentId", "summary", "answers"],
      },
    },
    report: {
      type: Type.OBJECT,
      properties: {
        summary: { type: Type.STRING },
        themes: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              quotes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    respondentId: { type: Type.STRING },
                    questionId: { type: Type.STRING },
                    text: { type: Type.STRING },
                  },
                  required: ["respondentId", "questionId", "text"],
                },
              },
            },
            required: ["title", "description", "quotes"],
          },
        },
        sentiment: {
          type: Type.OBJECT,
          properties: {
            positive: { type: Type.NUMBER },
            neutral: { type: Type.NUMBER },
            negative: { type: Type.NUMBER },
          },
          required: ["positive", "neutral", "negative"],
        },
        surprises: { type: Type.ARRAY, items: { type: Type.STRING } },
        recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: [
        "summary",
        "themes",
        "sentiment",
        "surprises",
        "recommendations",
      ],
    },
  },
  required: ["respondents", "interviews", "report"],
};

// ---------- Public API ----------

export interface DraftStudyResponse {
  ready: boolean;
  assistantMessage: string;
  draft?: {
    title: string;
    description: string;
    goal?: string;
    questions: {
      prompt: string;
      type: "open" | "scale" | "choice";
      choices?: string[];
      probe?: string;
    }[];
  };
}

export async function draftStudyFromChat(
  apiKey: string,
  messages: ChatMessage[]
): Promise<DraftStudyResponse> {
  const ai = client(apiKey);
  const resp = await ai.models.generateContent({
    model: FLASH_MODEL,
    contents: toContents(messages),
    config: {
      systemInstruction: CREATE_STUDY_SYSTEM,
      responseMimeType: "application/json",
      responseSchema: studyDraftSchema,
      temperature: 0.8,
    },
  });
  return parseJson<DraftStudyResponse>(resp.text);
}

export interface EditStudyResponse {
  assistantMessage: string;
  changelog: string[];
  study: {
    title: string;
    description: string;
    goal?: string;
    questions: {
      prompt: string;
      type: "open" | "scale" | "choice";
      choices?: string[];
      probe?: string;
    }[];
  };
}

export async function editStudyFromChat(
  apiKey: string,
  study: Study,
  messages: ChatMessage[]
): Promise<EditStudyResponse> {
  const ai = client(apiKey);
  const trimmedStudy = {
    title: study.title,
    description: study.description,
    goal: study.goal,
    questions: study.questions.map((q) => ({
      id: q.id,
      prompt: q.prompt,
      type: q.type,
      choices: q.choices,
      probe: q.probe,
    })),
  };
  const contents = [
    {
      role: "user",
      parts: [
        {
          text: `CURRENT_STUDY_JSON:\n${JSON.stringify(trimmedStudy, null, 2)}`,
        },
      ],
    },
    ...toContents(messages),
  ];
  const resp = await ai.models.generateContent({
    model: FLASH_MODEL,
    contents,
    config: {
      systemInstruction: EDIT_STUDY_SYSTEM,
      responseMimeType: "application/json",
      responseSchema: studyPatchSchema,
      temperature: 0.6,
    },
  });
  return parseJson<EditStudyResponse>(resp.text);
}

export interface NormalizeAudienceResponse {
  label: string;
  filters: {
    ageMin?: number;
    ageMax?: number;
    genders?: string[];
    regions?: string[];
    roles?: string[];
    traits?: string[];
  };
}

export async function normalizeAudience(
  apiKey: string,
  text: string
): Promise<NormalizeAudienceResponse> {
  const ai = client(apiKey);
  const resp = await ai.models.generateContent({
    model: FLASH_MODEL,
    contents: [{ role: "user", parts: [{ text }] }],
    config: {
      systemInstruction: AUDIENCE_NORMALIZE_PROMPT,
      responseMimeType: "application/json",
      responseSchema: audienceSchema,
      temperature: 0.3,
    },
  });
  return parseJson<NormalizeAudienceResponse>(resp.text);
}

export async function simulateStudy(
  apiKey: string,
  study: Study,
  audience: Audience | undefined,
  nRespondents = 7
): Promise<SimulationResult> {
  const ai = client(apiKey);
  const payload = {
    study: {
      title: study.title,
      description: study.description,
      goal: study.goal,
      questions: study.questions.map((q) => ({
        id: q.id,
        prompt: q.prompt,
        type: q.type,
        choices: q.choices,
      })),
    },
    audience,
    nRespondents,
  };
  const resp = await ai.models.generateContent({
    model: PRO_MODEL,
    contents: [
      {
        role: "user",
        parts: [{ text: `INPUT:\n${JSON.stringify(payload, null, 2)}` }],
      },
    ],
    config: {
      systemInstruction: SIMULATE_STUDY_PROMPT,
      responseMimeType: "application/json",
      responseSchema: simulationSchema,
      temperature: 0.95,
    },
  });
  const data = parseJson<{
    respondents: SimulationResult["respondents"];
    interviews: SimulationResult["interviews"];
    report: SimulationResult["report"];
  }>(resp.text);

  // Ensure IDs are non-empty / unique
  const remapped = new Map<string, string>();
  data.respondents = data.respondents.map((r) => {
    const newId = r.id && r.id.trim() ? r.id : uid("r");
    remapped.set(r.id, newId);
    return { ...r, id: newId };
  });
  data.interviews = data.interviews.map((iv) => ({
    ...iv,
    respondentId: remapped.get(iv.respondentId) || iv.respondentId,
  }));
  data.report.themes = data.report.themes.map((t) => ({
    ...t,
    quotes: t.quotes.map((q) => ({
      ...q,
      respondentId: remapped.get(q.respondentId) || q.respondentId,
    })),
  }));

  return {
    respondents: data.respondents,
    interviews: data.interviews,
    report: data.report,
    generatedAt: Date.now(),
  };
}

/** Quick validation call - any successful text generation proves the key works */
export async function validateApiKey(apiKey: string): Promise<boolean> {
  const ai = client(apiKey);
  try {
    const resp = await ai.models.generateContent({
      model: FLASH_MODEL,
      contents: [{ role: "user", parts: [{ text: "Say 'ok'" }] }],
      config: { temperature: 0, maxOutputTokens: 5 },
    });
    return !!resp.text;
  } catch (err) {
    console.error("API key validation failed:", err);
    return false;
  }
}
