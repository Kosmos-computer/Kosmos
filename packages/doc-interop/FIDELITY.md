# Format fidelity matrix (Arco authoring surface)

Round-trip guarantee: **anything the Arco Docs / Sheets / Slides editors can create**
survives import → edit → export across supported formats. Features outside that
surface are dropped with warnings; original packages are retained as `*.source`
siblings when imported from ODF/OOXML.

## Docs (`application/x-os-doc+json`)

| Feature | JSON | Markdown | HTML | ODT | DOCX |
| --- | --- | --- | --- | --- | --- |
| Headings 1–3 | yes | yes | yes | yes | yes |
| Paragraphs / lists | yes | yes | yes | yes | yes |
| Bold / italic / code | yes | yes | yes | yes | yes |
| Links | yes | yes | yes | yes | yes |
| Tables | yes | limited | yes | yes | yes |
| Images (src / file id) | yes | limited | yes | limited | limited |
| Widgets | yes | fence | dropped | dropped | dropped |

## Sheets (`application/x-os-sheet+json`)

| Feature | JSON | CSV/TSV | ODS | XLSX |
| --- | --- | --- | --- | --- |
| Cell values | yes | yes | yes | yes |
| Multi-sheet | yes | first only | yes | yes |
| Formulas | yes | as text | yes | yes |
| Bold/italic/strike | yes | no | limited | yes |

## Slides (`application/x-os-slides+json`)

| Feature | JSON | HTML | ODP | PPTX | PDF |
| --- | --- | --- | --- | --- | --- |
| Text boxes | yes | yes | yes | yes | summary |
| Shapes | yes | yes | limited | yes | no |
| Images | yes | yes | limited | limited | no |
| Present order | yes | yes | yes | yes | order |
| Import | yes | yes* | yes | yes | no |

\*HTML import prefers embedded `arco-deck` JSON for lossless round-trip.
