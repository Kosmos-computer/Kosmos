// Scripted ACP agent for smoke-testing Arco's ACP client without burning
// real provider credits. Speaks the actual protocol over stdio: streams
// message chunks, reports a tool call, reads hello.txt back through the
// client's fs capability, and — when the prompt contains "write" —
// requests permission and writes greeting.txt on approval.
//
// Use: point Settings → Agent → Custom at
//   <repo>/node_modules/.bin/tsx <repo>/scripts/acp-test-agent.mts
// then chat. Expect text_delta / tool_start / tool_end / confirm_required /
// file_changed events, all translated by server/acp/acpAgent.ts.
import { Readable, Writable } from "node:stream";
import {
  AgentSideConnection,
  ndJsonStream,
  PROTOCOL_VERSION,
} from "@zed-industries/agent-client-protocol";

const stream = ndJsonStream(
  Writable.toWeb(process.stdout) as WritableStream<Uint8Array>,
  Readable.toWeb(process.stdin) as ReadableStream<Uint8Array>,
);

new AgentSideConnection(
  (conn) => ({
    async initialize() {
      return { protocolVersion: PROTOCOL_VERSION, agentCapabilities: {}, authMethods: [] };
    },
    async newSession(params: { cwd: string; mcpServers: unknown[] }) {
      console.error(`FAKE_AGENT cwd=${params.cwd} mcpServers=${params.mcpServers.length}`);
      return { sessionId: "fake-session-1" };
    },
    async prompt(params: { sessionId: string; prompt: { type: string; text?: string }[] }) {
      const sessionId = params.sessionId;
      const say = (text: string) =>
        conn.sessionUpdate({
          sessionId,
          update: { sessionUpdate: "agent_message_chunk", content: { type: "text", text } },
        });

      await say("Hello from the fake ACP agent. ");
      await conn.sessionUpdate({
        sessionId,
        update: {
          sessionUpdate: "tool_call",
          toolCallId: "call-1",
          title: "Read hello.txt",
          kind: "read",
          status: "in_progress",
          rawInput: { path: "hello.txt" },
        },
      });
      let content = "";
      try {
        const res = await conn.readTextFile({ sessionId, path: `${process.cwd()}/hello.txt` });
        content = res.content.trim();
      } catch (err) {
        content = `ERR: ${err instanceof Error ? err.message : String(err)}`;
      }
      await conn.sessionUpdate({
        sessionId,
        update: {
          sessionUpdate: "tool_call_update",
          toolCallId: "call-1",
          status: "completed",
          rawOutput: { content },
        },
      });
      await say(`The file says: ${content}`);

      // "write" in the prompt exercises the permission + fs-write path.
      const text = params.prompt.map((p) => p.text ?? "").join(" ");
      if (text.includes("write")) {
        const perm = await conn.requestPermission({
          sessionId,
          toolCall: { toolCallId: "call-2", title: "Write greeting.txt" },
          options: [
            { optionId: "y", name: "Allow", kind: "allow_once" },
            { optionId: "n", name: "Deny", kind: "reject_once" },
          ],
        });
        if (perm.outcome.outcome === "selected" && perm.outcome.optionId === "y") {
          await conn.writeTextFile({
            sessionId,
            path: `${process.cwd()}/greeting.txt`,
            content: "written by the fake agent\n",
          });
          await say(" Wrote greeting.txt.");
        } else {
          await say(" Write was denied.");
        }
      }
      return { stopReason: "end_turn" };
    },
    async cancel() {},
    async authenticate() {
      return {};
    },
    async loadSession() {
      throw new Error("loadSession unsupported");
    },
    async setSessionMode() {
      return {};
    },
    async setSessionModel() {
      return {};
    },
  }),
  stream,
);
