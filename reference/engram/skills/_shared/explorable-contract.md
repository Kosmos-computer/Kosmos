# The Explorable Contract

Binding spec for every HTML artifact Engram generates (enforced by the artifact-smith agent; spot-checked by /coach). An artifact that fails any clause is a defect, however beautiful. Rationale: Mayer's multimedia principles + ICAP + the mnemonic medium (`docs/01-foundations.md` P6; `docs/02-prior-art.md` §C).

## The seven clauses

1. **Prediction gate.** The artifact opens with a question the reader must commit to (click, slider, typed guess) before the core content unlocks. No commitment → no reveal.
2. **Manipulable model.** At least one interactive model (slider/drag/toggle) of the concept's causal structure — and the reader is asked to *predict its behavior before first touch*.
3. **Embedded retrieval.** ≥2 inline free-recall prompts (mnemonic-medium style), positioned after the relevant segment, answers hidden until attempted. The artifact's closing text tells the reader to report their answers back to Engram so they become receipts.
4. **Mayer-minimal.** Zero decoration. Every pixel carries meaning (coherence). Structure is signaled. Segments are learner-paced (no autoplaying sequences). Labels sit on the thing they label (contiguity). Conversational tone (personalization).
5. **Self-contained + both themes.** One offline HTML file: no CDNs, no external fonts/images/fetches. Light and dark via CSS tokens (`prefers-color-scheme` plus `:root[data-theme=…]` overrides). Under ~120 KB.
6. **Blank-page ending.** The final section asks the reader to close/cover the artifact and reconstruct the argument skeleton from nothing — with a reveal to check against.
7. **Versioned + regenerable.** Header comment: node id, topic, generated date, learner-model snapshot hash inputs (interests used, scaffold level). Saved to `~/.claude/learning/artifacts/<topic>/<node>.html`. Regenerated (not patched) when mastery state or misconceptions change materially.

## Widget vocabulary (grow it, but start here)

- **parameter-slider sim** — continuous cause → visible effect (curves, distributions, systems)
- **predict-then-reveal plot** — commit a value/shape, then overlay reality
- **drag-to-order chain** — reconstruct a causal/derivation sequence (chain of necessity, literally)
- **contrast-pair toggle** — flip one dimension, watch what changes (variation theory)
- **worked-example stepper** — learner-paced steps, each gated by "what happens next?"
- **DAG mini-map** — where this node sits; mastery-colored; edges labeled

## QA checklist (artifact-smith must self-audit before returning)

- [ ] Clause 1: what is gated, and by what commitment?
- [ ] Clause 2: which model, and where is the pre-touch prediction asked?
- [ ] Clause 3: quote both retrieval prompts
- [ ] Clause 4: name one thing you deleted for coherence
- [ ] Clause 5: file opens from `file://` offline; both themes checked
- [ ] Clause 6: quote the reconstruction prompt
- [ ] Clause 7: header comment present; correct path
