import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('..', import.meta.url));
const runtimeRoot = 'src';
const blockedPatterns = [
  { expression: /(?:from\s+|import\s*)['"]node:/u, reason: 'Node built-in import' },
  {
    expression: /(?:from\s+|import\s*)['"](?:fs|child_process)(?:\/|['"])/u,
    reason: 'host-system import'
  },
  {
    expression:
      /(?:import\s*\(|require\s*\()\s*['"](?:node:|fs(?:\/|['"])|child_process(?:\/|['"]))/u,
    reason: 'dynamic host-system import'
  },
  {
    expression: /(?:from\s+|import\s*)['"](?:execa|shelljs)(?:\/|['"])/u,
    reason: 'command-execution package'
  },
  {
    expression: /(?:import\s*\(|require\s*\()\s*['"](?:execa|shelljs)(?:\/|['"])/u,
    reason: 'dynamic command-execution package import'
  },
  { expression: /\b(?:eval|Function)\s*\(/u, reason: 'dynamic code execution' },
  { expression: /\bfetch\s*\(/u, reason: 'network request' },
  { expression: /\b(?:XMLHttpRequest|WebSocket|EventSource)\b/u, reason: 'network connection' },
  { expression: /<iframe\b/iu, reason: 'iframe navigation surface' },
  {
    expression: /document\.createElement\s*\(\s*['"](?:iframe|script)['"]\s*\)/u,
    reason: 'dynamic navigation or script surface'
  },
  { expression: /<form\b[^>]*\baction\s*=/iu, reason: 'real form navigation' },
  { expression: /<a\b[^>]*\bhref\s*=/iu, reason: 'real anchor navigation' },
  { expression: /\bwindow\.open\s*\(/u, reason: 'external navigation' },
  { expression: /\blocation\.(?:assign|replace)\s*\(/u, reason: 'external navigation' },
  {
    expression: /\b(?:window\.)?location(?:\.href)?\s*=/u,
    reason: 'external navigation'
  }
];

const violations = [];

const absoluteRoot = join(repositoryRoot, runtimeRoot);
for (const filePath of await walk(absoluteRoot)) {
  if (!['.ts', '.tsx'].includes(extname(filePath)) || isTestModule(filePath)) {
    continue;
  }

  const source = await readFile(filePath, 'utf8');
  for (const blocked of blockedPatterns) {
    if (blocked.expression.test(source)) {
      violations.push(`${relative(repositoryRoot, filePath)}: ${blocked.reason}`);
    }
  }
}

if (violations.length > 0) {
  console.error('Runtime-boundary guard failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exitCode = 1;
} else {
  console.log('Runtime-boundary guard passed.');
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(path)));
    } else {
      files.push(path);
    }
  }

  return files;
}

function isTestModule(filePath) {
  return /\.(?:test|spec)\.tsx?$/u.test(filePath);
}
