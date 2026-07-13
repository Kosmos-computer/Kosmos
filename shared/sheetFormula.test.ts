import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluateFormula, expandRange } from "./sheetFormula.js";

describe("sheetFormula", () => {
  it("evaluates SUM over a range", () => {
    const cells = {
      A1: { value: 2 },
      A2: { value: 3 },
      A3: { formula: "=SUM(A1:A2)" },
    };
    assert.equal(evaluateFormula("=SUM(A1:A2)", cells), 5);
  });

  it("expands A1 ranges", () => {
    assert.deepEqual(expandRange("A1:B2"), ["A1", "B1", "A2", "B2"]);
  });

  it("evaluates arithmetic with cell refs", () => {
    const cells = { A1: { value: 10 }, B1: { value: 2 }, C1: { formula: "=A1*B1" } };
    assert.equal(evaluateFormula("=A1*B1", cells), 20);
  });
});
