import * as FileSystem from "expo-file-system";
import { UserProfile } from "./storage";

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY || "";
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || "";
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "";
const EXTRACTION_TIMEOUT_MS = 30000;

export interface ExtractedProfile {
  name?: string;
  title?: string;
  company?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  linkedin?: string;
  twitter?: string;
  bio?: string;
  products?: string;
  services?: string;
  keywords?: string[];
}

type ExtractedWithQr = ExtractedProfile & { qrContent?: string };

const PROFILE_EXTRACTION_PROMPT = `You are an expert OCR system for business cards. Extract ALL information from this business card image and return a JSON object with these fields:
- name: full name of the person
- title: job title or role
- company: company or organization name
- email: email address
- phone: phone number (include country code if visible)
- website: website URL
- address: physical/mailing address
- linkedin: LinkedIn profile URL or username
- twitter: Twitter/X handle or URL
- bio: any tagline, slogan, or brief description on the card
- products: any products mentioned
- services: any services mentioned
- keywords: array of industry keywords or specializations visible on the card

Return ONLY valid JSON. If a field is not found, omit it entirely. Do not guess or fabricate information. Extract exactly what is visible on the card.`;

const QR_EXTRACTION_PROMPT = `Analyze this business card image. Focus on TWO tasks:

1. If there is a QR code visible on the card, describe what information it likely encodes (URL, vCard, contact info, etc.). If you can read any URL or text from/near the QR code, extract it.

2. Extract ALL text and contact information visible on the card.

Return a JSON object with these fields:
- name: full name
- title: job title
- company: company name
- email: email address
- phone: phone number
- website: website URL (especially if found via QR code context)
- address: physical address
- linkedin: LinkedIn URL or username
- twitter: Twitter/X handle
- bio: tagline or description
- products: products mentioned
- services: services mentioned
- keywords: array of industry keywords
- qrContent: what the QR code contains or links to (if a QR code is detected)

Return ONLY valid JSON. If a field is not found, omit it. Do not fabricate information.`;

async function imageToBase64(uri: string): Promise<{ base64: string; mimeType: string }> {
  const ext = uri.split(".").pop()?.toLowerCase() || "jpg";
  const mimeType = ext === "png" ? "image/png" : "image/jpeg";

  // Try the modern File API first, fall back to legacy readAsStringAsync
  try {
    const base64 = await new FileSystem.File(uri).base64();
    if (base64 && base64.length > 100) return { base64, mimeType };
  } catch {}

  // Legacy fallback — works with all URI formats
  const { readAsStringAsync, EncodingType } = await import("expo-file-system/legacy");
  const base64 = await readAsStringAsync(uri, {
    encoding: EncodingType.Base64,
  });
  return { base64, mimeType };
}

export function checkApiKeys(): {
  openai: boolean;
  gemini: boolean;
  backend: boolean;
  message?: string;
} {
  const hasOpenAI = !!OPENAI_API_KEY && OPENAI_API_KEY !== "your_openai_api_key_here";
  const hasGemini = !!GEMINI_API_KEY && GEMINI_API_KEY !== "your_gemini_api_key_here";
  const hasBackendApi = !!API_BASE_URL.trim();

  if (!hasOpenAI && !hasGemini && !hasBackendApi) {
    return {
      openai: false,
      gemini: false,
      backend: false,
      message:
        "No AI configuration found. Add EXPO_PUBLIC_API_BASE_URL for backend processing, or set EXPO_PUBLIC_OPENAI_API_KEY / EXPO_PUBLIC_GEMINI_API_KEY for direct client processing.",
    };
  }

  if (!hasOpenAI && !hasGemini && hasBackendApi) {
    return {
      openai: false,
      gemini: false,
      backend: true,
      message: "Using backend AI processing via EXPO_PUBLIC_API_BASE_URL.",
    };
  }

  return { openai: hasOpenAI, gemini: hasGemini, backend: hasBackendApi };
}

function normalizeBackendBases(): string[] {
  const raw = API_BASE_URL.trim();
  if (!raw) return [];

  const noSlash = raw.replace(/\/$/, "");
  // Strip /api suffix if present
  const base = noSlash.toLowerCase().endsWith("/api")
    ? noSlash.slice(0, -4)
    : noSlash;

  return [base];
}

function mapBackendProfileToExtracted(payload: any): ExtractedProfile {
  if (!payload || typeof payload !== "object") return {};
  return {
    name: payload.name,
    title: payload.title,
    company: payload.company,
    email: payload.email,
    phone: payload.phone,
    website: payload.website,
    address: payload.address,
    linkedin: payload.linkedin,
    twitter: payload.twitter,
    bio: payload.bio,
    products: payload.products,
    services: payload.services,
    keywords: Array.isArray(payload.keywords) ? payload.keywords : [],
  };
}

async function extractViaBackend(frontUri: string, backUri?: string): Promise<ExtractedProfile> {
  const bases = normalizeBackendBases();
  if (bases.length === 0) {
    throw new Error("Backend API base URL is not configured.");
  }
  console.log(`[AI] Backend base candidates: ${bases.join(", ")}`);

  const front = await imageToBase64(frontUri);
  const back = backUri ? await imageToBase64(backUri) : null;
  const mimeType = front.mimeType || back?.mimeType || "image/jpeg";

  const body = {
    frontImageData: front.base64,
    backImageData: back?.base64,
    mimeType,
  };

  const frontKb = Math.round((front.base64.length * 3) / 4 / 1024);
  const backKb = back ? Math.round((back.base64.length * 3) / 4 / 1024) : 0;
  console.log(`[AI] Backend profile extraction started. front=${frontKb}KB back=${backKb}KB`);

  let lastError = "";
  let shouldStopRetrying = false;
  for (const base of bases) {
    const url = `${base}/business-cards/import-profile`;
    try {
      const startedAt = Date.now();
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await response.json().catch(() => null);
      if (!response.ok) {
        const msg = json?.message || `Backend request failed (${response.status})`;
        console.log(`[AI] Backend profile extraction failed at ${url} after ${Date.now() - startedAt}ms: ${msg}`);
        if (response.status === 404) {
          lastError = msg;
          continue;
        }
        shouldStopRetrying = true;
        throw new Error(msg);
      }

      const data = json?.data ?? json;
      const mapped = mapBackendProfileToExtracted(data);
      if (hasMeaningfulData(mapped)) {
        console.log(`[AI] Backend profile extraction succeeded at ${url} in ${Date.now() - startedAt}ms`);
        return mapped;
      }
      lastError = "Backend returned empty extraction data.";
      console.log(`[AI] Backend profile extraction empty result at ${url} after ${Date.now() - startedAt}ms`);
    } catch (err: any) {
      console.log(`[AI] Backend profile extraction error at ${url}: ${err?.message || "unknown error"}`);
      lastError = err?.message || "Backend request failed.";
      if (shouldStopRetrying) {
        break;
      }
    }
  }

  throw new Error(lastError || "Backend extraction failed.");
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out. Please check your internet and try again.`));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

export async function extractWithOpenAI(imageUri: string): Promise<ExtractedProfile> {
  if (!OPENAI_API_KEY || OPENAI_API_KEY === "your_openai_api_key_here") {
    throw new Error("OpenAI API key not configured. Update EXPO_PUBLIC_OPENAI_API_KEY in .env");
  }

  const { base64, mimeType } = await imageToBase64(imageUri);

  const response = await withTimeout(fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: PROFILE_EXTRACTION_PROMPT },
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${base64}`, detail: "high" },
            },
          ],
        },
      ],
      max_tokens: 1000,
      temperature: 0,
    }),
  }),
  EXTRACTION_TIMEOUT_MS, "OpenAI extraction");

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as any)?.error?.message || "OpenAI OCR failed");
  }

  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content || "";
  return parseJsonResponse(raw);
}

export async function extractWithGemini(imageUri: string): Promise<ExtractedProfile & { qrContent?: string }> {
  if (!GEMINI_API_KEY || GEMINI_API_KEY === "your_gemini_api_key_here") {
    throw new Error("Gemini API key not configured. Update EXPO_PUBLIC_GEMINI_API_KEY in .env");
  }

  const { base64, mimeType } = await imageToBase64(imageUri);

  const response = await withTimeout(fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: QR_EXTRACTION_PROMPT },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 1000,
        },
      }),
    }
  ), EXTRACTION_TIMEOUT_MS, "Gemini extraction");

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as any)?.error?.message || "Gemini extraction failed");
  }

  const data = await response.json();
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  return parseJsonResponse(raw);
}

function parseJsonResponse(raw: string): any {
  const cleaned = raw.trim();

  const tryParse = (value: string) => {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  };

  const direct = tryParse(cleaned);
  if (direct && typeof direct === "object") {
    return normalizeExtractedProfile(direct);
  }

  // Parse fenced JSON blocks first.
  const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/gi;
  let blockMatch: RegExpExecArray | null;
  while ((blockMatch = codeBlockRegex.exec(cleaned)) !== null) {
    const parsed = tryParse(blockMatch[1]);
    if (parsed && typeof parsed === "object") {
      return normalizeExtractedProfile(parsed);
    }
  }

  // Then scan for balanced JSON objects inside mixed prose responses.
  const candidates = extractBalancedJsonObjects(cleaned);
  for (const candidate of candidates) {
    const parsed = tryParse(candidate);
    if (parsed && typeof parsed === "object") {
      return normalizeExtractedProfile(parsed);
    }
  }

  // Final fallback: recover obvious entities from plain text.
  return extractFromPlainText(cleaned);
}

function extractBalancedJsonObjects(input: string): string[] {
  const out: string[] = [];
  let start = -1;
  let depth = 0;

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    if (ch === "{") {
      if (depth === 0) start = i;
      depth += 1;
      continue;
    }
    if (ch === "}") {
      if (depth > 0) depth -= 1;
      if (depth === 0 && start >= 0) {
        out.push(input.slice(start, i + 1));
        start = -1;
      }
    }
  }
  return out;
}

function normalizeString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const v = value.trim().replace(/^[-*\s]+/, "").replace(/\s+/g, " ");
  return v || undefined;
}

function normalizeKeywords(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    const out = value
      .map((item) => normalizeString(item))
      .filter((item): item is string => !!item);
    return out.length ? [...new Set(out)] : undefined;
  }
  const asString = normalizeString(value);
  if (!asString) return undefined;
  const split = asString
    .split(/[;,|]/)
    .map((k) => k.trim())
    .filter(Boolean);
  return split.length ? [...new Set(split)] : undefined;
}

function pickString(obj: Record<string, any>, keys: string[]): string | undefined {
  for (const key of keys) {
    const v = normalizeString(obj[key]);
    if (v) return v;
  }
  return undefined;
}

function normalizeExtractedProfile(input: any): ExtractedWithQr {
  const src = (input && typeof input === "object") ? input : {};

  const out: ExtractedWithQr = {
    name: pickString(src, ["name", "fullName", "full_name", "personName", "contactName"]),
    title: pickString(src, ["title", "jobTitle", "job_title", "role", "designation"]),
    company: pickString(src, ["company", "organization", "org", "companyName", "businessName"]),
    email: pickString(src, ["email", "emailAddress", "email_address", "mail"]),
    phone: pickString(src, ["phone", "phoneNumber", "phone_number", "mobile", "telephone", "tel"]),
    website: pickString(src, ["website", "url", "site", "web", "companyWebsite", "company_website"]),
    address: pickString(src, ["address", "location", "officeAddress", "office_address"]),
    linkedin: pickString(src, ["linkedin", "linkedIn", "linkedinUrl", "linkedin_url"]),
    twitter: pickString(src, ["twitter", "x", "xHandle", "twitterHandle", "twitter_handle"]),
    bio: pickString(src, ["bio", "tagline", "description", "about"]),
    products: pickString(src, ["products", "product", "offerings"]),
    services: pickString(src, ["services", "service"]),
    qrContent: pickString(src, ["qrContent", "qr", "qr_code", "qrcode", "qrData", "qr_data"]),
    keywords: normalizeKeywords(src.keywords ?? src.tags ?? src.specializations ?? src.industries),
  };

  return Object.fromEntries(Object.entries(out).filter(([, v]) => {
    if (Array.isArray(v)) return v.length > 0;
    return v !== undefined && v !== null && v !== "";
  })) as ExtractedWithQr;
}

function extractFromPlainText(raw: string): ExtractedWithQr {
  const email = raw.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
  const website = raw.match(/https?:\/\/[^\s)]+|(?:www\.)?([a-z0-9-]+\.)+[a-z]{2,}(?:\/[\w-./?%&=]*)?/i)?.[0];
  const phones = raw.match(/(?:\+?\d[\d\s().-]{7,}\d)/g) || [];
  const phone = phones.map((p) => p.trim()).sort((a, b) => b.length - a.length)[0];

  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const out: ExtractedWithQr = {};
  if (email) out.email = email;
  if (phone) out.phone = phone;
  if (website) out.website = website;

  // Heuristic: first short title-case line often contains the name.
  const nameCandidate = lines.find(
    (l) =>
      l.length >= 4 &&
      l.length <= 40 &&
      !/@|www\.|https?:\/\//i.test(l) &&
      /[A-Za-z]/.test(l) &&
      /^[A-Za-z\s.'-]+$/.test(l)
  );
  if (nameCandidate) out.name = nameCandidate;

  return out;
}

function hasMeaningfulData(profile: ExtractedProfile): boolean {
  const fields: (keyof ExtractedProfile)[] = [
    "name", "title", "company", "email", "phone", "website", "address", "linkedin", "twitter", "bio", "products", "services",
  ];
  return fields.some((k) => typeof profile[k] === "string" && !!profile[k]?.trim()) || !!profile.keywords?.length;
}

export function mergeExtractions(
  openaiResult: ExtractedProfile,
  geminiResult: ExtractedProfile & { qrContent?: string }
): ExtractedProfile {
  const merged: ExtractedProfile = {};
  const fields: (keyof ExtractedProfile)[] = [
    "name", "title", "company", "email", "phone",
    "website", "address", "linkedin", "twitter",
    "bio", "products", "services",
  ];

  for (const field of fields) {
    const oVal = openaiResult[field];
    const gVal = geminiResult[field];
    // Prefer OpenAI for text fields, but use Gemini if OpenAI is empty
    if (typeof oVal === "string" && oVal.trim()) {
      (merged as any)[field] = oVal.trim();
    } else if (typeof gVal === "string" && gVal.trim()) {
      (merged as any)[field] = gVal.trim();
    }
  }

  // For keywords, merge both arrays and deduplicate
  const oKeywords = openaiResult.keywords || [];
  const gKeywords = geminiResult.keywords || [];
  const allKeywords = [...new Set([...oKeywords, ...gKeywords])];
  if (allKeywords.length > 0) {
    merged.keywords = allKeywords;
  }

  // If Gemini found a QR code URL and we don't have a website, use it
  if (geminiResult.qrContent && !merged.website) {
    const qr = geminiResult.qrContent;
    if (qr.startsWith("http://") || qr.startsWith("https://")) {
      merged.website = qr;
    }
  }

  // If Gemini found QR content with linkedin info, apply it
  if (geminiResult.qrContent && !merged.linkedin) {
    const qr = geminiResult.qrContent.toLowerCase();
    if (qr.includes("linkedin.com")) {
      merged.linkedin = geminiResult.qrContent;
    }
  }

  return merged;
}

export async function extractProfileFromCard(
  frontUri: string,
  backUri?: string,
  onStatus?: (msg: string) => void,
): Promise<ExtractedProfile> {
  const keys = checkApiKeys();

  // Prefer backend whenever available so server-side provider fallback is used.
  if (keys.backend) {
    onStatus?.("Using backend AI extraction...");
    try {
      return await extractViaBackend(frontUri, backUri);
    } catch (backendErr: any) {
      // If no direct keys exist, backend is the only path.
      if (!keys.openai && !keys.gemini) {
        throw backendErr;
      }
      console.log(
        `[AI] Backend extraction failed, falling back to direct provider calls: ${backendErr?.message || "unknown error"}`
      );
      onStatus?.("Backend unavailable. Falling back to direct AI extraction...");
    }
  }

  if (!keys.openai && !keys.gemini) {
    throw new Error("No direct AI keys configured and backend extraction is unavailable.");
  }

  const extractFromOneSide = async (
    uri: string,
    onStatus?: (msg: string) => void,
  ): Promise<ExtractedProfile> => {
    let openaiData: ExtractedProfile = {};
    let geminiData: ExtractedProfile & { qrContent?: string } = {};
    let openaiError: any;
    let geminiError: any;

    // Run both models in parallel for speed
    const promises: Promise<void>[] = [];

    if (keys.openai) {
      promises.push(
        (async () => {
          onStatus?.("Running OpenAI GPT-4o extraction...");
          try {
            openaiData = await extractWithOpenAI(uri);
          } catch (e) {
            openaiError = e;
          }
        })()
      );
    }

    if (keys.gemini) {
      promises.push(
        (async () => {
          onStatus?.("Running Gemini 2.5 Flash extraction...");
          try {
            geminiData = await extractWithGemini(uri);
          } catch (e) {
            geminiError = e;
          }
        })()
      );
    }

    await Promise.all(promises);

    const merged = mergeExtractions(openaiData, geminiData);

    if (hasMeaningfulData(merged)) {
      return merged;
    }

    // Both models failed or returned nothing useful
    const errors: string[] = [];
    if (openaiError) errors.push(`OpenAI: ${openaiError.message}`);
    if (geminiError) errors.push(`Gemini: ${geminiError.message}`);
    if (errors.length > 0) {
      throw new Error(errors.join("\n"));
    }
    // Models succeeded but found nothing
    throw new Error("AI models could not extract any details from this image. Try a clearer photo.");
  };

  onStatus?.("Processing front of card...");
  let merged = await extractFromOneSide(frontUri, onStatus);

  // If there's a back image, process it too and fill in any blanks
  if (backUri) {
    onStatus?.("Processing back of card...");
    const backMerged = await extractFromOneSide(backUri, onStatus);

    // Fill in any fields that are empty from the front
    const fields: (keyof ExtractedProfile)[] = [
      "name", "title", "company", "email", "phone",
      "website", "address", "linkedin", "twitter",
      "bio", "products", "services",
    ];
    for (const field of fields) {
      if (!(merged as any)[field] && (backMerged as any)[field]) {
        (merged as any)[field] = (backMerged as any)[field];
      }
    }

    // Merge keywords from back too
    if (backMerged.keywords?.length) {
      const existing = new Set(merged.keywords || []);
      for (const kw of backMerged.keywords) {
        existing.add(kw);
      }
      merged.keywords = [...existing];
    }
  }

  if (!hasMeaningfulData(merged)) {
    throw new Error("No details could be extracted. Try a closer, brighter, and less cropped photo.");
  }

  return merged;
}

export function extractedToProfile(
  extracted: ExtractedProfile,
  existingId?: string
): Partial<UserProfile> {
  const now = new Date().toISOString();
  return {
    id: existingId || undefined,
    name: extracted.name || "",
    title: extracted.title || "",
    company: extracted.company || "",
    email: extracted.email || "",
    phone: extracted.phone || "",
    website: extracted.website || "",
    address: extracted.address || "",
    linkedin: extracted.linkedin || "",
    twitter: extracted.twitter || "",
    bio: extracted.bio || "",
    products: extracted.products || "",
    services: extracted.services || "",
    keywords: extracted.keywords || [],
    updatedAt: now,
  };
}
