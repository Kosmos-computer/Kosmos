#!/usr/bin/env node
/**
 * Generate Android + iOS launcher icons for Kosmos Connect and Kosmos Local.
 *
 * Connect: white mark on black tile.
 * Local:   black mark on white tile.
 *
 * Android flavors read from src/connect/res and src/local/res.
 * iOS assets are written when apps/mobile/ios exists (gitignored, created by cap sync).
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  DENSITIES,
  MOBILE_ICON_VARIANTS,
  SPLASH,
  adaptiveForegroundSvg,
  fullIconSvg,
  launcherSvg,
  rasterizeSvg,
  resizePng,
} from "./mobile-icon-lib.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const androidRoot = path.join(root, "apps/mobile/android/app/src");
const iosIconDir = path.join(
  root,
  "apps/mobile/ios/App/App/Assets.xcassets/AppIcon.appiconset",
);
const iosSplashDir = path.join(
  root,
  "apps/mobile/ios/App/App/Assets.xcassets/Splash.imageset",
);
const iosInfoPlist = path.join(root, "apps/mobile/ios/App/App/Info.plist");
const tmpDir = path.join(os.tmpdir(), "kosmos-mobile-icons");

function writeBackgroundColor(resRoot, variant) {
  const { tileBg } = MOBILE_ICON_VARIANTS[variant];
  const colorPath = path.join(resRoot, "values/ic_launcher_background.xml");
  fs.mkdirSync(path.dirname(colorPath), { recursive: true });
  fs.writeFileSync(
    colorPath,
    `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">${tileBg}</color>
</resources>
`,
  );

  const drawableBg = path.join(resRoot, "drawable/ic_launcher_background.xml");
  fs.mkdirSync(path.dirname(drawableBg), { recursive: true });
  fs.writeFileSync(
    drawableBg,
    `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <path android:fillColor="${tileBg}" android:pathData="M0,0h108v108h-108z" />
</vector>
`,
  );
}

function generateAndroidVariant(variant, flavorDir) {
  const resRoot = path.join(androidRoot, flavorDir, "res");
  const variantTmp = path.join(tmpDir, variant);
  fs.mkdirSync(variantTmp, { recursive: true });

  const foregroundSvgPath = path.join(variantTmp, "adaptive-foreground.svg");
  const launcherSvgPath = path.join(variantTmp, "launcher.svg");
  const fullSvgPath = path.join(variantTmp, "full.svg");
  fs.writeFileSync(foregroundSvgPath, adaptiveForegroundSvg(variant));
  fs.writeFileSync(launcherSvgPath, launcherSvg(variant));
  fs.writeFileSync(fullSvgPath, fullIconSvg(variant));
  writeBackgroundColor(resRoot, variant);

  for (const [folder, { launcher, foreground }] of Object.entries(DENSITIES)) {
    const dir = path.join(resRoot, folder);
    fs.mkdirSync(dir, { recursive: true });
    const launcherPath = path.join(dir, "ic_launcher.png");
    const roundPath = path.join(dir, "ic_launcher_round.png");
    const foregroundPath = path.join(dir, "ic_launcher_foreground.png");

    rasterizeSvg(launcherSvgPath, launcher, launcherPath);
    fs.copyFileSync(launcherPath, roundPath);
    rasterizeSvg(foregroundSvgPath, foreground, foregroundPath);
    console.log(`[mobile:icons] ${flavorDir}/${folder} → ${launcher}px (${variant})`);
  }

  const splashSource = path.join(variantTmp, "full-1024.png");
  rasterizeSvg(fullSvgPath, 1024, splashSource);

  const splashDir = path.join(resRoot, "drawable");
  fs.mkdirSync(splashDir, { recursive: true });
  resizePng(splashSource, 512, path.join(splashDir, "splash.png"));

  for (const [folder, width] of Object.entries(SPLASH)) {
    const dir = path.join(resRoot, folder);
    fs.mkdirSync(dir, { recursive: true });
    resizePng(splashSource, width, path.join(dir, "splash.png"));
  }
}

function generateIosVariant(variant) {
  if (!fs.existsSync(path.dirname(iosIconDir))) {
    console.log("[mobile:icons] iOS project not found — skip (run cap sync ios first)");
    return;
  }

  const variantTmp = path.join(tmpDir, `${variant}-ios`);
  fs.mkdirSync(variantTmp, { recursive: true });
  const fullSvgPath = path.join(variantTmp, "full.svg");
  fs.writeFileSync(fullSvgPath, fullIconSvg(variant));
  const iconPng = path.join(variantTmp, "icon-1024.png");
  rasterizeSvg(fullSvgPath, 1024, iconPng);

  fs.mkdirSync(iosIconDir, { recursive: true });
  fs.copyFileSync(iconPng, path.join(iosIconDir, "AppIcon-512@2x.png"));
  console.log(`[mobile:icons] iOS AppIcon → ${variant}`);

  if (fs.existsSync(iosSplashDir)) {
    const splashNames = ["splash-2732x2732.png", "splash-2732x2732-1.png", "splash-2732x2732-2.png"];
    const splashPng = path.join(variantTmp, "splash-2732.png");
    rasterizeSvg(fullSvgPath, 2732, splashPng);
    for (const name of splashNames) {
      fs.copyFileSync(splashPng, path.join(iosSplashDir, name));
    }
    console.log("[mobile:icons] iOS Splash.imageset updated");
  }

  if (fs.existsSync(iosInfoPlist)) {
    const displayName = MOBILE_ICON_VARIANTS[variant].label;
    let plist = fs.readFileSync(iosInfoPlist, "utf8");
    plist = plist.replace(
      /<key>CFBundleDisplayName<\/key>\s*<string>[^<]*<\/string>/,
      `<key>CFBundleDisplayName</key>\n        <string>${displayName}</string>`,
    );
    fs.writeFileSync(iosInfoPlist, plist);
    console.log(`[mobile:icons] iOS CFBundleDisplayName → ${displayName}`);
  }
}

fs.mkdirSync(tmpDir, { recursive: true });

// Flavor-specific Android assets; main mirrors Connect for non-flavored builds.
generateAndroidVariant("connect", "connect");
generateAndroidVariant("local", "local");
generateAndroidVariant("connect", "main");

// iOS is thin-client only today — Connect branding.
generateIosVariant("connect");

console.log("[mobile:icons] Done — Connect (dark tile), Local (light tile)");
