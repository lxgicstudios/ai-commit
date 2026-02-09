# @lxgicstudios/ai-commit

[![npm version](https://img.shields.io/npm/v/@lxgicstudios/ai-commit)](https://www.npmjs.com/package/@lxgicstudios/ai-commit)
[![npm downloads](https://img.shields.io/npm/dm/@lxgicstudios/ai-commit)](https://www.npmjs.com/package/@lxgicstudios/ai-commit)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-green.svg)](https://nodejs.org/)

> Generate conventional commit messages from staged git changes. Zero dependencies.

## Features

- Analyzes `git diff --staged` to detect commit type automatically
- Detects scope from file paths (e.g., changes in `src/auth/` -> scope `auth`)
- Supports all Conventional Commits types: feat, fix, chore, refactor, docs, style, test, ci, perf
- Dry-run mode to preview without committing
- Amend mode to rewrite the last commit message
- Breaking change support with `BREAKING CHANGE` footer
- JSON output for CI/CD integration
- Zero external dependencies - uses only Node.js builtins

## Installation

Run directly with npx:

```bash
npx @lxgicstudios/ai-commit
```

Or install globally:

```bash
npm install -g @lxgicstudios/ai-commit
```

## Usage

Stage your changes, then run:

```bash
git add -A
npx @lxgicstudios/ai-commit
```

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `--type <type>` | Override commit type (feat, fix, chore, etc.) | Auto-detected |
| `--scope <scope>` | Override commit scope | Auto-detected |
| `--breaking` | Mark as breaking change | `false` |
| `--dry-run` | Preview message without committing | `false` |
| `--amend` | Rewrite the last commit message | `false` |
| `--body <text>` | Add a commit body | |
| `--json` | Output commit info as JSON | `false` |
| `--help` | Show help message | |

### Commit Types

| Type | Description | When to use |
|------|-------------|-------------|
| `feat` | New feature | Adding new functionality |
| `fix` | Bug fix | Fixing broken behavior |
| `docs` | Documentation | README, comments, JSDoc |
| `style` | Code style | Formatting, semicolons, whitespace |
| `refactor` | Refactoring | Restructuring without changing behavior |
| `chore` | Maintenance | Dependencies, build, tooling |
| `test` | Tests | Adding or updating tests |
| `ci` | CI/CD | GitHub Actions, pipelines |
| `perf` | Performance | Optimizations |

### Examples

```bash
# Auto-detect everything
npx @lxgicstudios/ai-commit

# Preview what it'd generate
npx @lxgicstudios/ai-commit --dry-run

# Force a specific type and scope
npx @lxgicstudios/ai-commit --type feat --scope auth

# Rewrite your last commit message
npx @lxgicstudios/ai-commit --amend

# Breaking change with body text
npx @lxgicstudios/ai-commit --breaking --body "Removed deprecated API endpoints"

# JSON output for scripts
npx @lxgicstudios/ai-commit --json --dry-run
```

## How It Works

1. Reads your staged git diff (`git diff --staged`)
2. Analyzes file paths to detect scope (e.g., `src/components/` -> `components`)
3. Scans diff content for patterns (fix keywords, new files, refactoring signals)
4. Generates a Conventional Commits message: `type(scope): summary`
5. Commits with the generated message (or previews in dry-run mode)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/cool-feature`)
3. Commit your changes (`git commit -m 'feat: add cool feature'`)
4. Push to the branch (`git push origin feature/cool-feature`)
5. Open a Pull Request

## License

MIT License. See [LICENSE](LICENSE) for details.

---

Built by **[LXGIC Studios](https://lxgicstudios.com)**

[GitHub](https://github.com/lxgicstudios/ai-commit) | [Twitter](https://x.com/lxgicstudios)
