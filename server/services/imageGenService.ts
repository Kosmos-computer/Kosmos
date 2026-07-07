/**
 * Image generation pipeline — OpenAI Images API (DALL·E 3) with a local mock
 * fallback when no API key is configured. Generated blobs are persisted under
 * data/image-gen/assets/ and referenced from the gallery store.
 */
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import type { ImageGenHistoryItem, ImageGenProvider, ImageGenSize, ImageGenStatus, ImageGenStyle } from "../../shared/types.js";
import { loadSettings } from "../env.js";
import { IMAGE_GEN_ASSETS_DIR, imageGenStore } from "../stores/imageGenStore.js";

const OPENAI_IMAGES_URL = "https://api.openai.com/v1/images/generations";
const DEFAULT_MODEL = "dall-e-3";

export interface GenerateImageInput {
  prompt: string;
  size?: ImageGenSize;
  style?: ImageGenStyle;
}

interface ResolvedConfig {
  provider: ImageGenProvider;
  apiKey: string;
  model: string;
}

function resolveConfig(): ResolvedConfig {
  const settings = loadSettings();
  const envProvider = process.env.IMAGE_PROVIDER?.trim() as ImageGenProvider | undefined;
  const envKey = process.env.IMAGE_API_KEY?.trim() ?? "";
  const envModel = process.env.IMAGE_MODEL?.trim() ?? DEFAULT_MODEL;

  if (envProvider === "mock") {
    return { provider: "mock", apiKey: "", model: envModel };
  }

  const apiKey = envKey || (settings.provider === "openai" ? settings.apiKey.trim() : "");
  if (apiKey) {
    return { provider: "openai", apiKey, model: envModel };
  }

  return { provider: "mock", apiKey: "", model: envModel };
}

export function getImageGenStatus(): ImageGenStatus {
  const config = resolveConfig();
  if (config.provider === "openai") {
    return {
      provider: "openai",
      model: config.model,
      configured: true,
      hint: "Using OpenAI Images API",
    };
  }
  return {
    provider: "mock",
    model: config.model,
    configured: false,
    hint: "Set an OpenAI API key in Settings (provider: OpenAI) or IMAGE_API_KEY to generate real images.",
  };
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function wrapPromptLines(prompt: string, maxChars = 42): string[] {
  const words = prompt.trim().split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars) {
      if (line) lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 6);
}

function mockSvg(prompt: string, size: ImageGenSize): string {
  const [w, h] = size.split("x").map(Number);
  const lines = wrapPromptLines(prompt);
  const tspans = lines
    .map((line, index) => `<tspan x="50%" dy="${index === 0 ? 0 : 28}">${escapeXml(line)}</tspan>`)
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1a1f3c"/>
      <stop offset="50%" stop-color="#2d1b4e"/>
      <stop offset="100%" stop-color="#0f2847"/>
    </linearGradient>
    <radialGradient id="glow" cx="30%" cy="25%" r="55%">
      <stop offset="0%" stop-color="#7c5cff" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="#7c5cff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <rect width="100%" height="100%" fill="url(#glow)"/>
  <circle cx="${Math.round(w * 0.78)}" cy="${Math.round(h * 0.72)}" r="${Math.round(Math.min(w, h) * 0.18)}" fill="#38bdf8" fill-opacity="0.18"/>
  <text x="50%" y="${Math.round(h * 0.42)}" text-anchor="middle" fill="#e8eaf6" font-family="system-ui, sans-serif" font-size="22" font-weight="600">
    ${tspans}
  </text>
  <text x="50%" y="${h - 36}" text-anchor="middle" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="13">Mock preview — connect OpenAI to generate</text>
</svg>`;
}

async function saveAsset(ext: "png" | "svg", bytes: Buffer | string): Promise<{ filename: string; imageUrl: string }> {
  await fs.mkdir(IMAGE_GEN_ASSETS_DIR, { recursive: true });
  const filename = `${crypto.randomUUID()}.${ext}`;
  const full = path.join(IMAGE_GEN_ASSETS_DIR, filename);
  await fs.writeFile(full, bytes);
  return { filename, imageUrl: `/api/image-gen/assets/${filename}` };
}

async function generateMock(prompt: string, size: ImageGenSize): Promise<{ revisedPrompt?: string; filename: string; imageUrl: string }> {
  const svg = mockSvg(prompt, size);
  const saved = await saveAsset("svg", svg);
  return { ...saved };
}

async function generateOpenAi(
  prompt: string,
  size: ImageGenSize,
  style: ImageGenStyle,
  config: ResolvedConfig,
  signal?: AbortSignal,
): Promise<{ revisedPrompt?: string; filename: string; imageUrl: string }> {
  const response = await fetch(OPENAI_IMAGES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      prompt,
      n: 1,
      size,
      style,
      response_format: "b64_json",
    }),
    signal,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(detail || `OpenAI Images API failed (${response.status})`);
  }

  const payload = (await response.json()) as {
    data?: Array<{ b64_json?: string; revised_prompt?: string }>;
  };
  const entry = payload.data?.[0];
  const b64 = entry?.b64_json;
  if (!b64) throw new Error("OpenAI returned no image data");

  const bytes = Buffer.from(b64, "base64");
  const saved = await saveAsset("png", bytes);
  return { revisedPrompt: entry.revised_prompt, ...saved };
}

export async function generateImageFromPrompt(
  input: GenerateImageInput,
  signal?: AbortSignal,
): Promise<ImageGenHistoryItem> {
  const prompt = input.prompt.trim();
  if (!prompt) throw new Error("prompt is required");

  const size = input.size ?? "1024x1024";
  const style = input.style ?? "vivid";
  const config = resolveConfig();

  const result =
    config.provider === "openai"
      ? await generateOpenAi(prompt, size, style, config, signal)
      : await generateMock(prompt, size);

  return imageGenStore.add({
    prompt,
    revisedPrompt: result.revisedPrompt,
    model: config.model,
    size,
    style,
    provider: config.provider,
    imageUrl: result.imageUrl,
  });
}
