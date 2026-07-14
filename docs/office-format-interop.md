# Office format interop

Arco keeps **canonical** Docs / Sheets / Slides documents as typed JSON on
`os.files@1`. Open formats are bridged at the boundary by
`@arco/doc-interop` (same posture as calendar → iCal in
[`open-standards-map.md`](./open-standards-map.md)).

## Supported formats

| App | Canonical | ODF | OOXML | Web-native |
| --- | --- | --- | --- | --- |
| Docs | `.doc.json` | `.odt` | `.docx` | Markdown, HTML |
| Sheets | `.sheet.json` | `.ods` | `.xlsx` | CSV, TSV |
| Slides | `.slides.json` | `.odp` | `.pptx` | HTML; PDF export |

## Round-trip guarantee

Anything the Arco editors can author survives **import → edit → export** across
the formats above. Features outside that surface (macros, SmartArt, VBA, mail
merge, pivot caches, …) are **dropped with warnings**. ODF/OOXML imports store
original bytes as a sibling `*.source` file when `retainSource` is true.

See [`packages/doc-interop/FIDELITY.md`](../packages/doc-interop/FIDELITY.md)
for the feature matrix.

## Intents

- `docs.import` / `docs.export`
- `sheets.import` / `sheets.export` / `sheets.query` / `sheets.write_range`
- `slides.import` / `slides.export`

Agent tools: `docs_export`, `sheets_query`, `sheets_write_range`, `slides_create`, `slides_open`, `slides_write`, `slides_export`.
Presentations should be authored as full DeckDoc JSON (960×540 canvas with positioned boxes); see the `slides-authoring` skill.

## Conformance

Golden round-trip tests live in `packages/doc-interop/src/roundtrip.test.ts`
and run via `npm test`.
