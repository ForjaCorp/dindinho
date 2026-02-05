import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { CommonModule, ViewportScroller } from '@angular/common';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { MarkdownComponent } from 'ngx-markdown';
import { DocsService, OpenApiDocument, OpenApiOperation } from '../../app/services/docs.service';
import { BaseDocsLayoutComponent } from '../../app/layouts/base-docs-layout/base-docs-layout.component';

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
    <section
      data-testid="docs-page"
      class="bg-white max-w-4xl mx-auto pt-2 pb-10 px-4 sm:px-0 focus:outline-none"
      (click)="handleContentClick($event)"
      (keydown.enter)="handleContentClick($event)"
      aria-label="Conteúdo da Documentação"
      tabindex="0"
    >
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
            <div
              data-testid="docs-loading"
              class="animate-pulse space-y-4"
              aria-label="Carregando conteúdo"
              aria-busy="true"
            >
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
          } @else {
            @if (breadcrumbs().length > 0) {
              <nav
                class="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 mb-6 overflow-x-auto no-scrollbar whitespace-nowrap"
                aria-label="Caminho do documento"
              >
                @for (crumb of breadcrumbs(); track $index) {
                  @if (!$first) {
                    <i class="pi pi-angle-right text-[8px] opacity-50"></i>
                  }
                  <span [class.text-slate-600]="crumb.active" [class.font-bold]="crumb.active">
                    {{ crumb.label }}
                  </span>
                }
              </nav>
            }

            @if (shouldShowExternalHeader()) {
              <h1 class="text-3xl font-bold text-slate-900 tracking-tight">{{ title() }}</h1>
              @if (description()) {
                <p class="mt-2 text-lg text-slate-500">{{ description() }}</p>
              }
              @if (tags().length > 0) {
                <div class="mt-4 flex flex-wrap gap-2">
                  @for (tag of tags(); track trackByTag($index, tag)) {
                    <span
                      class="px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200"
                    >
                      {{ tag }}
                    </span>
                  }
                </div>
              }
            }

            @if (error()) {
              <div
                data-testid="docs-error"
                class="mt-8 py-12 px-6 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-center"
                role="alert"
              >
                <i class="pi pi-exclamation-circle text-3xl mb-3"></i>
                <h3 class="font-bold text-lg mb-1">Ops! Algo deu errado</h3>
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
                  <div
                    class="flex items-center justify-between gap-4 border-b border-slate-100 pb-6"
                  >
                    <div>
                      <h1 class="text-3xl font-bold text-slate-900 tracking-tight">
                        Referência da API
                      </h1>
                      <p class="mt-2 text-lg text-slate-500">
                        Especificação técnica detalhada dos endpoints do ecossistema Dindinho.
                      </p>
                    </div>
                    <a
                      [href]="swaggerUrl()"
                      target="_blank"
                      class="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg font-semibold hover:bg-indigo-100 transition-colors whitespace-nowrap"
                      aria-label="Abrir documentação interativa Swagger"
                    >
                      <i class="pi pi-external-link"></i>
                      Swagger UI
                    </a>
                  </div>

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
          }
        </div>
      }
    </section>
  `,
})
export class DocsPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly docs = inject(DocsService);
  private readonly viewportScroller = inject(ViewportScroller);
  private readonly layout = inject(BaseDocsLayoutComponent, { optional: true });

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

  /** Breadcrumbs baseados na navegação (sidebar) */
  protected readonly breadcrumbs = computed(() => {
    const slug = this.slug();

    // Se for OpenAPI, mostra breadcrumb fixo
    if (this.isOpenApi() || slug === 'api-ref') {
      return [
        { label: 'Infraestrutura & API', active: false },
        { label: 'Referência de API', active: true },
      ];
    }

    if (!slug) return [];

    // Tenta encontrar a categoria e o item na sidebar via layout
    if (this.layout) {
      const categories = this.layout.getCategories();
      for (const category of categories) {
        const item = category.items.find((i) => i.link.endsWith(`/${slug}`));
        if (item) {
          return [
            { label: category.label, active: false },
            { label: item.label, active: true },
          ];
        }
      }
    }

    // Fallback: se não encontrar na sidebar, tenta usar o título do frontmatter
    const currentTitle = this.title();
    if (currentTitle) {
      return [{ label: currentTitle, active: true }];
    }

    return [];
  });

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
  protected readonly isOpenApi = computed(() => !!this.openApiDoc());
  /** Indica se a rota atual deve exibir o redirecionamento para o Swagger UI */
  protected readonly isSwaggerSlug = computed(() => {
    const context = this.route.snapshot.data['context'] || 'user';
    return this.slug() === 'swagger' && context === 'admin';
  });
  /** URL do Swagger UI fornecida pelo serviço de documentação */
  protected readonly swaggerUrl = signal<string>(this.docs.getSwaggerUiUrl());

  /** Indica se o contexto atual é administrativo */
  protected readonly isAdminContext = computed(
    () => (this.route.snapshot.data['context'] || 'user') === 'admin',
  );

  /** Indica se o cabeçalho externo (título/descrição) deve ser exibido */
  protected readonly shouldShowExternalHeader = computed(() => {
    // Se estiver carregando, não mostra cabeçalho (mostra skeleton)
    if (this.isLoading()) return false;
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

  /** Efeito para carregar o conteúdo baseado na rota */
  constructor() {
    effect(
      () => {
        const params = this.params();
        const queryParams = this.queryParams();
        const context = this.route.snapshot.data['context'] || 'user';

        const slug = params.slug || null;
        let filePath = queryParams.path || '';

        // Se não houver slug nem path, redireciona para a intro do contexto
        if (!slug && !filePath) {
          this.router.navigate([context === 'admin' ? '/docs/admin/intro' : '/docs/intro'], {
            replaceUrl: true,
          });
          return;
        }

        // Se houver slug, resolve o path
        if (slug) {
          const resolvedPath = this.docs.resolvePathFromSlug(context, slug);
          if (resolvedPath) {
            filePath = resolvedPath;
          } else if (slug === 'api-ref' && context === 'admin') {
            filePath = this.OPENAPI_PATH;
          }
        }

        // Se chegamos aqui sem filePath, é um erro
        if (!filePath) {
          this.error.set('Documento não encontrado');
          this.isLoading.set(false);
          return;
        }

        this.slug.set(slug);
        this.selectedPath.set(filePath);
        this.loadContent(filePath);
      },
      { allowSignalWrites: true },
    );
  }

  /**
   * Carrega o conteúdo (Markdown ou OpenAPI) baseado no caminho.
   *
   * @param path - Caminho do arquivo ou identificador especial (OPENAPI_PATH)
   */
  private loadContent(path: string): void {
    this.isLoading.set(true);
    this.error.set(null);

    const request$ = path === this.OPENAPI_PATH ? this.docs.getOpenApi() : this.docs.getFile(path);

    request$.subscribe({
      next: (content) => {
        if (typeof content === 'string') {
          this.parseMarkdown(content);
          this.openApiDoc.set(null);
        } else {
          this.markdown.set('');
          this.openApiDoc.set(content);
          this.title.set('');
          this.description.set('');
          this.tags.set([]);
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.markdown.set('');
        this.error.set(`Não foi possível carregar o documento: ${path}`);
        this.title.set('Erro de Carregamento');
        this.description.set('');
        this.tags.set([]);
        this.isLoading.set(false);
      },
    });
  }

  /**
   * Intercepta cliques em links dentro do conteúdo Markdown para realizar navegação SPA.
   * Suporta links relativos (.md), âncoras e slugs.
   */
  protected handleContentClick(event: Event): void {
    const target = event.target as HTMLElement;
    const anchor = target.closest('a');

    if (!anchor) return;

    const href = anchor.getAttribute('href');
    if (!href) return;

    // Ignora links externos, mailto, etc.
    if (href.includes('://') || href.startsWith('mailto:') || href.startsWith('javascript:')) {
      return;
    }

    // Previne o comportamento padrão (recarregamento da página)
    event.preventDefault();

    // Lida com âncoras na mesma página
    if (href.startsWith('#')) {
      const elementId = href.slice(1);
      this.viewportScroller.scrollToPosition([0, 0]); // Reset scroll se necessário ou buscar elemento
      const element = document.getElementById(elementId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
      return;
    }

    // Resolve o link relativo para um slug
    const currentPath = this.selectedPath();
    const newSlug = this.resolveLinkToSlug(href, currentPath);

    if (newSlug) {
      // Navega para a nova rota de documentação
      const context = this.route.snapshot.data['context'] || 'user';
      const baseRoute = context === 'admin' ? '/docs/admin' : '/docs';
      this.router.navigate([baseRoute, newSlug]);
    }
  }

  /**
   * Resolve um link relativo de arquivo Markdown para um slug conhecido.
   */
  private resolveLinkToSlug(href: string, currentPath: string): string | null {
    // 1. Caso especial: Link de slug absoluto (ex: /docs/metas ou /docs/admin/roadmap)
    if (href.startsWith('/docs')) {
      const parts = href.split('/');
      // Se for /docs/admin/roadmap, o slug é o último segmento
      return parts.pop() || null;
    }

    // 2. Limpa o href (remove .md e âncoras para busca)
    const cleanHref = href.split('#')[0].split('?')[0].replace(/\.md$/, '');

    // 3. Resolve o caminho relativo baseado no arquivo atual
    let targetPath = '';
    if (cleanHref.startsWith('/')) {
      // Relativo à raiz de docs (ex: /10-product/metas.md)
      targetPath = cleanHref.slice(1);
    } else {
      // Relativo ao diretório do arquivo atual (ex: ../10-product/metas.md)
      const currentDir = currentPath.split('/').slice(0, -1).join('/');
      targetPath = this.normalizePath(`${currentDir}/${cleanHref}`);
    }

    // Adiciona .md de volta para comparação se não tiver
    const fullPath = targetPath.endsWith('.md') ? targetPath : `${targetPath}.md`;

    // 4. Busca o slug nos mapeamentos via serviço
    const context = this.route.snapshot.data['context'] || 'user';
    return this.docs.resolveSlugFromPath(context, fullPath);
  }

  /**
   * Normaliza caminhos com ../ ou ./
   */
  private normalizePath(path: string): string {
    const segments = path.split('/');
    const result: string[] = [];

    for (const segment of segments) {
      if (segment === '..') {
        result.pop();
      } else if (segment !== '.' && segment !== '') {
        result.push(segment);
      }
    }

    return result.join('/');
  }

  /**
   * Processa o conteúdo Markdown, extraindo frontmatter se presente.
   *
   * @param content - Conteúdo Markdown bruto
   */
  private parseMarkdown(content: string): void {
    // Parse manual ultra-simples de frontmatter (apenas para exibição)
    if (content.startsWith('---')) {
      const endIdx = content.indexOf('---', 3);
      if (endIdx !== -1) {
        const frontmatter = content.slice(3, endIdx);
        const body = content.slice(endIdx + 3).trim();

        // Extrai metadados usando regex simples
        const titleMatch = frontmatter.match(/title:\s*"(.*)"/);
        const descMatch = frontmatter.match(/description:\s*"(.*)"/);
        const tagsMatch = frontmatter.match(/tags:\s*\[(.*)\]/);

        this.title.set(titleMatch ? titleMatch[1] : '');
        this.description.set(descMatch ? descMatch[1] : '');
        this.tags.set(
          tagsMatch ? tagsMatch[1].split(',').map((t) => t.trim().replace(/"/g, '')) : [],
        );
        this.markdown.set(body);
        return;
      }
    }

    // Reset se não houver frontmatter
    this.title.set('');
    this.description.set('');
    this.tags.set([]);
    this.markdown.set(content);
  }

  /**
   * Retorna a classe CSS de cor baseada no método HTTP.
   * @param method - Método HTTP
   */
  protected getMethodClass(method: string): string {
    switch (method.toUpperCase()) {
      case 'GET':
        return 'bg-emerald-100 text-emerald-700';
      case 'POST':
        return 'bg-blue-100 text-blue-700';
      case 'PUT':
        return 'bg-amber-100 text-amber-700';
      case 'DELETE':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  }
}
