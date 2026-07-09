/** Gradle output paths for the two Android product flavors. */
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const androidApp = path.join(root, "apps/mobile/android/app/build/outputs/apk");

export const MOBILE_APK = {
  connect: path.join(androidApp, "connect/debug/app-connect-debug.apk"),
  local: path.join(androidApp, "local/debug/app-local-debug.apk"),
};

export const MOBILE_DOWNLOAD = {
  connect: path.join(root, "public/downloads/arco-connect.apk"),
  local: path.join(root, "public/downloads/arco-local.apk"),
};
