/**
 * Twilio Media Streams — Connect/Stream WS + Whisper STT.
 * Attach to the main HTTP server upgrade path; public URL must be wss://…
 */
import type { IncomingMessage, Server } from "node:http";
import type { Duplex } from "node:stream";
import { randomBytes } from "node:crypto";
import { pushWebhookInbound } from "./webhookQueue.js";

type WsSock = {
  on: (ev: string, cb: (...args: unknown[]) => void) => void;
  close: () => void;
};

interface ActiveCall {
  channelId: string;
  callSid: string;
  from: string;
  chunks: Buffer[];
  authToken: string;
  accountSid: string;
}

const calls = new Map<string, ActiveCall>();
let attached = false;

function mulawToPcm(mulaw: Buffer): Buffer {
  const out = Buffer.alloc(mulaw.length * 2);
  for (let i = 0; i < mulaw.length; i++) {
    let u = ~mulaw[i];
    const sign = u & 0x80;
    const exponent = (u >> 4) & 0x07;
    const mantissa = u & 0x0f;
    let sample = ((mantissa << 3) + 0x84) << exponent;
    sample -= 0x84;
    if (sign) sample = -sample;
    out.writeInt16LE(Math.max(-32768, Math.min(32767, sample)), i * 2);
  }
  return out;
}

function pcmToWav(pcm: Buffer, sampleRate = 8000): Buffer {
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

async function whisperTranscribe(wav: Buffer, apiKey: string): Promise<string> {
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(wav)], { type: "audio/wav" }), "call.wav");
  form.append("model", "whisper-1");
  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  if (!res.ok) throw new Error(`Whisper ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { text?: string };
  return (data.text ?? "").trim();
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function mintVoiceStreamToken(params: {
  channelId: string;
  callSid: string;
  from: string;
  authToken: string;
  accountSid: string;
}): string {
  const token = randomBytes(16).toString("hex");
  calls.set(token, {
    channelId: params.channelId,
    callSid: params.callSid,
    from: params.from,
    chunks: [],
    authToken: params.authToken,
    accountSid: params.accountSid,
  });
  setTimeout(() => {
    const c = calls.get(token);
    if (c && c.chunks.length === 0) calls.delete(token);
  }, 120_000);
  return token;
}

export function buildVoiceStreamTwiml(publicWsBase: string, streamToken: string): string {
  const base = publicWsBase.replace(/\/+$/, "");
  const url = base.includes("/voice-stream")
    ? `${base}/${streamToken}`
    : `${base}/voice-stream/${streamToken}`;
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Say>Listening.</Say><Connect><Stream url="${escapeXml(url)}"/></Connect></Response>`;
}

export async function voiceStreamSay(
  callSid: string,
  accountSid: string,
  authToken: string,
  text: string,
): Promise<void> {
  const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Say>${escapeXml(text.slice(0, 500))}</Say></Response>`;
  await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls/${callSid}.json`,
    {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ Twiml: twiml }),
    },
  );
}

async function finalizeCall(token: string, call: ActiveCall): Promise<void> {
  if (!calls.has(token)) return;
  calls.delete(token);
  if (!call.chunks.length) return;
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    console.warn("[voicecall] set OPENAI_API_KEY for Whisper STT on media streams");
    return;
  }
  try {
    const wav = pcmToWav(mulawToPcm(Buffer.concat(call.chunks)));
    const text = await whisperTranscribe(wav, apiKey);
    if (!text) return;
    pushWebhookInbound(call.channelId, {
      chatId: call.callSid || call.from,
      label: call.from || "voice",
      text,
      isGroup: false,
      mentioned: true,
    });
  } catch (err) {
    console.warn("[voicecall] STT:", err instanceof Error ? err.message : err);
  }
}

/** Attach Twilio stream WebSocket upgrades to the Node HTTP server. */
export async function attachVoiceStreamUpgrade(httpServer: Server): Promise<void> {
  if (attached) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wsMod: any = await import("ws");
  const WebSocketServer = wsMod.WebSocketServer ?? wsMod.default?.WebSocketServer;
  const wss = new WebSocketServer({ noServer: true });
  httpServer.on("upgrade", (req: IncomingMessage, socket: Duplex, head: Buffer) => {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    if (!url.pathname.startsWith("/voice-stream/")) return;
    const token = url.pathname.slice("/voice-stream/".length);
    const call = calls.get(token);
    if (!call) {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws: WsSock) => {
      ws.on("message", (raw) => {
        try {
          const msg = JSON.parse(String(raw)) as {
            event?: string;
            start?: { callSid?: string };
            media?: { payload?: string };
          };
          if (msg.event === "start" && msg.start?.callSid) call.callSid = msg.start.callSid;
          if (msg.event === "media" && msg.media?.payload) {
            call.chunks.push(Buffer.from(msg.media.payload, "base64"));
            while (call.chunks.reduce((n, b) => n + b.length, 0) > 8_000 * 45) {
              call.chunks.shift();
            }
          }
          if (msg.event === "stop") void finalizeCall(token, call);
        } catch {
          /* ignore frame errors */
        }
      });
      ws.on("close", () => {
        void finalizeCall(token, call);
      });
    });
  });
  attached = true;
  console.log("[voicecall] media stream WebSocket upgrade attached at /voice-stream/:token");
}

/** Map callSid → last stream call for outbound Say. */
export function findVoiceCallByChatId(chatId: string): ActiveCall | undefined {
  for (const c of calls.values()) {
    if (c.callSid === chatId || c.from === chatId) return c;
  }
  return undefined;
}
