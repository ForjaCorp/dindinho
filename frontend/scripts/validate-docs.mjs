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

async function toFsPath(markdownFilePath, href) {
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
    // Links que começam com / são relativos à raiz do repositório
    // Mas na documentação, links com / são tratados como slugs amigáveis (ex: /docs/dominio-metas)
    // No script de validação, vamos tentar resolver esses links para os caminhos físicos mapeados
    const slug = withoutHash.replace(/^\/docs\//, '').replace(/^\/docs/, '');

    // Caso especial para slugs que não têm arquivo físico correspondente
    if (slug === 'openapi' || slug === 'api-ref' || slug === 'swagger') {
      return 'SPECIAL_SLUG';
    }

    const mappedPath = findPathBySlug(slug);
    if (mappedPath) {
      return path.resolve(repoRoot, 'docs', mappedPath);
    }
    return path.resolve(repoRoot, withoutHash.slice(1));
  }

  // Links relativos ao arquivo atual
  return path.resolve(path.dirname(markdownFilePath), withoutHash);
}

/**
 * Mapeamento de slugs para caminhos físicos (espelhando docs.page.ts)
 */
function findPathBySlug(slug) {
  const mapping = {
    intro: 'user/intro.md',
    principles: '00-overview/principles.md',
    faq: '00-overview/faq.md',
    'dominio-contas': 'user/dominios/contas.md',
    'dominio-auth': 'user/dominios/auth.md',
    'dominio-transacoes': 'user/dominios/transacoes.md',
    'dominio-relatorios': 'user/dominios/relatorios.md',
    'dominio-colaboracao': 'user/dominios/colaboracao.md',
    'dominio-metas': 'user/dominios/metas.md',
    architecture: '20-architecture/intro.md',
    adr: '21-adr/intro.md',
    roadmap: '90-backlog/planning/evolucao-roadmap.md',
    'test-plan-e2e': '90-backlog/planning/test-plan-e2e.md',
    'plan-routing': '90-backlog/planning/ROUTING_EVOLUTION_PLAN.md',
    'plan-accounts': '90-backlog/planning/account-filter.md',
    'plan-notifications': '90-backlog/planning/notificacoes.md',
    'plan-goals': '90-backlog/planning/planejamento-metas.md',
    'plan-url-sync': '90-backlog/planning/refactor-url-sync.md',
    'plan-invites': '90-backlog/planning/sistema-convites.md',
    'plan-time-filter': '90-backlog/planning/time-filter.md',
    'plan-documentation': '90-backlog/planning/documentation.md',
    'fix-docs-access': '90-backlog/planning/fix-docs-access-experience.md',
    deploy: '50-ops/deploy.md',
    ops: '50-ops/guia-operacoes.md',
    reports: '40-clients/pwa/reports-frontend.md',
    auth: '30-api/authentication.md',
  };
  return mapping[slug] || null;
}

async function checkLink(resolved) {
  if (resolved === 'SPECIAL_SLUG') return true;
  if (typeof resolved !== 'string') return false;

  // Tenta o caminho exato
  if (await fileExists(resolved)) return true;

  // Se não tem extensão, tenta adicionar .md ou procurar index.md (padrão de documentação)
  if (!path.extname(resolved)) {
    if (await fileExists(resolved + '.md')) return true;
    if (await fileExists(path.join(resolved, 'index.md'))) return true;
  }

  return false;
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
        const issues = parsed.error.issues
          .map((i) => `${i.path.join('.')}: ${i.message}`)
          .join(', ');
        errors.push(`${rel}: frontmatter inválido (${issues})`);
      }
    }

    const links = extractMarkdownLinks(body);
    for (const href of links) {
      const resolved = await toFsPath(filePath, href);
      if (!resolved) continue;
      const ok = await checkLink(resolved);
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
