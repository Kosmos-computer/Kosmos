# Standards map

Arco sits inside a broader open-standards landscape. This page summarizes the posture from `docs/open-standards-map.md` in the repo.

## Three postures

| Posture | Meaning |
|---------|---------|
| **Adopt** | Use an existing open standard as-is |
| **Bridge** | Keep internal format; map at boundaries |
| **Define** | Arco publishes the spec — no adequate existing standard |

## Where Arco defines

| Subsystem | Arco's role |
|-----------|-------------|
| Generative UI language | Grammar, vocabulary, binding contract |
| Component vocabulary | JSON Schema profiles (chat vs reactive app) |
| Live data binding | Query/Mutation → host tools without LLM round-trip |
| Patch semantics | Statement-level merge for agent-driven app evolution |
| Design tokens | `--arco-*` with planned DTCG export |
| Block registry | Manifest shape, adaptivity, validation |

## Where Arco adopts

| Standard | Use |
|----------|-----|
| MCP | Tool interop (client + outward server) |
| ACP | External coding agents (Claude Code, Codex, Gemini) |
| JSON Schema | Parameter schemas across tools and intents |
| Markdown + GFM | Chat prose |
| WebRTC / Pipecat | Voice transport |

## Where Arco bridges

| Area | Bridge |
|------|--------|
| Design tokens | CSS vars today → DTCG file as canonical source |
| Agent events | Custom SSE stream; track AG-UI for future mapping |
| Calendar data | Custom `os.calendar@1` + planned iCal import/export |

## Arco open standard modules

The nine "define" areas group into four spec modules:

1. **UI language + binding** — grammar, profiles, host contract, patches
2. **Capabilities (os.*\*)** — versioned intent contracts exposed as MCP tools
3. **App packaging + bridge** — manifest + postMessage/HTTP host API
4. **Agent surface** — event stream and cursor protocol

## Generative stack today

```
@openuidev/lang-core      → grammar (future: Arco spec)
@openuidev/react-ui       → vocabulary (future: block registry)
@openuidev/react-lang     → renderer (reference impl)
Arco tokens + ui/         → theming and shell primitives
```

Fork trigger: when upstream blocks the binding contract or React decoupling — not for styling differences alone.

For the full subsystem table, see `docs/open-standards-map.md` in the Arco-Prototype-2 repository.
