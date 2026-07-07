/**
 * Mint a session token for the Arco menu bar tasks app.
 * Writes ~/Library/Application Support/ArcoMenubarTasks/session-token
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { authSessionStore } from "../server/auth/sessionStore.js";
import { userStore } from "../server/auth/userStore.js";

const users = userStore.list();
const owner = users.find((u) => u.role === "owner") ?? users[0];
if (!owner) {
  console.error("No user accounts found. Complete Arco setup first.");
  process.exit(1);
}

const token = authSessionStore.create(owner.id);
const dir = path.join(os.homedir(), "Library", "Application Support", "ArcoMenubarTasks");
fs.mkdirSync(dir, { recursive: true });
const file = path.join(dir, "session-token");
fs.writeFileSync(file, token, { encoding: "utf-8", mode: 0o600 });

console.log(`Session token written for ${owner.username} → ${file}`);
console.log("Restart the menu bar app if it is already running.");
