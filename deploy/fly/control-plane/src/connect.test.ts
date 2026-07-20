import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildDesktopReturnError,
  buildDesktopReturnUrl,
  isAllowedReturnTo,
  parseConnectMode,
} from "./connect.js";

describe("connect helpers", () => {
  it("allows loopback return_to only", () => {
    assert.equal(isAllowedReturnTo("http://127.0.0.1:4610/"), true);
    assert.equal(isAllowedReturnTo("http://localhost:4600/app"), true);
    assert.equal(isAllowedReturnTo("https://kosmos.example.com/"), false);
    assert.equal(isAllowedReturnTo("javascript:alert(1)"), false);
    assert.equal(isAllowedReturnTo(""), false);
  });

  it("builds desktop return and error URLs", () => {
    const ok = buildDesktopReturnUrl("http://127.0.0.1:4610/", "https://kosmos-acme.fly.dev");
    const parsed = new URL(ok);
    assert.equal(parsed.searchParams.get("kosmosInstance"), "https://kosmos-acme.fly.dev");
    assert.equal(parsed.searchParams.get("kosmosConnected"), "1");

    const err = buildDesktopReturnError("http://127.0.0.1:4610/", "Nope");
    assert.equal(new URL(err).searchParams.get("kosmosConnectError"), "Nope");
  });

  it("parses connect mode", () => {
    assert.equal(parseConnectMode("signup"), "signup");
    assert.equal(parseConnectMode("existing"), "existing");
    assert.equal(parseConnectMode(null), "existing");
  });
});
