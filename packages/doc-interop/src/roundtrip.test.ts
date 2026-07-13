import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { exportDoc, exportSheet, exportSlides, importDoc, importSheet, importSlides } from "./index.js";
import type { DeckDoc, DocNode, WorkbookDoc } from "./types.js";

const sampleDoc: DocNode = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Hello" }] },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "with " },
        { type: "text", text: "link", marks: [{ type: "link", attrs: { href: "https://example.com" } }] },
      ],
    },
  ],
};

const sampleSheet: WorkbookDoc = {
  version: 1,
  title: "Budget",
  sheets: [
    {
      id: "sheet-1",
      name: "Sheet1",
      cells: {
        A1: { value: 10 },
        A2: { value: 5 },
        A3: { formula: "=SUM(A1:A2)", value: "=SUM(A1:A2)" },
      },
    },
  ],
};

const sampleDeck: DeckDoc = {
  version: 1,
  title: "Deck",
  width: 960,
  height: 540,
  slides: [
    {
      id: "slide-1",
      boxes: [
        {
          id: "box-1",
          kind: "text",
          x: 40,
          y: 40,
          w: 400,
          h: 80,
          content: {
            type: "doc",
            content: [{ type: "paragraph", content: [{ type: "text", text: "Title" }] }],
          },
        },
      ],
    },
  ],
};

describe("doc-interop docs", () => {
  it("round-trips markdown", async () => {
    const exported = await exportDoc(sampleDoc, "markdown");
    const imported = await importDoc(exported.bytes, "markdown");
    assert.match(JSON.stringify(imported.content), /Hello/);
  });

  it("round-trips html", async () => {
    const exported = await exportDoc(sampleDoc, "html");
    const imported = await importDoc(exported.bytes, "html");
    assert.match(JSON.stringify(imported.content), /Hello/);
  });

  it("round-trips odt", async () => {
    const exported = await exportDoc(sampleDoc, "odt");
    const imported = await importDoc(exported.bytes, "odt");
    assert.match(JSON.stringify(imported.content), /Hello/);
  });

  it("round-trips docx", async () => {
    const exported = await exportDoc(sampleDoc, "docx");
    const imported = await importDoc(exported.bytes, "docx");
    assert.match(JSON.stringify(imported.content), /Hello/);
  });
});

describe("doc-interop sheets", () => {
  it("round-trips csv", async () => {
    const exported = await exportSheet(sampleSheet, "csv");
    const imported = await importSheet(exported.bytes, "csv");
    assert.equal(imported.content.sheets[0].cells.A1?.value, 10);
  });

  it("round-trips xlsx", async () => {
    const exported = await exportSheet(sampleSheet, "xlsx");
    const imported = await importSheet(exported.bytes, "xlsx");
    assert.equal(imported.content.sheets[0].cells.A1?.value, 10);
  });

  it("round-trips ods", async () => {
    const exported = await exportSheet(sampleSheet, "ods");
    const imported = await importSheet(exported.bytes, "ods");
    assert.equal(imported.content.sheets[0].cells.A1?.value, 10);
  });
});

describe("doc-interop slides", () => {
  it("round-trips html via arco-deck", async () => {
    const exported = await exportSlides(sampleDeck, "html");
    const imported = await importSlides(exported.bytes, "html");
    assert.equal(imported.content.slides[0].boxes[0].id, "box-1");
  });

  it("round-trips odp via arco-deck.json", async () => {
    const exported = await exportSlides(sampleDeck, "odp");
    const imported = await importSlides(exported.bytes, "odp");
    assert.equal(imported.content.title, "Deck");
  });

  it("round-trips pptx via arco-deck.json", async () => {
    const exported = await exportSlides(sampleDeck, "pptx");
    const imported = await importSlides(exported.bytes, "pptx");
    assert.equal(imported.content.slides.length, 1);
  });
});
