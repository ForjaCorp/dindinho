import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

/** Informações básicas da especificação OpenAPI */
export interface OpenApiInfo {
  /** Título da API */
  title: string;
  /** Versão da API */
  version: string;
}

/** Representa uma tag OpenAPI */
export interface OpenApiTag {
  /** Nome da tag */
  name: string;
  /** Descrição opcional da tag */
  description?: string;
}

/** Representa uma operação individual no OpenAPI */
export interface OpenApiOperation {
  /** Resumo curto da operação */
  summary?: string;
  /** Descrição detalhada */
  description?: string;
  /** Identificador único */
  operationId?: string;
  /** Lista de tags associadas */
  tags?: string[];
}

/** Representa o documento OpenAPI completo */
export interface OpenApiDocument {
  /** Versão da especificação */
  openapi: string;
  /** Metadados da API */
  info: OpenApiInfo;
  /** Lista de tags */
  tags?: OpenApiTag[];
  /** Mapeamento de caminhos e métodos para operações */
  paths: Record<string, Record<string, OpenApiOperation>>;
}

/**
 * Serviço para leitura de documentos do portal a partir de assets estáticos ou da API.
 */
@Injectable({
  providedIn: 'root',
})
export class DocsService {
  private readonly http = inject(HttpClient);

  /** URL do asset local com a especificação OpenAPI empacotada */
  private readonly bundledOpenApiJsonUrl = '/assets/docs/30-api/openapi.json';

  /** Mapeamento centralizado de Slugs <-> Caminhos de Arquivos */
  private static readonly DOCS_MAPPING: Record<
    'admin' | 'user',
    Record<string, { path: string; slug: string }>
  > = {
    admin: {
      intro: { path: 'admin/intro.md', slug: 'intro' },
      architecture: { path: '20-arquitetura/intro.md', slug: 'architecture' },
      naming: { path: '20-arquitetura/convencoes-nomenclatura.md', slug: 'naming' },
      tests: { path: '20-arquitetura/estrategia-testes.md', slug: 'tests' },
      adr: { path: '20-arquitetura/adr/intro.md', slug: 'adr' },
      'adr-0001': { path: '20-arquitetura/adr/0001-uso-signals.md', slug: 'adr-0001' },
      'adr-0002': { path: '20-arquitetura/adr/0002-monorepo-zod-schemas.md', slug: 'adr-0002' },
      'adr-0003': { path: '20-arquitetura/adr/0003-docs-as-code.md', slug: 'adr-0003' },
      'adr-0004': {
        path: '20-arquitetura/adr/0004-padronizacao-nomenclatura-commits.md',
        slug: 'adr-0004',
      },
      'adr-0005': {
        path: '20-arquitetura/adr/0005-estratégia-parcelamento-explosão.md',
        slug: 'adr-0005',
      },
      'adr-0006': {
        path: '20-arquitetura/adr/0006-sincronização-estado-url.md',
        slug: 'adr-0006',
      },
      'adr-0007': {
        path: '20-arquitetura/adr/0007-componentes-standalone.md',
        slug: 'adr-0007',
      },
      'adr-0008': {
        path: '20-arquitetura/adr/0008-estratégia-testes-data-testid.md',
        slug: 'adr-0008',
      },
      'adr-0009': {
        path: '20-arquitetura/adr/0009-animações-nativas-css.md',
        slug: 'adr-0009',
      },
      'adr-0010': {
        path: '20-arquitetura/adr/0010-modelagem-tabela-extensão.md',
        slug: 'adr-0010',
      },
      'adr-0011': {
        path: '20-arquitetura/adr/0011-autenticação-jwt-refresh-token.md',
        slug: 'adr-0011',
      },
      'adr-0012': {
        path: '20-arquitetura/adr/0012-infraestrutura-docker-coolify.md',
        slug: 'adr-0012',
      },
      roadmap: { path: '90-planejamento/roadmap-evolucao.md', slug: 'roadmap' },
      'test-plan-e2e': {
        path: '90-planejamento/em-discussao/plano-testes-e2e.md',
        slug: 'test-plan-e2e',
      },
      'plano-testes': {
        path: '90-planejamento/em-discussao/plano-testes-e2e.md',
        slug: 'plano-testes',
      },
      'evolucao-rotas': {
        path: '90-planejamento/em-discussao/evolucao-rotas.md',
        slug: 'evolucao-rotas',
      },
      'planejamento-metas': {
        path: '90-planejamento/em-discussao/planejamento-metas.md',
        slug: 'planejamento-metas',
      },
      'sistema-convites': {
        path: '90-planejamento/em-discussao/sistema-convites.md',
        slug: 'sistema-convites',
      },
      'plan-routing': {
        path: '90-planejamento/em-discussao/evolucao-rotas.md',
        slug: 'plan-routing',
      },
      'plan-accounts': {
        path: '90-planejamento/concluido/filtro-contas.md',
        slug: 'plan-accounts',
      },
      'plan-notifications': {
        path: '90-planejamento/em-discussao/notificacoes.md',
        slug: 'plan-notifications',
      },
      'plan-goals': {
        path: '90-planejamento/em-discussao/planejamento-metas.md',
        slug: 'plan-goals',
      },
      'plan-url-sync': {
        path: '90-planejamento/concluido/sincronizacao-url.md',
        slug: 'plan-url-sync',
      },
      'plan-invites': {
        path: '90-planejamento/em-discussao/sistema-convites.md',
        slug: 'plan-invites',
      },
      'plan-time-filter': {
        path: '90-planejamento/concluido/filtro-temporal.md',
        slug: 'plan-time-filter',
      },
      'plan-documentation': {
        path: '90-planejamento/concluido/plano-documentacao.md',
        slug: 'plan-documentation',
      },
      'fix-docs-access': {
        path: '90-planejamento/concluido/acesso-docs.md',
        slug: 'fix-docs-access',
      },
      deploy: { path: '50-operacoes/deploy.md', slug: 'deploy' },
      ops: { path: '50-operacoes/guia-operacoes.md', slug: 'ops' },
      reports: { path: '40-plataformas/pwa/relatorios.md', slug: 'reports' },
      auth: { path: '30-api/autenticacao-tecnica.md', slug: 'auth' },
      'dominio-contas': { path: '10-produto/contas/regras-negocio.md', slug: 'dominio-contas' },
      'dominio-auth': { path: '10-produto/autenticacao/regras-negocio.md', slug: 'dominio-auth' },
      'dominio-transacoes': {
        path: '10-produto/transacoes/regras-negocio.md',
        slug: 'dominio-transacoes',
      },
      'dominio-relatorios': {
        path: '10-produto/relatorios/regras-negocio.md',
        slug: 'dominio-relatorios',
      },
      'dominio-colaboracao': {
        path: '10-produto/colaboracao/regras-negocio.md',
        slug: 'dominio-colaboracao',
      },
      'dominio-metas': { path: '10-produto/metas/regras-negocio.md', slug: 'dominio-metas' },
      'frontend-standards': {
        path: '20-arquitetura/padroes-frontend.md',
        slug: 'frontend-standards',
      },
      'backend-standards': {
        path: '20-arquitetura/padroes-backend.md',
        slug: 'backend-standards',
      },
      'guia-documentacao': { path: 'admin/guia-documentacao.md', slug: 'guia-documentacao' },
      'guia-contribuicao': { path: 'admin/contribuicao.md', slug: 'guia-contribuicao' },
      principios: { path: '00-geral/principios.md', slug: 'principios' },
      'codigo-conduta': { path: '00-geral/codigo-conduta.md', slug: 'codigo-conduta' },
      'product-intro': { path: '00-geral/intro.md', slug: 'product-intro' },
      logs: { path: '50-operacoes/logs-e-monitoramento.md', slug: 'logs' },
    },
    user: {
      intro: { path: 'user/intro.md', slug: 'intro' },
      'product-intro': { path: '00-geral/intro.md', slug: 'product-intro' },
      principles: { path: '00-geral/principios.md', slug: 'principles' },
      faq: { path: '00-geral/faq.md', slug: 'faq' },
      principios: { path: '00-geral/principios.md', slug: 'principios' },
      'codigo-conduta': { path: '00-geral/codigo-conduta.md', slug: 'codigo-conduta' },
      'dominio-contas': { path: '10-produto/contas/guia-usuario.md', slug: 'dominio-contas' },
      'dominio-auth': { path: '10-produto/autenticacao/guia-usuario.md', slug: 'dominio-auth' },
      'dominio-transacoes': {
        path: '10-produto/transacoes/guia-usuario.md',
        slug: 'dominio-transacoes',
      },
      'dominio-relatorios': {
        path: '10-produto/relatorios/guia-usuario.md',
        slug: 'dominio-relatorios',
      },
      'dominio-colaboracao': {
        path: '10-produto/colaboracao/guia-usuario.md',
        slug: 'dominio-colaboracao',
      },
      'dominio-metas': { path: '10-produto/metas/guia-usuario.md', slug: 'dominio-metas' },
    },
  };

  /**
   * Resolve o caminho do arquivo Markdown a partir de um contexto e slug.
   *
   * @param context - Contexto ('admin' | 'user')
   * @param slug - Slug amigável
   * @returns Caminho do arquivo ou null
   */
  resolvePathFromSlug(context: 'admin' | 'user', slug: string): string | null {
    return DocsService.DOCS_MAPPING[context]?.[slug]?.path ?? null;
  }

  /**
   * Resolve o slug a partir de um contexto e caminho de arquivo.
   *
   * @param context - Contexto ('admin' | 'user')
   * @param path - Caminho do arquivo
   * @returns Slug amigável ou null
   */
  resolveSlugFromPath(context: 'admin' | 'user', path: string): string | null {
    const mapping = DocsService.DOCS_MAPPING[context];
    if (!mapping) return null;

    const entry = Object.values(mapping).find((m) => m.path === path);
    return entry?.slug ?? null;
  }

  /**
   * Carrega um arquivo do diretório `docs/` empacotado como asset.
   * Suporta arquivos Markdown (.md) e JSON (.json).
   *
   * @param relativePath - Caminho relativo do arquivo dentro de assets/docs/
   * @returns Observable com o conteúdo (string para MD, objeto para JSON)
   */
  getFile(relativePath: string): Observable<string | OpenApiDocument> {
    const normalizedPath = this.normalizeRelativeDocPath(relativePath);
    if (!normalizedPath) {
      return throwError(() => new Error('Caminho de docs inválido'));
    }

    if (normalizedPath.endsWith('.json')) {
      return this.http.get<OpenApiDocument>(`/assets/docs/${normalizedPath}`);
    }

    return this.http.get(`/assets/docs/${normalizedPath}`, {
      responseType: 'text',
    });
  }

  /**
   * Obtém a especificação OpenAPI atualizada.
   * Tenta carregar do backend primeiro e faz fallback para o asset local.
   *
   * @returns Observable com o documento OpenAPI
   */
  getOpenApi(): Observable<OpenApiDocument> {
    // Tenta carregar da API real primeiro, senão cai para o asset estático
    return this.http
      .get<OpenApiDocument>(this.getOpenApiJsonUrl())
      .pipe(catchError(() => this.http.get<OpenApiDocument>(this.bundledOpenApiJsonUrl)));
  }

  /**
   * Retorna a URL do endpoint que serve o JSON da especificação OpenAPI.
   * @returns URL absoluta do JSON OpenAPI
   */
  getOpenApiJsonUrl(): string {
    const base = this.getApiBaseUrl();
    return `${base}/docs/json`;
  }

  /**
   * Retorna a URL da interface interativa Swagger UI.
   * @returns URL absoluta do Swagger UI
   */
  getSwaggerUiUrl(): string {
    const base = this.getApiBaseUrl();
    return `${base}/docs`;
  }

  /**
   * Constrói a URL direta para um documento bruto.
   * @param relativePath - Caminho relativo do documento
   * @returns URL do asset ou null se o caminho for inválido
   */
  getRawDocUrl(relativePath: string): string | null {
    const normalizedPath = this.normalizeRelativeDocPath(relativePath);
    if (!normalizedPath) return null;
    return `/assets/docs/${normalizedPath}`;
  }

  /**
   * Obtém a URL base da API a partir das configurações de ambiente.
   * @returns URL base normalizada
   */
  private getApiBaseUrl(): string {
    const url = environment.apiUrl;
    return url.endsWith('/') ? url.slice(0, -1) : url;
  }

  /**
   * Normaliza e valida um caminho de documento para evitar ataques de traversal
   * e garantir extensões permitidas.
   *
   * @param input - Caminho bruto de entrada
   * @returns Caminho normalizado ou null se for inválido/inseguro
   */
  private normalizeRelativeDocPath(input: string): string | null {
    const raw = input.trim().replaceAll('\\', '/');
    const withoutLeadingSlash = raw.startsWith('/') ? raw.slice(1) : raw;

    if (withoutLeadingSlash.length === 0) return null;
    if (withoutLeadingSlash.includes('..')) return null;
    if (!withoutLeadingSlash.endsWith('.md') && !withoutLeadingSlash.endsWith('.json')) return null;

    const safePath = withoutLeadingSlash
      .split('/')
      .filter((segment) => segment.length > 0)
      .join('/');

    if (safePath.length === 0) return null;
    return safePath;
  }
}
