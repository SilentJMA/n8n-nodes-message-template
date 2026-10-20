# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [0.2.0] - 2026-10-20

### Added

- *JSON* output also accepts JavaScript object literals (unquoted keys, single-quoted strings, trailing commas, comments) when the text is not strict JSON.

### Security

- XML element and attribute names such as `__proto__` are treated as plain data and can't modify object prototypes.
- XML nested deeper than 1,000 levels is rejected with a clear error instead of exhausting the stack.
- The lenient JSON parser is hand-written: it never evaluates code and does not pollute prototypes.

### Fixed

- XML attributes named `constructor`, `toString` and the like were rejected as duplicates.

## [0.1.0] - 2026-10-17

### Added

- **Message Template** node that renders content from an n8n expression template.
- Modes: *Run Once for Each Item* and *Combine All Items* (with header, separator and footer).
- Output formats:
  - *Text*: rendered text in a configurable field.
  - *JSON*: parsed JSON as the output item; arrays become one item per element.
  - *XML*: parsed into selectable structured data (attributes under `$`, text under `_`, repeated elements as arrays), with an optional pretty-printed XML field.
  - *File*: rendered text as a binary file with configurable name and MIME type.
- Options: include other input fields, and line ending conversion (LF, CRLF, CR).
- Clear errors with line and column for invalid XML, and escaping hints for invalid JSON.

[0.2.0]: https://github.com/SilentJMA/n8n-nodes-message-template/releases/tag/v0.2.0
[0.1.0]: https://github.com/SilentJMA/n8n-nodes-message-template/releases/tag/v0.1.0
