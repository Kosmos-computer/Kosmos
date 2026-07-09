/** Stub node:child_process for embedded Android sidecar (nodejs-mobile restriction). */
const unavailable = () => new Error("child_process is not available in Arco Local on Android.");

function invokeCallback(args, error) {
  const cb = args.find((a) => typeof a === "function");
  if (cb) {
    cb(error ?? unavailable());
    return true;
  }
  return false;
}

export function execFile(...args) {
  if (!invokeCallback(args)) throw unavailable();
}

export function execFileSync() {
  throw unavailable();
}

export function exec(...args) {
  if (!invokeCallback(args)) throw unavailable();
}

export function spawn() {
  throw unavailable();
}

export function fork() {
  throw unavailable();
}
