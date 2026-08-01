import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { detectJsBleed, hasJsBleed } from "./jsBleed.js";
import { lintOpenUICode } from "./lint-openui.js";

describe("detectJsBleed", () => {
  it("flags .map and arrow functions", () => {
    const code = `resultsList = @results.map((item) => Card([TextContent(item.name)]))`;
    const findings = detectJsBleed(code);
    assert.ok(findings.some((f) => f.code === "js-bleed-map"));
    assert.ok(findings.some((f) => f.code === "js-bleed-arrow"));
    assert.equal(hasJsBleed(findings), true);
  });

  it("flags Mutation object form and Query.data", () => {
    const code = `
query = Mutation({ service: "exec", input: { command: "echo hi" } })
results = Query("exec", {command: "echo []"}).data
`;
    const findings = detectJsBleed(code);
    assert.ok(findings.some((f) => f.code === "js-bleed-mutation-object"));
    assert.ok(findings.some((f) => f.code === "js-bleed-query-data"));
  });

  it("lintOpenUICode includes js-bleed findings", () => {
    const report = lintOpenUICode(`root = Stack([x])
x = TextContent("hi")
bad = @rows.map((r) => TextContent(r.name))
`);
    assert.equal(report.ok, false);
    assert.ok(report.findings.some((f) => f.code.startsWith("js-bleed-")));
  });
});
