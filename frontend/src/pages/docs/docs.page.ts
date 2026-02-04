import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Params } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { MarkdownComponent } from 'ngx-markdown';
import { DocsService, OpenApiDocument, OpenApiOperation } from '../../app/services/docs.service';

/**
 * Interface para os parâmetros de rota do DocsPage.
 */
interface DocsRouteParams extends Params {
  slug?: string;
}

/**
 * Interface para os query parameters do DocsPage.
 */
interface DocsQueryParams extends Params {
  path?: string;
}

/**
 * Interface que representa um endpoint individual na visualização OpenAPI.
 */
interface OpenApiEndpointItem {
  /** Método HTTP (GET, POST, etc) */
  method: string;
  /** Caminho do endpoint */
  path: string;
  /** Resumo da operação */
  summary: string;
  /** Identificador único da operação */
  operationId: string;
}

/**
 * Página do portal de documentação.
 *
 * Responsável por renderizar documentos Markdown e a especificação OpenAPI.
 * Suporta roteamento baseado em slugs amigáveis e fallback para caminhos de arquivos.
 */
@Component({
  selector: 'app-docs-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MarkdownComponent],
  template: `
    <div data-testid="docs-page" class="bg-white max-w-4xl mx-auto pt-2 pb-10 px-4 sm:px-0">
      @if (isSwaggerSlug()) {
        <div data-testid="docs-swagger-redirect" class="py-20 text-center">
          <div
            class="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6"
          >
            <i class="pi pi-external-link text-3xl"></i>
          </div>
          <h2 class="text-2xl font-bold text-slate-900 mb-2">Swagger UI</h2>
          <p class="text-slate-500 mb-8 max-w-md mx-auto">
            A interface interativa do Swagger permite testar os endpoints da API diretamente do
            navegador.
          </p>
          <a
            [href]="swaggerUrl()"
            target="_blank"
            class="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
            aria-label="Abrir documentação interativa Swagger em nova aba"
          >
            Abrir Swagger UI <i class="pi pi-arrow-right"></i>
          </a>
        </div>
      } @else {
        <div class="mb-8" [attr.aria-busy]="isLoading()">
          @if (isLoading()) {
            <!-- Skeleton para Título e Descrição -->
            <div class="animate-pulse space-y-4">
              <div class="h-9 bg-slate-200 rounded-lg w-3/4"></div>
              <div class="space-y-2">
                <div class="h-5 bg-slate-100 rounded w-full"></div>
                <div class="h-5 bg-slate-100 rounded w-5/6"></div>
              </div>
              <div class="flex gap-2 pt-2">
                <div class="h-5 bg-slate-100 rounded-md w-16"></div>
                <div class="h-5 bg-slate-100 rounded-md w-20"></div>
              </div>
            </div>
          } @else if (shouldShowExternalHeader()) {
            <h1 class="text-3xl font-bold text-slate-900 tracking-tight">{{ title() }}</h1>
            @if (description()) {
              <p class="mt-2 text-lg text-slate-500">{{ description() }}</p>
            }
            @if (tags().length > 0) {
              <div class="mt-4 flex flex-wrap gap-2">
                @for (tag of tags(); track trackByTag($index, tag)) {
                  <span
                    class="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider"
                  >
                    {{ tag }}
                  </span>
                }
              </div>
            }
          }
        </div>

        <div class="relative" [attr.aria-busy]="isLoading()">
          @if (isLoading()) {
            <!-- Skeleton para Conteúdo Principal -->
            <div
              data-testid="docs-loading"
              class="animate-pulse space-y-6 py-4"
              aria-busy="true"
              aria-label="Carregando conteúdo"
            >
              <div class="space-y-3">
                <div class="h-4 bg-slate-100 rounded w-full"></div>
                <div class="h-4 bg-slate-100 rounded w-full"></div>
                <div class="h-4 bg-slate-100 rounded w-3/4"></div>
              </div>

              <div class="h-40 bg-slate-50 rounded-2xl border border-slate-100 w-full"></div>

              <div class="space-y-3 pt-4">
                <div class="h-4 bg-slate-100 rounded w-full"></div>
                <div class="h-4 bg-slate-100 rounded w-5/6"></div>
                <div class="h-4 bg-slate-100 rounded w-full"></div>
                <div class="h-4 bg-slate-100 rounded w-2/3"></div>
              </div>

              <div class="grid grid-cols-2 gap-4 pt-4">
                <div class="h-24 bg-slate-50 rounded-xl border border-slate-100"></div>
                <div class="h-24 bg-slate-50 rounded-xl border border-slate-100"></div>
              </div>
            </div>
          } @else if (error()) {
            <div
              data-testid="docs-error"
              class="p-6 rounded-2xl bg-red-50 border border-red-100 text-red-800"
              role="alert"
            >
              <div class="flex items-center gap-3 mb-2">
                <i class="pi pi-exclamation-circle text-xl"></i>
                <h3 class="font-bold">Erro ao carregar documento</h3>
              </div>
              <p class="text-sm">{{ error() }}</p>
            </div>
          } @else if (isOpenApi()) {
            @if (openApiDoc()) {
              <div
                data-testid="docs-openapi"
                class="space-y-8"
                role="article"
                aria-label="Referência da API"
              >
                @for (group of openApiGroups(); track group.tag) {
                  <section class="space-y-4" [attr.aria-labelledby]="'group-' + group.tag">
                    <h2
                      [id]="'group-' + group.tag"
                      class="text-xl font-bold text-slate-800 border-b border-slate-100 pb-2"
                    >
                      {{ group.tag }}
                    </h2>
                    @if (group.description) {
                      <p class="text-sm text-slate-500">{{ group.description }}</p>
                    }

                    <div class="grid gap-3" role="list">
                      @for (item of group.items; track item.operationId) {
                        <div
                          class="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                          role="listitem"
                        >
                          <div class="flex items-start justify-between gap-4">
                            <div class="min-w-0">
                              <div class="flex items-center gap-2 mb-1">
                                <span
                                  [class]="
                                    'px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ' +
                                    getMethodClass(item.method)
                                  "
                                >
                                  {{ item.method }}
                                </span>
                                <span class="text-xs font-mono text-slate-500">{{
                                  item.path
                                }}</span>
                              </div>
                              <div class="text-sm font-semibold text-slate-800">
                                {{ item.summary }}
                              </div>
                            </div>
                            <span class="text-[10px] font-mono text-slate-400 shrink-0">
                              {{ item.operationId }}
                            </span>
                          </div>
                        </div>
                      }
                    </div>
                  </section>
                }
              </div>
            }
          } @else {
            <article
              data-testid="docs-markdown"
              class="prose prose-slate max-w-none prose-headings:font-bold prose-h1:text-3xl prose-pre:bg-slate-900 prose-pre:text-slate-50"
              aria-label="Conteúdo do documento"
            >
              <markdown [data]="markdown()"></markdown>
            </article>
          }
        </div>
      }
    </div>
  `,
})
export class DocsPage {
  private readonly route = inject(ActivatedRoute);
  private readonly docs = inject(DocsService);

  private readonly OPENAPI_PATH = '__openapi__';

  /** Signals de rota para reagir a mudanças de URL */
  private readonly params = toSignal(this.route.params, { initialValue: {} as DocsRouteParams });
  private readonly queryParams = toSignal(this.route.queryParams, {
    initialValue: {} as DocsQueryParams,
  });

  /** Caminho do arquivo selecionado para exibição */
  protected readonly selectedPath = signal<string>('');
  /** Slug amigável da rota atual */
  protected readonly slug = signal<string | null>(null);
  /** Conteúdo Markdown processado (sem frontmatter) */
  protected readonly markdown = signal<string>('');
  /** Título do documento extraído do frontmatter ou valor padrão */
  protected readonly title = signal<string>('');
  /** Descrição do documento extraída do frontmatter */
  protected readonly description = signal<string>('');
  /** Tags associadas ao documento */
  protected readonly tags = signal<string[]>([]);

  /** Tracking function para as tags */
  protected trackByTag(_index: number, tag: string): string {
    return tag;
  }
  /** Documento OpenAPI carregado */
  protected readonly openApiDoc = signal<OpenApiDocument | null>(null);
  /** Indica se o conteúdo está sendo carregado */
  protected readonly isLoading = signal<boolean>(false);
  /** Mensagem de erro caso o carregamento falhe */
  protected readonly error = signal<string | null>(null);

  /** Indica se o documento atual é uma especificação OpenAPI */
  protected readonly isOpenApi = computed(() => this.selectedPath() === this.OPENAPI_PATH);
  /** Indica se a rota atual deve exibir o redirecionamento para o Swagger UI */
  protected readonly isSwaggerSlug = computed(() => this.slug() === 'swagger');
  /** URL do Swagger UI fornecida pelo serviço de documentação */
  protected readonly swaggerUrl = signal<string>(this.docs.getSwaggerUiUrl());

  /** Indica se o cabeçalho externo (título/descrição) deve ser exibido */
  protected readonly shouldShowExternalHeader = computed(() => {
    // Não mostra cabeçalho se houver conteúdo markdown (o markdown já tem seu H1)
    if (this.markdown()) return false;
    // Mostra apenas para OpenAPI ou Erros
    return this.isOpenApi() || !!this.error();
  });

  /** Agrupa os endpoints OpenAPI por tags para exibição organizada */
  protected readonly openApiGroups = computed(() => {
    const doc = this.openApiDoc();
    if (!doc) return [] as { tag: string; description?: string; items: OpenApiEndpointItem[] }[];

    const tagDescriptions = new Map<string, string | undefined>();
    for (const tag of doc.tags ?? []) {
      tagDescriptions.set(tag.name, tag.description);
    }

    const groups = new Map<string, OpenApiEndpointItem[]>();

    for (const [path, methodMap] of Object.entries(doc.paths ?? {})) {
      for (const [methodRaw, operation] of Object.entries(methodMap ?? {})) {
        const method = methodRaw.toUpperCase();
        const op = operation as OpenApiOperation;

        const tags = Array.isArray(op.tags) && op.tags.length > 0 ? op.tags : ['untagged'];
        const summary =
          typeof op.summary === 'string' && op.summary.length > 0 ? op.summary : '(sem summary)';
        const operationId =
          typeof op.operationId === 'string' && op.operationId.length > 0
            ? op.operationId
            : `${method}:${path}`;

        for (const tag of tags) {
          const list = groups.get(tag) ?? [];
          list.push({ method, path, summary, operationId });
          groups.set(tag, list);
        }
      }
    }

    return Array.from(groups.entries())
      .map(([tag, items]) => ({
        tag,
        description: tagDescriptions.get(tag),
        items: items.sort((a, b) => (a.path + a.method).localeCompare(b.path + b.method)),
      }))
      .sort((a, b) => a.tag.localeCompare(b.tag));
  });

  constructor() {
    // Escuta mudanças no slug ou no queryParam 'path'
    effect(() => {
      const params = this.params();
      const queryParams = this.queryParams();
      const routeData = this.route.snapshot.data;

      const slugValue = params?.['slug'];
      const queryPath = queryParams?.['path'];
      const context = routeData?.['context'];

      this.slug.set(slugValue || null);

      // Determina o caminho final (slug tem prioridade para a nova estrutura)
      let finalPath = '';

      if (slugValue) {
        finalPath = this.mapSlugToPath(slugValue, context);
      } else if (queryPath) {
        finalPath = queryPath;
      } else {
        // Fallback para a introdução se nada for informado
        finalPath = context === 'admin' ? 'admin/intro.md' : '00-overview/intro.md';
      }

      this.selectedPath.set(finalPath);
    });

    effect((onCleanup) => {
      const path = this.selectedPath();
      if (!path) return;

      this.isLoading.set(true);
      this.error.set(null);

      const sub = (
        path === this.OPENAPI_PATH ? this.docs.getOpenApi() : this.docs.getFile(path)
      ).subscribe({
        next: (content) => {
          if (typeof content === 'string') {
            this.parseMarkdown(content);
            this.openApiDoc.set(null);
          } else {
            this.markdown.set('');
            this.openApiDoc.set(content);
            this.title.set('API Reference');
            this.description.set('Especificação completa dos endpoints do Dindinho.');
            this.tags.set(['REST', 'OpenAPI', 'v1']);
          }
          this.isLoading.set(false);
        },
        error: (_err) => {
          this.markdown.set('');
          this.error.set(`Não foi possível carregar o documento: ${path}`);
          this.title.set('Erro de Carregamento');
          this.description.set('');
          this.tags.set([]);
          this.isLoading.set(false);
        },
      });

      onCleanup(() => sub.unsubscribe());
    });
  }

  /**
   * Mapeia um slug amigável da URL para o caminho real do arquivo na pasta de assets.
   * @param slug - O identificador amigável da rota
   * @param context - O contexto da rota (ex: 'admin')
   * @returns O caminho relativo do arquivo .md ou constante especial
   */
  private mapSlugToPath(slug: string, context?: string): string {
    // Mapeamento para Contexto Admin (Informações Técnicas/Internas)
    const adminMapping: Record<string, string> = {
      intro: 'admin/intro.md',
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
      openapi: this.OPENAPI_PATH,
      'api-ref': this.OPENAPI_PATH,
      deploy: '50-ops/deploy.md',
      ops: '50-ops/guia-operacoes.md',
      reports: '40-clients/pwa/reports-frontend.md',
      auth: '30-api/authentication.md',
    };

    // Mapeamento para Contexto User (Guia do Usuário/Amigável)
    const userMapping: Record<string, string> = {
      intro: '00-overview/intro.md',
      principles: '00-overview/principles.md',
      faq: '00-overview/faq.md',
      'dominio-contas': '10-product/dominio-contas.md',
      'dominio-auth': '10-product/dominio-auth.md',
      'dominio-transacoes': '10-product/dominio-transacoes.md',
      'dominio-relatorios': '10-product/dominio-relatorios.md',
      'dominio-colaboracao': '10-product/dominio-colaboracao.md',
      'dominio-metas': '10-product/dominio-metas.md',
    };

    if (context === 'admin') {
      return adminMapping[slug] || slug;
    }

    return userMapping[slug] || slug;
  }

  /**
   * Realiza o parsing manual de metadados (frontmatter) no início de arquivos Markdown.
   * Extrai título, descrição e tags.
   * @param content - Conteúdo bruto do arquivo Markdown
   */
  private parseMarkdown(content: string): void {
    // Parse manual ultra-simples de frontmatter (apenas para exibição)
    if (content.startsWith('---')) {
      const endIdx = content.indexOf('---', 3);
      if (endIdx !== -1) {
        const frontmatter = content.slice(3, endIdx);
        const body = content.slice(endIdx + 3).trim();

        // Extrair campos básicos
        const titleMatch = frontmatter.match(/title:\s*["']?([^"'\n]+)["']?/);
        const descMatch = frontmatter.match(/description:\s*["']?([^"'\n]+)["']?/);
        const tagsMatch = frontmatter.match(/tags:\s*\[([^\]]+)\]/);

        this.title.set(titleMatch ? titleMatch[1] : 'Documento');
        this.description.set(descMatch ? descMatch[1] : '');
        this.tags.set(
          tagsMatch ? tagsMatch[1].split(',').map((t) => t.trim().replace(/['"]/g, '')) : [],
        );
        this.markdown.set(body);
        return;
      }
    }

    this.title.set('Documento');
    this.description.set('');
    this.tags.set([]);
    this.markdown.set(content);
  }

  /**
   * Retorna classes de estilo Tailwind baseadas no método HTTP.
   * @param method - O método HTTP (GET, POST, etc)
   * @returns String com classes CSS para estilização
   */
  protected getMethodClass(method: string): string {
    const classes: Record<string, string> = {
      GET: 'bg-blue-100 text-blue-700',
      POST: 'bg-emerald-100 text-emerald-700',
      PUT: 'bg-amber-100 text-amber-700',
      DELETE: 'bg-red-100 text-red-700',
      PATCH: 'bg-purple-100 text-purple-700',
    };
    return classes[method] || 'bg-slate-100 text-slate-700';
  }
}
