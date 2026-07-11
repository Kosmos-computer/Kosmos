/** Shared Gradle/Android env for mobile APK builds. */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const defaultJavaHome =
  "/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home";

export function defaultAndroidSdk() {
  return process.env.ANDROID_HOME ?? path.join(os.homedir(), "Library/Android/sdk");
}

export function resolveNdkDir(sdkRoot = defaultAndroidSdk()) {
  if (process.env.ANDROID_NDK_HOME && fs.existsSync(process.env.ANDROID_NDK_HOME)) {
    return process.env.ANDROID_NDK_HOME;
  }
  const ndkRoot = path.join(sdkRoot, "ndk");
  if (!fs.existsSync(ndkRoot)) return undefined;
  const versions = fs
    .readdirSync(ndkRoot)
    .filter((v) => fs.existsSync(path.join(ndkRoot, v, "source.properties")))
    .sort();
  return versions.length ? path.join(ndkRoot, versions.at(-1)) : undefined;
}

export function defaultNdkHome(sdkRoot = defaultAndroidSdk()) {
  return resolveNdkDir(sdkRoot);
}

export function defaultNdkVersion(sdkRoot = defaultAndroidSdk()) {
  const ndkDir = resolveNdkDir(sdkRoot);
  return ndkDir ? path.basename(ndkDir) : undefined;
}

export function gradleEnv(extra = {}) {
  const sdk = defaultAndroidSdk();
  const ndk = defaultNdkHome(sdk);
  return {
    ...process.env,
    JAVA_HOME: process.env.JAVA_HOME ?? defaultJavaHome,
    ANDROID_HOME: sdk,
    ...(ndk ? { ANDROID_NDK_HOME: ndk } : {}),
    ...extra,
  };
}
