import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function probeDurationMs(filePath: string): Promise<number> {
  try {
    const { stdout } = await execFileAsync("ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      filePath,
    ]);
    const sec = Number.parseFloat(stdout.trim());
    if (Number.isFinite(sec) && sec > 0) return Math.round(sec * 1000);
  } catch {
    // ffprobe unavailable or failed
  }
  return 0;
}

export async function transcodeToWav16k(inputPath: string, outputPath: string): Promise<void> {
  await execFileAsync("ffmpeg", [
    "-hide_banner",
    "-loglevel",
    "error",
    "-i",
    inputPath,
    "-ar",
    "16000",
    "-ac",
    "1",
    "-y",
    outputPath,
  ]);
}

export async function ffmpegAvailable(): Promise<boolean> {
  try {
    await execFileAsync("ffmpeg", ["-version"]);
    return true;
  } catch {
    return false;
  }
}
