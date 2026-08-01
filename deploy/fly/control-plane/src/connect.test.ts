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
    assert.equal(parsed.searchParams.get("kosmosEntry"), null);

    const withEntry = buildDesktopReturnUrl(
      "http://127.0.0.1:4610/",
      "https://kosmos-acme.fly.dev/",
      "https://kosmos-acme.fly.dev/entry/abc123",
    );
    const entryParsed = new URL(withEntry);
    assert.equal(entryParsed.searchParams.get("kosmosInstance"), "https://kosmos-acme.fly.dev");
    assert.equal(entryParsed.searchParams.get("kosmosEntry"), "https://kosmos-acme.fly.dev/entry/abc123");

    const err = buildDesktopReturnError("http://127.0.0.1:4610/", "Nope");
    const errParsed = new URL(err);
    assert.equal(errParsed.searchParams.get("kosmosConnectError"), "Nope");
    assert.equal(errParsed.searchParams.get("kosmosEntry"), null);
  });

  it("parses connect mode", () => {
    assert.equal(parseConnectMode("signup"), "signup");
    assert.equal(parseConnectMode("existing"), "existing");
    assert.equal(parseConnectMode(null), "existing");
  });
});
