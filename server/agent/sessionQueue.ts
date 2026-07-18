/**
 * Per-session turn serialization — one lane per key so concurrent sends
 * cannot interleave tool calls in the same transcript.
 *
 * Channels used an inline Map; chat/voice now share this helper (OpenClaw
 * session-lane pattern). Keys are opaque strings like `chat:<sessionId>` or
 * `channel:<channelId>:<chatId>`.
 */
const lanes = new Map<string, Promise<void>>();

/** Enqueue `task` behind any in-flight work for `key`. Errors are swallowed so the lane never sticks. */
export function enqueueSession(key: string, task: () => Promise<void>): Promise<void> {
  const tail = (lanes.get(key) ?? Promise.resolve())
    .then(task)
    .catch(() => {});
  lanes.set(key, tail);
  return tail;
}

/** Run an async function that returns a value, serialized on `key`. */
export function enqueueSessionResult<T>(key: string, task: () => Promise<T>): Promise<T> {
  let resolve!: (value: T) => void;
  let reject!: (err: unknown) => void;
  const result = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  void enqueueSession(key, async () => {
    try {
      resolve(await task());
    } catch (err) {
      reject(err);
    }
  });
  return result;
}
