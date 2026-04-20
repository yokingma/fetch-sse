# Patterns

## SSE Parsing

- `LineDecoder` owns byte-level buffering across chunks and is responsible for reconstructing complete lines.
- `LineDecoder` also strips exactly one leading UTF-8 BOM before any field parsing starts, even if the BOM arrives across multiple chunks.
- `MessageDecoder` owns message-level state across lines and must live for the lifetime of a parsed stream.
- Do not recreate `MessageDecoder` per chunk, or `event` and accumulated `data` fields from the same SSE message can be lost when the network splits them across reads.
- Only dispatch an SSE message after at least one `data` field has been accumulated. Blank blocks, comments, and `id`/`event`/`retry`-only blocks must reset parser state without calling `onMessage`.
- Treat lines without a colon as empty-value fields. This matters for cases like bare `data` or bare `event`.

## Test Coverage

- Keep regression tests around stream-level edge cases, especially cross-chunk message state, split BOM handling, and control-only SSE blocks.
- Cover both request orchestration (`fetchEventData`) and response error extraction (`checkOk`) so callback ordering and error message selection stay stable.
