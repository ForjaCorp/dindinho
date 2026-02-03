import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';
import { DocsService, OpenApiDocument, OpenApiOperation } from '../../app/services/docs.service';

interface DocNavItem {
  label: string;
  path: string;
}

interface OpenApiEndpointItem {
  method: string;
  path: string;
  summary: string;
  operationId: string;
}

/**
 * Página do portal de documentação.
 *
 * Renderiza o conteúdo de `docs/` como arquivos estáticos (assets) e permite navegação por links.
 */
@Component({
  selector: 'app-docs-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink],
  template: `
    <div data-testid="docs-page" class="grid grid-cols-1 lg:grid-cols-12 gap-4">
      <aside
        data-testid="docs-nav"
        class="lg:col-span-3 bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden"
      >
        <div class="px-4 py-3 border-b border-slate-100">
          <h2 class="text-sm font-semibold text-slate-800">Documentação</h2>
          <p class="text-xs text-slate-500">Fonte: pasta docs/ do monorepo</p>
        </div>

        <nav class="p-2">
          @for (item of navItems; track item.path) {
            <a
              data-testid="docs-nav-item"
              [routerLink]="['/docs']"
              [queryParams]="{ path: item.path }"
              class="block px-3 py-2 rounded-xl text-sm transition-colors"
              [class]="
                selectedPath() === item.path
                  ? 'bg-emerald-50 text-emerald-700 font-semibold'
                  : 'text-slate-700 hover:bg-slate-50'
              "
            >
              {{ item.label }}
              <div class="text-[11px] text-slate-500 font-normal truncate">{{ item.path }}</div>
            </a>
          }
        </nav>
      </aside>

      <section
        data-testid="docs-content"
        class="lg:col-span-9 bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden"
      >
        <div class="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-3">
          <div class="min-w-0">
            <h1 class="text-base font-semibold text-slate-800 truncate">{{ title() }}</h1>
            <p class="text-xs text-slate-500 truncate">{{ selectedPath() }}</p>
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <button
              data-testid="docs-open-raw"
              type="button"
              class="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              (click)="openRaw()"
            >
              Abrir raw
            </button>

            <button
              data-testid="docs-open-swagger"
              type="button"
              class="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              (click)="openSwagger()"
            >
              Swagger
            </button>
          </div>
        </div>

        <div class="p-4">
          @if (isLoading()) {
            <div data-testid="docs-loading" class="text-sm text-slate-500">Carregando…</div>
          } @else if (error()) {
            <div
              data-testid="docs-error"
              class="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2"
            >
              {{ error() }}
            </div>
          } @else if (isOpenApi()) {
            @if (openApiDoc()) {
              <div data-testid="docs-openapi" class="space-y-4">
                <div class="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <div class="text-sm font-semibold text-slate-800">{{ openApiTitle() }}</div>
                  <div class="text-xs text-slate-600">OpenAPI {{ openApiVersion() }}</div>
                </div>

                @for (group of openApiGroups(); track group.tag) {
                  <div class="border border-slate-100 rounded-2xl overflow-hidden">
                    <div class="px-4 py-3 bg-white border-b border-slate-100">
                      <div class="text-sm font-semibold text-slate-800">{{ group.tag }}</div>
                      @if (group.description) {
                        <div class="text-xs text-slate-500">{{ group.description }}</div>
                      }
                    </div>

                    <div class="divide-y divide-slate-100 bg-white">
                      @for (item of group.items; track item.operationId) {
                        <div class="px-4 py-3 flex items-start justify-between gap-3">
                          <div class="min-w-0">
                            <div class="text-xs text-slate-500 font-mono">
                              {{ item.method }} {{ item.path }}
                            </div>
                            <div class="text-sm text-slate-800 truncate">{{ item.summary }}</div>
                          </div>

                          <div class="text-[11px] text-slate-500 font-mono shrink-0">
                            {{ item.operationId }}
                          </div>
                        </div>
                      }
                    </div>
                  </div>
                }
              </div>
            }
          } @else {
            <pre
              data-testid="docs-markdown"
              class="text-sm text-slate-800 whitespace-pre-wrap wrap-break-word font-mono leading-relaxed"
              >{{ markdown() }}</pre
            >
          }
        </div>
      </section>
    </div>
  `,
})
export class DocsPage {
  private readonly route = inject(ActivatedRoute);
  private readonly docs = inject(DocsService);

  private readonly OPENAPI_PATH = '__openapi__';

  protected readonly navItems: DocNavItem[] = [
    { label: 'API (OpenAPI)', path: this.OPENAPI_PATH },
    { label: 'Plano de documentação', path: '90-backlog/planning/documentation.md' },
    { label: 'Autenticação (Frontend + API)', path: '30-api/authentication.md' },
    { label: 'Relatórios (PWA)', path: '40-clients/pwa/reports-frontend.md' },
    { label: 'AccountFilter (planejamento)', path: '90-backlog/planning/account-filter.md' },
    { label: 'TimeFilter (planejamento)', path: '90-backlog/planning/time-filter.md' },
    { label: 'Refactor URL Sync (planejamento)', path: '90-backlog/planning/refactor-url-sync.md' },
  ];

  private readonly defaultPath = this.navItems[0]?.path ?? '90-backlog/planning/documentation.md';

  protected readonly selectedPath = signal<string>(this.defaultPath);
  protected readonly markdown = signal<string>('');
  protected readonly openApiDoc = signal<OpenApiDocument | null>(null);
  protected readonly isLoading = signal<boolean>(false);
  protected readonly error = signal<string | null>(null);

  private readonly queryPath = toSignal(
    this.route.queryParamMap.pipe(map((pm) => pm.get('path') ?? this.defaultPath)),
    { initialValue: this.defaultPath },
  );

  protected readonly title = computed(() => {
    const path = this.selectedPath();
    if (path === this.OPENAPI_PATH) return 'API';
    const base = path.split('/').pop() ?? path;
    return base.endsWith('.md') ? base.slice(0, -3) : base;
  });

  protected readonly isOpenApi = computed(() => this.selectedPath() === this.OPENAPI_PATH);

  protected readonly openApiTitle = computed(() => this.openApiDoc()?.info.title ?? 'API');

  protected readonly openApiVersion = computed(() => this.openApiDoc()?.info.version ?? '');

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
    effect(() => {
      this.selectedPath.set(this.queryPath());
    });

    effect((onCleanup) => {
      const path = this.selectedPath();
      this.isLoading.set(true);
      this.error.set(null);

      if (path === this.OPENAPI_PATH) {
        this.markdown.set('');
        const sub = this.docs.getOpenApiDoc().subscribe({
          next: (doc) => {
            this.openApiDoc.set(doc);
            this.isLoading.set(false);
          },
          error: () => {
            this.openApiDoc.set(null);
            this.isLoading.set(false);
            this.error.set('Não foi possível carregar o OpenAPI.');
          },
        });

        onCleanup(() => sub.unsubscribe());
        return;
      }

      this.openApiDoc.set(null);

      const sub = this.docs.getMarkdown(path).subscribe({
        next: (text) => {
          this.markdown.set(text);
          this.isLoading.set(false);
        },
        error: () => {
          this.markdown.set('');
          this.isLoading.set(false);
          this.error.set('Não foi possível carregar o documento.');
        },
      });

      onCleanup(() => sub.unsubscribe());
    });
  }

  protected openRaw(): void {
    const path = this.selectedPath();
    if (path === this.OPENAPI_PATH) {
      window.open(this.docs.getOpenApiJsonUrl(), '_blank', 'noopener');
      return;
    }

    const raw = this.markdown();
    if (raw.length > 0) {
      const blob = new Blob([raw], { type: 'text/markdown;charset=utf-8' });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank', 'noopener');
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10_000);
      return;
    }

    const url = this.docs.getRawDocUrl(path);
    if (!url) return;
    window.open(url, '_blank', 'noopener');
  }

  protected openSwagger(): void {
    window.open(this.docs.getSwaggerUiUrl(), '_blank', 'noopener');
  }
}
