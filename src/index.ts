#!/usr/bin/env node

import { execSync } from "node:child_process";
import * as path from "node:path";

// ── ANSI Colors ──
const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
};

const BANNER = `
${c.magenta}${c.bold}  ╔═══════════════════════════════════╗
  ║         ai-commit v1.0.0          ║
  ║   Conventional commit generator   ║
  ╚═══════════════════════════════════╝${c.reset}
`;

const HELP = `
${BANNER}
${c.bold}USAGE${c.reset}
  ${c.green}npx @lxgicstudios/ai-commit${c.reset} [options]

${c.bold}DESCRIPTION${c.reset}
  Generates conventional commit messages from your staged git changes.
  Analyzes the diff to detect type (feat, fix, chore, etc.) and scope
  from file paths. Follows the Conventional Commits specification.

${c.bold}OPTIONS${c.reset}
  ${c.yellow}--type <type>${c.reset}       Override commit type: feat|fix|chore|refactor|docs|style|test|ci|perf
  ${c.yellow}--scope <scope>${c.reset}     Override commit scope
  ${c.yellow}--breaking${c.reset}          Mark as breaking change
  ${c.yellow}--dry-run${c.reset}           Preview message without committing
  ${c.yellow}--amend${c.reset}             Rewrite the last commit message
  ${c.yellow}--body <text>${c.reset}       Add a commit body
  ${c.yellow}--json${c.reset}              Output commit info as JSON
  ${c.yellow}--help${c.reset}              Show this help message

${c.bold}COMMIT TYPES${c.reset}
  ${c.green}feat${c.reset}      New feature
  ${c.yellow}fix${c.reset}       Bug fix
  ${c.blue}docs${c.reset}      Documentation changes
  ${c.cyan}style${c.reset}     Code style (formatting, semicolons)
  ${c.magenta}refactor${c.reset}  Code refactoring (no feature/fix)
  ${c.dim}chore${c.reset}     Build, tooling, dependencies
  ${c.dim}test${c.reset}      Adding or fixing tests
  ${c.dim}ci${c.reset}        CI/CD changes
  ${c.dim}perf${c.reset}      Performance improvements

${c.bold}EXAMPLES${c.reset}
  ${c.dim}# Auto-detect type and scope from staged changes${c.reset}
  ${c.green}npx @lxgicstudios/ai-commit${c.reset}

  ${c.dim}# Preview without committing${c.reset}
  ${c.green}npx @lxgicstudios/ai-commit --dry-run${c.reset}

  ${c.dim}# Force type and scope${c.reset}
  ${c.green}npx @lxgicstudios/ai-commit --type feat --scope auth${c.reset}

  ${c.dim}# Rewrite last commit message${c.reset}
  ${c.green}npx @lxgicstudios/ai-commit --amend${c.reset}

  ${c.dim}# Breaking change${c.reset}
  ${c.green}npx @lxgicstudios/ai-commit --breaking${c.reset}
`;

// ── Types ──
type CommitType = "feat" | "fix" | "docs" | "style" | "refactor" | "chore" | "test" | "ci" | "perf";

interface Args {
  type?: CommitType;
  scope?: string;
  breaking: boolean;
  dryRun: boolean;
  amend: boolean;
  body?: string;
  json: boolean;
  help: boolean;
}

interface DiffAnalysis {
  files: string[];
  additions: number;
  deletions: number;
  detectedType: CommitType;
  detectedScope: string;
  summary: string;
}

// ── Arg Parsing ──
function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const args: Args = {
    breaking: false,
    dryRun: false,
    amend: false,
    json: false,
    help: false,
  };

  const validTypes = ["feat", "fix", "docs", "style", "refactor", "chore", "test", "ci", "perf"];

  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case "--help":
      case "-h":
        args.help = true;
        break;
      case "--json":
        args.json = true;
        break;
      case "--dry-run":
        args.dryRun = true;
        break;
      case "--amend":
        args.amend = true;
        break;
      case "--breaking":
        args.breaking = true;
        break;
      case "--type":
        {
          const val = argv[++i];
          if (validTypes.includes(val)) args.type = val as CommitType;
          else {
            console.error(`${c.red}Invalid type:${c.reset} ${val}. Use: ${validTypes.join(", ")}`);
            process.exit(1);
          }
        }
        break;
      case "--scope":
        args.scope = argv[++i];
        break;
      case "--body":
        args.body = argv[++i];
        break;
    }
  }
  return args;
}

// ── Git Helpers ──
function git(cmd: string): string {
  try {
    return execSync(`git ${cmd}`, { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim();
  } catch {
    return "";
  }
}

function isGitRepo(): boolean {
  return git("rev-parse --is-inside-work-tree") === "true";
}

function getStagedDiff(): string {
  return git("diff --staged --stat");
}

function getStagedFiles(): string[] {
  const output = git("diff --staged --name-only");
  return output ? output.split("\n").filter(Boolean) : [];
}

function getStagedPatch(): string {
  return git("diff --staged");
}

// ── Scope Detection ──
function detectScope(files: string[]): string {
  if (files.length === 0) return "";

  // Check for common directory patterns
  const dirs = files.map((f) => {
    const parts = f.split("/");
    if (parts.length > 1) return parts[0];
    return "";
  }).filter(Boolean);

  // If all files are in the same directory, use it as scope
  const unique = [...new Set(dirs)];
  if (unique.length === 1) return unique[0];

  // Check for src subdirectories
  const srcDirs = files
    .filter((f) => f.startsWith("src/"))
    .map((f) => {
      const parts = f.split("/");
      return parts.length > 2 ? parts[1] : "";
    })
    .filter(Boolean);

  const uniqueSrc = [...new Set(srcDirs)];
  if (uniqueSrc.length === 1) return uniqueSrc[0];

  // Check file-based scopes
  const scopeMap: Record<string, string> = {
    "package.json": "deps",
    "tsconfig.json": "config",
    ".eslintrc": "lint",
    ".prettierrc": "lint",
    "Dockerfile": "docker",
    "docker-compose": "docker",
    ".github": "ci",
    "README": "docs",
    "CHANGELOG": "docs",
    "LICENSE": "docs",
  };

  for (const file of files) {
    for (const [pattern, scope] of Object.entries(scopeMap)) {
      if (file.includes(pattern)) return scope;
    }
  }

  return "";
}

// ── Type Detection ──
function detectType(files: string[], patch: string): CommitType {
  if (files.length === 0) return "chore";

  // Check file patterns first
  const hasTests = files.some((f) => f.includes("test") || f.includes("spec") || f.includes("__tests__"));
  const hasDocs = files.every((f) => /\.(md|txt|rst|doc)$/i.test(f) || f.includes("docs/"));
  const hasCI = files.every((f) => f.includes(".github/") || f.includes(".gitlab-ci") || f.includes("Jenkinsfile"));
  const hasConfig = files.every((f) =>
    /\.(json|ya?ml|toml|ini|env|config)$/i.test(f) &&
    !f.includes("package.json")
  );

  if (hasDocs) return "docs";
  if (hasCI) return "ci";
  if (hasTests) return "test";
  if (hasConfig) return "chore";

  // Check for package.json dependency changes
  if (files.includes("package.json") && files.length === 1) {
    if (patch.includes('"dependencies"') || patch.includes('"devDependencies"')) {
      return "chore";
    }
  }

  // Analyze the patch content for clues
  const patchLower = patch.toLowerCase();

  // Bug fix indicators
  const fixPatterns = ["fix", "bug", "patch", "resolve", "issue", "error", "crash", "broken"];
  const fixScore = fixPatterns.filter((p) => patchLower.includes(p)).length;

  // Feature indicators
  const featPatterns = ["add", "new", "feature", "implement", "create", "introduce"];
  const featScore = featPatterns.filter((p) => patchLower.includes(p)).length;

  // Refactor indicators
  const refactorPatterns = ["rename", "move", "restructure", "reorganize", "clean", "simplify"];
  const refactorScore = refactorPatterns.filter((p) => patchLower.includes(p)).length;

  // Style indicators
  const stylePatterns = ["format", "whitespace", "indent", "semicolon", "lint"];
  const styleScore = stylePatterns.filter((p) => patchLower.includes(p)).length;

  const scores: [CommitType, number][] = [
    ["fix", fixScore],
    ["feat", featScore],
    ["refactor", refactorScore],
    ["style", styleScore],
  ];

  scores.sort((a, b) => b[1] - a[1]);
  if (scores[0][1] > 0) return scores[0][0];

  // Default: if adding lines, probably a feature; if removing, refactor
  const additions = (patch.match(/^\+[^+]/gm) || []).length;
  const deletions = (patch.match(/^-[^-]/gm) || []).length;

  if (additions > deletions * 2) return "feat";
  if (deletions > additions * 2) return "refactor";

  return "chore";
}

// ── Summary Generation ──
function generateSummary(files: string[], patch: string, type: CommitType): string {
  if (files.length === 0) return "update project";

  // Try to summarize from the actual changes
  const fileNames = files.map((f) => path.basename(f, path.extname(f)));

  // Single file change
  if (files.length === 1) {
    const file = files[0];
    const base = path.basename(file);

    switch (type) {
      case "feat":
        return `add ${base}`;
      case "fix":
        return `fix issue in ${base}`;
      case "docs":
        return `update ${base}`;
      case "style":
        return `format ${base}`;
      case "refactor":
        return `refactor ${base}`;
      case "test":
        return `update tests for ${fileNames[0]}`;
      case "ci":
        return `update ${base} configuration`;
      case "chore":
        return `update ${base}`;
      case "perf":
        return `optimize ${base}`;
    }
  }

  // Multiple files
  const ext = path.extname(files[0]);
  const allSameExt = files.every((f) => path.extname(f) === ext);

  if (allSameExt && ext === ".test.ts" || ext === ".spec.ts") {
    return `update test suite`;
  }

  // Group by directory
  const dirs = [...new Set(files.map((f) => f.split("/")[0]))];
  if (dirs.length === 1) {
    switch (type) {
      case "feat":
        return `add new functionality to ${dirs[0]}`;
      case "fix":
        return `fix issues in ${dirs[0]}`;
      case "refactor":
        return `refactor ${dirs[0]} module`;
      default:
        return `update ${dirs[0]}`;
    }
  }

  // Generic summary
  switch (type) {
    case "feat":
      return `add new features across ${files.length} files`;
    case "fix":
      return `fix issues across ${files.length} files`;
    case "refactor":
      return `refactor ${files.length} files`;
    case "docs":
      return `update documentation`;
    case "chore":
      return `update project configuration`;
    default:
      return `update ${files.length} files`;
  }
}

// ── Analyze Diff ──
function analyzeDiff(): DiffAnalysis {
  const files = getStagedFiles();
  const patch = getStagedPatch();
  const stat = getStagedDiff();

  const additions = (patch.match(/^\+[^+]/gm) || []).length;
  const deletions = (patch.match(/^-[^-]/gm) || []).length;

  const detectedType = detectType(files, patch);
  const detectedScope = detectScope(files);
  const summary = generateSummary(files, patch, detectedType);

  return {
    files,
    additions,
    deletions,
    detectedType,
    detectedScope,
    summary,
  };
}

// ── Build Commit Message ──
function buildMessage(
  type: CommitType,
  scope: string,
  summary: string,
  breaking: boolean,
  body?: string
): string {
  let msg = type;
  if (scope) msg += `(${scope})`;
  if (breaking) msg += "!";
  msg += `: ${summary}`;

  if (body) {
    msg += `\n\n${body}`;
  }

  if (breaking) {
    msg += `\n\nBREAKING CHANGE: ${summary}`;
  }

  return msg;
}

// ── Type Colors ──
function typeColor(type: CommitType): string {
  const colors: Record<CommitType, string> = {
    feat: c.green,
    fix: c.yellow,
    docs: c.blue,
    style: c.cyan,
    refactor: c.magenta,
    chore: c.dim,
    test: c.white,
    ci: c.dim,
    perf: c.red,
  };
  return colors[type] || c.white;
}

// ── Main ──
function main() {
  const args = parseArgs();

  if (args.help) {
    console.log(HELP);
    process.exit(0);
  }

  if (!isGitRepo()) {
    console.error(`${c.red}${c.bold}Error:${c.reset} Not a git repository. Run this from inside a git project.`);
    process.exit(1);
  }

  console.log(BANNER);

  // For amend mode, analyze the last commit
  if (args.amend) {
    const lastMsg = git("log -1 --pretty=%B");
    const lastFiles = git("diff HEAD~1 --name-only").split("\n").filter(Boolean);
    console.log(`${c.yellow}Amend mode:${c.reset} rewriting last commit\n`);
    console.log(`${c.dim}Current message:${c.reset} ${lastMsg.split("\n")[0]}`);

    const patch = git("diff HEAD~1");
    const type = args.type || detectType(lastFiles, patch);
    const scope = args.scope || detectScope(lastFiles);
    const summary = generateSummary(lastFiles, patch, type);
    const message = buildMessage(type, scope, summary, args.breaking, args.body);

    if (args.json) {
      console.log(JSON.stringify({ type, scope, summary, message, files: lastFiles, amend: true }, null, 2));
      process.exit(0);
    }

    console.log(`${c.bold}New message:${c.reset}     ${typeColor(type)}${message}${c.reset}\n`);

    if (args.dryRun) {
      console.log(`${c.yellow}Dry run:${c.reset} no changes made.`);
      process.exit(0);
    }

    try {
      execSync(`git commit --amend -m "${message.replace(/"/g, '\\"')}"`, { stdio: "inherit" });
      console.log(`\n${c.green}${c.bold}Done!${c.reset} Commit amended.`);
    } catch {
      console.error(`${c.red}Failed to amend commit.${c.reset}`);
      process.exit(1);
    }
    process.exit(0);
  }

  // Check for staged changes
  const analysis = analyzeDiff();

  if (analysis.files.length === 0) {
    console.error(`${c.red}No staged changes found.${c.reset} Stage files first:`);
    console.error(`  ${c.dim}git add <files>${c.reset}`);
    console.error(`  ${c.dim}git add -p${c.reset}`);
    process.exit(1);
  }

  const type = args.type || analysis.detectedType;
  const scope = args.scope || analysis.detectedScope;
  const message = buildMessage(type, scope, analysis.summary, args.breaking, args.body);

  // Display analysis
  console.log(`${c.bold}Staged changes:${c.reset}`);
  for (const file of analysis.files) {
    console.log(`  ${c.cyan}+${c.reset} ${file}`);
  }
  console.log(`\n  ${c.green}+${analysis.additions}${c.reset} ${c.red}-${analysis.deletions}${c.reset} across ${analysis.files.length} file(s)\n`);

  console.log(`${c.bold}Detected type:${c.reset}  ${typeColor(type)}${type}${c.reset}`);
  if (scope) console.log(`${c.bold}Detected scope:${c.reset} ${c.cyan}${scope}${c.reset}`);
  console.log(`${c.bold}Commit message:${c.reset} ${typeColor(type)}${message}${c.reset}`);
  console.log("");

  if (args.json) {
    console.log(
      JSON.stringify(
        {
          type,
          scope,
          summary: analysis.summary,
          message,
          breaking: args.breaking,
          files: analysis.files,
          additions: analysis.additions,
          deletions: analysis.deletions,
        },
        null,
        2
      )
    );
    process.exit(0);
  }

  if (args.dryRun) {
    console.log(`${c.yellow}Dry run:${c.reset} message generated but not committed.`);
    console.log(`${c.dim}Run without --dry-run to commit.${c.reset}`);
    process.exit(0);
  }

  // Commit
  try {
    execSync(`git commit -m "${message.replace(/"/g, '\\"')}"`, { stdio: "inherit" });
    console.log(`\n${c.green}${c.bold}Committed!${c.reset} ${typeColor(type)}${message}${c.reset}`);
  } catch {
    console.error(`${c.red}Commit failed.${c.reset}`);
    process.exit(1);
  }
}

main();
