import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCronSchedule,
  describeSchedule,
  parseCronSchedule,
} from "../../shared/automationSchedule.js";

describe("automationSchedule", () => {
  it("parses daily cron", () => {
    const parsed = parseCronSchedule("30 9 * * *");
    assert.equal(parsed.kind, "daily");
    if (parsed.kind !== "daily") return;
    assert.equal(parsed.hour, 9);
    assert.equal(parsed.minute, 30);
  });

  it("builds weekday cron", () => {
    assert.equal(
      buildCronSchedule({ kind: "weekdays", hour: 8, minute: 0 }),
      "0 8 * * 1-5",
    );
  });

  it("describes weekly schedule", () => {
    assert.match(describeSchedule("0 9 * * 1"), /Monday/);
  });
});
