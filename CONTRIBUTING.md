# Contributing

Thanks for helping improve the Message Template node.

## Setup

Requires Node.js 20.15 or newer.

```bash
git clone https://github.com/SilentJMA/n8n-nodes-message-template.git
cd n8n-nodes-message-template
npm install --ignore-scripts
```

`--ignore-scripts` skips compiling a native sandbox module that `n8n-workflow` depends on. It is only needed inside a running n8n, not to build or test this node.

## Workflow

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts a local n8n at http://localhost:5678 with this node loaded and rebuilds on change |
| `npm run build` | Compiles to `dist/` |
| `npm run lint` | Runs the n8n community node lint rules |
| `npm run lint:fix` | Fixes what can be fixed automatically |
| `npm test` | Builds and runs the test suite in `test/` |

## Project layout

```
nodes/MessageTemplate/
  MessageTemplate.node.ts    Node description and execution
  MessageTemplate.node.json  Codex metadata (categories, docs link, search aliases)
  xml.ts                     Dependency-free XML parser, XML-to-JSON converter and formatter
  message.svg / .dark.svg    Node icon (light and dark theme)
test/                        node:test suites run against the compiled dist/
examples/                    Importable example workflows
```

The node has no runtime dependencies on purpose, so it can be copied straight into an n8n `custom` folder. Please keep it that way.

## Pull requests

1. Add or update tests for the behaviour you change.
2. Make sure `npm run lint` and `npm test` pass.
3. Add an entry under an `Unreleased` heading in `CHANGELOG.md`.

## Releasing (maintainers)

1. Bump `version` in `package.json` and move the `Unreleased` changelog entries under the new version.
2. Commit, then create a GitHub release with tag `vX.Y.Z` matching the version.
3. The **Publish to npm** workflow lints, tests and publishes the package with provenance. It needs an `NPM_TOKEN` repository secret (an npm automation token).
