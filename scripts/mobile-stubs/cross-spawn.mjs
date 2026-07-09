/** Stub cross-spawn for embedded Android sidecar. */
const err = () => new Error("Subprocess spawn is not available in Arco Local on Android.");

export function spawn() {
  throw err();
}

export function spawnSync() {
  throw err();
}

export default spawn;
