import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { docFrontmatterSchema } from '@dindinho/shared';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoRoot = path.resolve(__dirname, '..', '..');
const docsRoot = path.resolve(repoRoot, 'docs');

async function fileExists(filePath) {
  try {
    const stat = await fs.stat(filePath);
    return stat.isFile();
  } catch {
    return false;
  }
}

async function listMarkdownFiles(dirPath) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const results = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      const sub = await listMarkdownFiles(fullPath);
      results.push(...sub);
      continue;
    }

    if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
      results.push(fullPath);
    }
  }

  return results;
}

function extractFrontmatter(markdown) {
  const normalized = markdown.replaceAll('\r\n', '\n');
  if (!normalized.startsWith('---\n')) return { frontmatter: null, body: markdown };

  const endIndex = normalized.indexOf('\n---\n', 4);
  if (endIndex === -1) return { frontmatter: null, body: markdown };

  const frontmatterRaw = normalized.slice(4, endIndex);
  const body = normalized.slice(endIndex + '\n---\n'.length);

  return { frontmatter: parseFrontmatterYaml(frontmatterRaw), body };
}

function parseInlineArray(value) {
  const inner = value.trim().slice(1, -1);
  if (inner.trim().length === 0) return [];
  return inner
    .split(',')
    .map((v) => v.trim())
    .filter((v) => v.length > 0)
    .map((v) => {
      const unquoted =
        (v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))
          ? v.slice(1, -1)
          : v;
      return unquoted;
    });
}

function parseScalar(value) {
  const trimmed = value.trim();
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) return parseInlineArray(trimmed);
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseFrontmatterYaml(frontmatterRaw) {
  const lines = frontmatterRaw
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const result = {};

  for (const line of lines) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const rawValue = line.slice(idx + 1).trim();
    result[key] = parseScalar(rawValue);
  }

  return result;
}

function extractMarkdownLinks(markdownBody) {
  const normalized = markdownBody.replaceAll('\r\n', '\n');
  const re = /\[[^\]]+\]\(([^)]+)\)/g;
  const links = [];

  for (;;) {
    const match = re.exec(normalized);
    if (!match) break;
    links.push(match[1]);
  }

  return links;
}

function toFsPath(markdownFilePath, href) {
  const clean = href.trim();
  if (clean.length === 0) return null;
  if (clean.startsWith('#')) return null;
  if (clean.startsWith('mailto:')) return null;
  if (clean.includes('://')) return null;
  if (clean.startsWith('javascript:')) return null;

  const withoutQuery = clean.split('?')[0] ?? clean;
  const withoutHash = (withoutQuery.split('#')[0] ?? withoutQuery).trim();
  if (withoutHash.length === 0) return null;

  if (withoutHash.startsWith('/')) {
    return path.resolve(repoRoot, withoutHash.slice(1));
  }

  return path.resolve(path.dirname(markdownFilePath), withoutHash);
}

async function main() {
  const markdownFiles = await listMarkdownFiles(docsRoot);
  const errors = [];

  for (const filePath of markdownFiles) {
    const rel = path.relative(repoRoot, filePath);
    const content = await fs.readFile(filePath, 'utf8');
    const { frontmatter, body } = extractFrontmatter(content);

    if (!frontmatter) {
      errors.push(`${rel}: frontmatter ausente`);
    } else {
      const parsed = docFrontmatterSchema.safeParse(frontmatter);
      if (!parsed.success) {
        errors.push(`${rel}: frontmatter inválido (${parsed.error.issues.length} issues)`);
      }
    }

    const links = extractMarkdownLinks(body);
    for (const href of links) {
      const resolved = toFsPath(filePath, href);
      if (!resolved) continue;
      const ok = await fileExists(resolved);
      if (!ok) {
        errors.push(`${rel}: link quebrado -> ${href}`);
      }
    }
  }

  if (errors.length > 0) {
    process.stderr.write(`docs:check falhou (${errors.length} problemas)\n`);
    for (const err of errors) {
      process.stderr.write(`- ${err}\n`);
    }
    process.exit(1);
  }

  process.stdout.write(`docs:check ok (${markdownFiles.length} arquivos)\n`);
}

await main();
