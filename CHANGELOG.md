# Changelog

## 2026-04-20

- Fixed `parseServerSentEvent()` so `MessageDecoder` persists for the lifetime of a stream instead of being recreated for each chunk.
- Added a regression test covering a single SSE message split across multiple chunks.
- Fixed SSE dispatch so blank blocks, comments, and control-only fields do not emit user messages.
- Fixed parsing for bare fields without a colon and for streams that begin with a UTF-8 BOM.
- Expanded automated coverage for fetch request body handling, close/error callbacks, SSE BOM split handling, and structured error extraction in `checkOk()`.
