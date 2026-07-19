import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { describe, it } from "node:test";
import {
  decodeGoogleChatId,
  encodeGoogleChatId,
  encodeTeamsChatId,
  peekTeamsInboundJwt,
  validateTwilioSignature,
} from "./oauthTokens.js";

describe("oauthTokens helpers", () => {
  it("round-trips Teams / Google chat ids", () => {
    const teams = encodeTeamsChatId({
      serviceUrl: "https://smba.trafficmanager.net/amer",
      conversationId: "19:abc",
      tenantId: "tid",
    });
    assert.match(teams, /smba\.trafficmanager/);
    assert.equal(encodeGoogleChatId("spaces/AAA"), "spaces/AAA");
    assert.deepEqual(decodeGoogleChatId(encodeGoogleChatId("spaces/AAA", "spaces/AAA/threads/T")), {
      space: "spaces/AAA",
      thread: "spaces/AAA/threads/T",
    });
  });

  it("validates Twilio signatures", () => {
    const url = "https://example.com/api/channels/webhook/sms/x";
    const params = { From: "+1555", Body: "hi", To: "+1666" };
    const sorted = Object.keys(params)
      .sort()
      .reduce((acc, k) => acc + k + params[k as keyof typeof params], url);
    const sig = createHmac("sha1", "auth-token").update(sorted, "utf8").digest("base64");
    assert.equal(validateTwilioSignature("auth-token", sig, url, params), true);
    assert.equal(validateTwilioSignature("auth-token", "nope", url, params), false);
  });

  it("peeks Teams JWT aud/iss without full JWKS", () => {
    const payload = Buffer.from(
      JSON.stringify({
        aud: "my-app-id",
        iss: "https://api.botframework.com",
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    ).toString("base64url");
    const token = `e30.${payload}.sig`;
    assert.equal(peekTeamsInboundJwt(`Bearer ${token}`, "my-app-id").ok, true);
    assert.equal(peekTeamsInboundJwt(`Bearer ${token}`, "other").ok, false);
  });
});
