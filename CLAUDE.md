# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a TypeScript library that provides an easy API for making Server-Sent Events (SSE) requests using the Fetch API. It supports both browsers and Node.js (v18+) and outputs dual-format packages (CommonJS and ESM).

## Development Commands

### Build
```bash
npm run build
```
Uses tsup to build both CJS (`build/index.cjs`) and ESM (`build/index.js`) formats with TypeScript declarations and source maps.

### Test
```bash
npm test
```
Runs Jest test suite with ts-jest preset in Node environment.

### Lint
While not defined in package.json scripts, ESLint is configured. The project uses:
- Single quotes
- 2-space indentation
- Unix line endings
- Semicolons required

## Architecture

### Core Flow
1. **Entry Point**: [src/index.ts](src/index.ts) exports the main API from `fetch.ts` and type definitions from `interface.ts`
2. **Main API**: `fetchEventData()` in [src/fetch.ts](src/fetch.ts) handles the HTTP request and orchestrates SSE parsing
3. **Stream Processing**: [src/sse.ts](src/sse.ts) contains the core SSE parsing logic

### SSE Parsing Pipeline

The library uses a two-stage parsing approach:

1. **LineDecoder** ([src/sse.ts](src/sse.ts)):
   - Parses byte chunks into SSE line buffers
   - Handles all newline variants: `\n`, `\r`, `\r\n`
   - Maintains internal buffer for incomplete lines across chunks
   - Tracks field length (position of first colon) for each line
   - Critical detail: Handles the optional space character (ASCII 32) after the colon in SSE format

2. **MessageDecoder** ([src/sse.ts](src/sse.ts)):
   - Converts parsed lines into `ServerSentEvent` objects
   - Accumulates multi-line data fields
   - Emits complete events when encountering empty lines
   - Extracts `event` and `data` fields from SSE format

### Cross-Platform Text Decoding

The library handles text decoding differently based on environment:
- **Node.js**: Uses `Buffer.from(bytes).toString('utf-8')`
- **Browser**: Uses `TextDecoder` API
- Both paths are in `MessageDecoder.decodeText()` ([src/sse.ts:84-116](src/sse.ts#L84-L116))

### Error Handling

[src/utils.ts](src/utils.ts) provides `checkOk()` which:
- Checks HTTP response status
- Extracts error messages from JSON or text responses
- Throws descriptive errors with server-provided messages when available

## Key Implementation Details

### SSE Format Parsing
The library correctly handles the SSE specification where field values can have an optional space after the colon:
- `data: value` (with space) → extracts "value"
- `data:value` (no space) → extracts "value"

This is handled in [src/sse.ts:69](src/sse.ts#L69) by checking if `line[filedLength + 1] === NewLineChars.Space`.

### Streaming Architecture
- Uses `ReadableStream<Uint8Array>` from Fetch API
- Processes chunks incrementally without loading entire response into memory
- `LineDecoder` maintains state across chunks to handle lines split across multiple reads

### Request Body Handling
`fetchEventData()` automatically serializes plain objects to JSON while passing through other BodyInit types unchanged ([src/fetch.ts:16-20](src/fetch.ts#L16-L20)).

## Testing Strategy

Tests in [test/sse.spec.ts](test/sse.spec.ts) focus on SSE parsing edge cases:
- Different newline formats (`\n`, `\r`, `\r\n`)
- Lines split across multiple byte arrays
- Space handling after colons
- Comment lines (starting with `:`)
- Multiple colons in values
- Escaped newline characters in values

When modifying SSE parsing logic, ensure these edge cases continue to work correctly.
