import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';
import { TransactionDTO, AccountDTO, PeriodPreset, TimeFilterSelectionDTO } from '@dindinho/shared';
import { ApiService } from '../../app/services/api.service';
import { AccountService } from '../../app/services/account.service';
import { CategoryService } from '../../app/services/category.service';
import { EmptyStateComponent } from '../../app/components/empty-state.component';
import { PageHeaderComponent } from '../../app/components/page-header.component';
import { TransactionDrawerComponent } from '../../app/components/transaction-drawer.component';
import { TimeFilterComponent } from '../../app/components/time-filter.component';
import { resolveTimeFilterToTransactionsQuery } from '../../app/utils/time-filter.util';

type TransactionTypeFilter = '' | TransactionDTO['type'];

@Component({
  selector: 'app-transactions-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ButtonModule,
    CurrencyPipe,
    DatePipe,
    EmptyStateComponent,
    PageHeaderComponent,
    TransactionDrawerComponent,
    TimeFilterComponent,
  ],
  template: `
    <div data-testid="transactions-page" class="flex flex-col gap-6 w-full">
      <app-page-header
        title="Transações"
        subtitle="Todas as transações, da mais nova pra mais velha"
      >
        <p-button
          page-header-actions
          data-testid="transactions-create-btn"
          label="Nova"
          icon="pi pi-plus"
          size="small"
          (onClick)="onNewTransaction()"
        />
      </app-page-header>

      <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col gap-4">
        <div class="flex gap-2 items-center">
          <div class="flex-1 min-w-0">
            <label class="sr-only" for="q">Pesquisar</label>
            <input
              data-testid="transactions-search"
              id="q"
              type="text"
              class="h-11 w-full rounded-xl border border-slate-200 px-3 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              placeholder="Pesquisar (ex: mercado, uber, salário)"
              [value]="searchDraft()"
              (input)="onSearchDraftInput($event)"
              aria-label="Pesquisar"
            />
          </div>

          <p-button
            data-testid="transactions-filters-toggle"
            [icon]="filtersOpen() ? 'pi pi-times' : 'pi pi-filter'"
            [rounded]="true"
            [text]="true"
            size="small"
            [attr.aria-label]="filtersOpen() ? 'Fechar filtros' : 'Abrir filtros'"
            [attr.aria-expanded]="filtersOpen()"
            [attr.aria-controls]="'transactions-filters-panel'"
            (onClick)="toggleFilters()"
          />
        </div>

        @if (filtersOpen()) {
          <div
            id="transactions-filters-panel"
            data-testid="transactions-filters"
            class="grid grid-cols-2 gap-2"
          >
            <div class="flex flex-col gap-1">
              <label class="sr-only" for="type">Tipo</label>
              <select
                data-testid="transactions-type-select"
                id="type"
                class="h-10 rounded-xl border border-slate-200 px-3 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                [value]="typeFilter()"
                (change)="onTypeFilterChange($event)"
                aria-label="Tipo"
              >
                <option value="">Todos os tipos</option>
                <option value="INCOME">Receita</option>
                <option value="EXPENSE">Despesa</option>
                <option value="TRANSFER">Transferência</option>
              </select>
            </div>

            <div class="flex flex-col gap-1">
              <label class="sr-only" for="accountId">Conta</label>
              <select
                data-testid="transactions-account-select"
                id="accountId"
                class="h-10 rounded-xl border border-slate-200 px-3 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                (change)="onAccountFilterChange($event)"
                aria-label="Conta"
              >
                <option value="" [selected]="!accountFilterId()">Todas as contas</option>
                @for (a of accounts(); track a.id) {
                  <option [value]="a.id" [selected]="a.id === accountFilterId()">
                    {{ a.name }}
                  </option>
                }
              </select>
            </div>

            <div class="flex flex-col gap-1">
              <label class="sr-only" for="categoryId">Categoria</label>
              <select
                data-testid="transactions-category-select"
                id="categoryId"
                class="h-10 rounded-xl border border-slate-200 px-3 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                (change)="onCategoryFilterChange($event)"
                aria-label="Categoria"
              >
                <option value="" [selected]="!categoryFilterId()">Todas as categorias</option>
                @for (c of categories(); track c.id) {
                  <option [value]="c.id" [selected]="c.id === categoryFilterId()">
                    {{ c.name }}
                  </option>
                }
              </select>
            </div>

            <div class="flex flex-col gap-1 col-span-2" data-testid="transactions-time-filter">
              <app-time-filter
                [selection]="timeFilterSelection()"
                (selectionChange)="onTimeFilterSelectionChange($event)"
              />
            </div>
          </div>
        }

        @if (initialLoading()) {
          <div data-testid="transactions-loading" class="text-sm text-slate-500">Carregando...</div>
        } @else if (error()) {
          <div
            data-testid="transactions-error"
            class="rounded-xl bg-red-50 text-red-700 border border-red-100 px-3 py-2 text-sm"
          >
            {{ error() }}
          </div>
        } @else if (!items().length) {
          <app-empty-state
            testId="transactions-empty"
            icon="pi-inbox"
            title="Nenhuma transação encontrada"
            description="Tente ajustar os filtros ou crie uma nova transação."
          />
        } @else {
          <div data-testid="transactions-list" class="flex flex-col">
            @for (t of items(); track t.id) {
              <button
                type="button"
                [attr.data-testid]="'transactions-item-' + t.id"
                class="w-full flex items-center justify-between py-3 border-b border-slate-100 last:border-b-0 text-left hover:bg-slate-50 active:bg-slate-100 transition-colors"
                (click)="transactionDrawer.show(t.id)"
              >
                <div class="flex flex-col gap-0.5 min-w-0">
                  <span class="text-sm font-semibold text-slate-800 truncate">{{
                    transactionTitle(t)
                  }}</span>
                  <div class="flex items-center gap-2 text-xs text-slate-500">
                    <span>{{ t.date | date: 'dd/MM/yyyy' }}</span>
                    <span aria-hidden="true">•</span>
                    <span class="truncate">{{ accountName(t.accountId) }}</span>
                  </div>
                </div>

                <div class="flex flex-col items-end gap-0.5">
                  <span class="text-sm font-bold" [class]="amountClass(t)">
                    {{ signedAmount(t) | currency: 'BRL' }}
                  </span>
                  <span class="text-xs text-slate-500">{{ transactionTypeLabel(t) }}</span>
                </div>
              </button>
            }
          </div>

          <div
            data-testid="transactions-load-more"
            class="py-2 text-center text-xs text-slate-500"
            [class.hidden]="!hasMore() && !loadingMore()"
          >
            @if (loadingMore()) {
              Carregando mais...
            } @else if (hasMore()) {
              Role para carregar mais
            }
          </div>
        }
      </div>

      <app-transaction-drawer
        #transactionDrawer
        (updated)="onTransactionUpdated($event)"
        (deleted)="onTransactionsDeleted($event)"
      />
    </div>
  `,
})
export class TransactionsPage {
  private api = inject(ApiService);
  private accountService = inject(AccountService);
  private categoryService = inject(CategoryService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);
  private host = inject(ElementRef<HTMLElement>);

  protected readonly accounts = this.accountService.accounts;
  protected readonly categories = this.categoryService.categories;

  protected readonly searchDraft = signal('');
  protected readonly searchQuery = signal('');
  protected readonly accountFilterId = signal<string>('');
  protected readonly categoryFilterId = signal<string>('');
  protected readonly typeFilter = signal<TransactionTypeFilter>('');

  protected readonly timeFilterSelection = signal<TimeFilterSelectionDTO>({
    mode: 'DAY_RANGE',
    period: { preset: 'THIS_MONTH', tzOffsetMinutes: new Date().getTimezoneOffset() },
  });

  protected readonly timeFilterActive = signal(false);

  protected readonly items = signal<TransactionDTO[]>([]);
  protected readonly nextCursorId = signal<string | null>(null);
  protected readonly initialLoading = signal(false);
  protected readonly loadingMore = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly hasMore = computed(() => this.nextCursorId() !== null);

  protected readonly accountMap = computed(() => {
    const map = new Map<string, AccountDTO>();
    for (const a of this.accounts()) map.set(a.id, a);
    return map;
  });

  private searchDebounceHandle: number | null = null;
  private observer: IntersectionObserver | null = null;
  private observedEl: HTMLElement | null = null;
  private initialLoadSeq = 0;

  protected readonly filtersOpen = signal(false);

  private parseInvoiceMonthParam(value: string | null): string | null {
    if (!value) return null;
    const normalized = value.trim();
    if (!/^\d{4}-\d{2}$/.test(normalized)) return null;
    const year = Number(normalized.slice(0, 4));
    const month = Number(normalized.slice(5, 7));
    if (!Number.isFinite(year) || year < 1970 || year > 2100) return null;
    if (!Number.isFinite(month) || month < 1 || month > 12) return null;
    return `${year}-${String(month).padStart(2, '0')}`;
  }

  private parseIsoDayParam(value: string | null): string | null {
    if (!value) return null;
    const normalized = value.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return null;

    const [y, m, d] = normalized.split('-').map((v) => Number(v));
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
    if (m < 1 || m > 12) return null;
    if (d < 1 || d > 31) return null;
    const dt = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
    if (dt.getUTCFullYear() !== y) return null;
    if (dt.getUTCMonth() !== m - 1) return null;
    if (dt.getUTCDate() !== d) return null;
    return normalized;
  }

  private parsePeriodPresetParam(value: string | null): PeriodPreset | null {
    if (!value) return null;
    const normalized = value.trim();
    const allowed: PeriodPreset[] = [
      'TODAY',
      'YESTERDAY',
      'THIS_WEEK',
      'LAST_WEEK',
      'THIS_MONTH',
      'LAST_MONTH',
      'CUSTOM',
    ];
    return (allowed as string[]).includes(normalized) ? (normalized as PeriodPreset) : null;
  }

  private parseTzOffsetMinutesParam(value: string | null): number | null {
    if (!value) return null;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return null;
    return parsed;
  }

  private sameTimeFilterSelection(a: TimeFilterSelectionDTO, b: TimeFilterSelectionDTO): boolean {
    if (a.mode !== b.mode) return false;

    if (a.mode === 'INVOICE_MONTH' && b.mode === 'INVOICE_MONTH') {
      return a.invoiceMonth === b.invoiceMonth;
    }

    if (a.mode === 'DAY_RANGE' && b.mode === 'DAY_RANGE') {
      if (a.period.preset !== b.period.preset) return false;
      if (a.period.tzOffsetMinutes !== b.period.tzOffsetMinutes) return false;
      if (a.period.preset !== 'CUSTOM') return true;
      return a.period.startDay === b.period.startDay && a.period.endDay === b.period.endDay;
    }

    return false;
  }

  private syncQueryParams(partial: {
    accountId?: string | null;
    categoryId?: string | null;
    type?: TransactionTypeFilter | null;
    invoiceMonth?: string | null;
    month?: string | null;
    periodPreset?: PeriodPreset | null;
    startDay?: string | null;
    endDay?: string | null;
    tzOffsetMinutes?: number | null;
    openFilters?: 0 | 1;
  }) {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        accountId: partial.accountId,
        categoryId: partial.categoryId,
        type: partial.type,
        invoiceMonth: partial.invoiceMonth,
        month: partial.month,
        periodPreset: partial.periodPreset,
        startDay: partial.startDay,
        endDay: partial.endDay,
        tzOffsetMinutes: partial.tzOffsetMinutes,
        openFilters: partial.openFilters,
      },
      queryParamsHandling: 'merge',
    });
  }

  protected onTransactionUpdated(updated: TransactionDTO) {
    this.items.update((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  }

  protected onTransactionsDeleted(deletedIds: string[]) {
    const toRemove = new Set(deletedIds);
    this.items.update((prev) => prev.filter((t) => !toRemove.has(t.id)));
  }

  constructor() {
    this.accountService.loadAccounts();
    this.categoryService.loadCategories();

    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const accountId = params.get('accountId') ?? '';
      if (this.accountFilterId() !== accountId) {
        this.accountFilterId.set(accountId);
      }

      const categoryId = params.get('categoryId') ?? '';
      if (this.categoryFilterId() !== categoryId) {
        this.categoryFilterId.set(categoryId);
      }

      const typeRaw = params.get('type') ?? '';
      const type: TransactionTypeFilter =
        typeRaw === 'INCOME' || typeRaw === 'EXPENSE' || typeRaw === 'TRANSFER' ? typeRaw : '';
      if (this.typeFilter() !== type) {
        this.typeFilter.set(type);
      }

      const invoiceMonth = this.parseInvoiceMonthParam(
        params.get('invoiceMonth') ?? params.get('month'),
      );

      const periodPreset = this.parsePeriodPresetParam(params.get('periodPreset'));

      const startDay = this.parseIsoDayParam(params.get('startDay'));
      const endDay = this.parseIsoDayParam(params.get('endDay'));
      const tzOffsetMinutes =
        this.parseTzOffsetMinutesParam(params.get('tzOffsetMinutes')) ??
        new Date().getTimezoneOffset();

      const nextTimeSelection: TimeFilterSelectionDTO = invoiceMonth
        ? { mode: 'INVOICE_MONTH', invoiceMonth }
        : periodPreset && periodPreset !== 'CUSTOM'
          ? {
              mode: 'DAY_RANGE',
              period: { preset: periodPreset, tzOffsetMinutes },
            }
          : startDay || endDay || periodPreset === 'CUSTOM'
            ? {
                mode: 'DAY_RANGE',
                period: {
                  preset: 'CUSTOM',
                  startDay: startDay ?? endDay ?? '1970-01-01',
                  endDay: endDay ?? startDay ?? '1970-01-01',
                  tzOffsetMinutes,
                },
              }
            : {
                mode: 'DAY_RANGE',
                period: { preset: 'THIS_MONTH', tzOffsetMinutes },
              };

      if (!this.sameTimeFilterSelection(this.timeFilterSelection(), nextTimeSelection)) {
        this.timeFilterSelection.set(nextTimeSelection);
      }

      const hasTimeFilter = !!invoiceMonth || !!periodPreset || !!startDay || !!endDay;
      if (this.timeFilterActive() !== hasTimeFilter) {
        this.timeFilterActive.set(hasTimeFilter);
      }

      const openFiltersRaw = params.get('openFilters');
      const explicitOpenFilters =
        openFiltersRaw === '1' || openFiltersRaw === 'true'
          ? true
          : openFiltersRaw === '0' || openFiltersRaw === 'false'
            ? false
            : null;

      const hasAnyFilter =
        !!accountId ||
        !!categoryId ||
        !!type ||
        !!invoiceMonth ||
        !!periodPreset ||
        !!startDay ||
        !!endDay;
      const shouldOpenFilters = explicitOpenFilters ?? hasAnyFilter;

      if (shouldOpenFilters !== this.filtersOpen()) {
        this.filtersOpen.set(shouldOpenFilters);
      }
    });

    effect(() => {
      const draft = this.searchDraft();

      if (this.searchDebounceHandle !== null) {
        clearTimeout(this.searchDebounceHandle);
      }

      this.searchDebounceHandle = window.setTimeout(() => {
        const next = draft.trim();
        if (this.searchQuery() === next) return;
        this.searchQuery.set(next);
      }, 250);
    });

    effect(() => {
      const q = this.searchQuery();
      const accountId = this.accountFilterId();
      const categoryId = this.categoryFilterId();
      const type = this.typeFilter();

      const timeQuery = resolveTimeFilterToTransactionsQuery(this.timeFilterSelection());

      const filters: {
        q?: string;
        accountId?: string;
        categoryId?: string;
        type?: TransactionDTO['type'];
        invoiceMonth?: string;
        startDay?: string;
        endDay?: string;
        tzOffsetMinutes?: number;
      } = {};
      if (q) filters.q = q;
      if (accountId) filters.accountId = accountId;
      if (categoryId) filters.categoryId = categoryId;
      if (type) filters.type = type;
      if (this.timeFilterActive()) {
        if (timeQuery.invoiceMonth) filters.invoiceMonth = timeQuery.invoiceMonth;
        if (timeQuery.startDay) filters.startDay = timeQuery.startDay;
        if (timeQuery.endDay) filters.endDay = timeQuery.endDay;
        if (typeof timeQuery.tzOffsetMinutes === 'number') {
          filters.tzOffsetMinutes = timeQuery.tzOffsetMinutes;
        }
      }
      this.resetAndLoad(filters);
    });

    effect(() => {
      this.items();
      this.initialLoading();
      queueMicrotask(() => this.setupInfiniteScroll());
    });

    queueMicrotask(() => this.setupInfiniteScroll());
  }

  protected onNewTransaction() {
    this.router.navigate(['/transactions/new'], { queryParams: { openAmount: 1 } });
  }

  protected toggleFilters() {
    const next = !this.filtersOpen();
    this.filtersOpen.set(next);
    this.syncQueryParams({ openFilters: next ? 1 : 0 });
  }

  protected onSearchDraftInput(event: Event) {
    const value = (event.target as HTMLInputElement | null)?.value ?? '';
    this.searchDraft.set(value);
  }

  protected onAccountFilterChange(event: Event) {
    const value = (event.target as HTMLSelectElement | null)?.value ?? '';
    this.accountFilterId.set(value);
    this.syncQueryParams({ accountId: value ? value : null, openFilters: 1 });
  }

  protected onCategoryFilterChange(event: Event) {
    const value = (event.target as HTMLSelectElement | null)?.value ?? '';
    this.categoryFilterId.set(value);
    this.syncQueryParams({ categoryId: value ? value : null, openFilters: 1 });
  }

  protected onTypeFilterChange(event: Event) {
    const value = (event.target as HTMLSelectElement | null)?.value ?? '';
    this.typeFilter.set(value as TransactionTypeFilter);
    this.syncQueryParams({ type: value ? (value as TransactionTypeFilter) : null, openFilters: 1 });
  }

  protected onTimeFilterSelectionChange(selection: TimeFilterSelectionDTO) {
    this.timeFilterSelection.set(selection);
    this.timeFilterActive.set(true);
    const query = resolveTimeFilterToTransactionsQuery(selection);

    if (selection.mode === 'INVOICE_MONTH') {
      this.syncQueryParams({
        invoiceMonth: query.invoiceMonth ?? null,
        month: null,
        periodPreset: null,
        startDay: null,
        endDay: null,
        tzOffsetMinutes: null,
        openFilters: 1,
      });
      return;
    }

    if (selection.period.preset !== 'CUSTOM') {
      this.syncQueryParams({
        invoiceMonth: null,
        month: null,
        periodPreset: selection.period.preset,
        startDay: null,
        endDay: null,
        tzOffsetMinutes:
          typeof selection.period.tzOffsetMinutes === 'number'
            ? selection.period.tzOffsetMinutes
            : null,
        openFilters: 1,
      });
      return;
    }

    this.syncQueryParams({
      invoiceMonth: null,
      month: null,
      periodPreset: 'CUSTOM',
      startDay: query.startDay ?? null,
      endDay: query.endDay ?? null,
      tzOffsetMinutes: typeof query.tzOffsetMinutes === 'number' ? query.tzOffsetMinutes : null,
      openFilters: 1,
    });
  }

  protected signedAmount(t: TransactionDTO): number {
    if (t.type === 'TRANSFER') return typeof t.amount === 'number' ? t.amount : 0;

    const base = typeof t.amount === 'number' ? Math.abs(t.amount) : 0;
    return t.type === 'INCOME' ? base : -base;
  }

  protected amountClass(t: TransactionDTO): string {
    const value = this.signedAmount(t);
    if (value > 0) return 'text-emerald-700';
    if (value < 0) return 'text-rose-700';
    return 'text-slate-600';
  }

  protected transactionTypeLabel(t: TransactionDTO): string {
    if (t.type === 'INCOME') return 'Receita';
    if (t.type === 'EXPENSE') return 'Despesa';
    return 'Transferência';
  }

  protected transactionTitle(t: TransactionDTO): string {
    const raw = typeof t.description === 'string' ? t.description.trim() : '';
    if (raw) return raw;
    return this.transactionTypeLabel(t);
  }

  protected accountName(accountId: string): string {
    return this.accountMap().get(accountId)?.name ?? 'Conta';
  }

  private resetAndLoad(filters: {
    q?: string;
    accountId?: string;
    categoryId?: string;
    type?: TransactionDTO['type'];
    invoiceMonth?: string;
    startDay?: string;
    endDay?: string;
    tzOffsetMinutes?: number;
  }) {
    const seq = ++this.initialLoadSeq;
    this.error.set(null);
    this.items.set([]);
    this.nextCursorId.set(null);
    this.loadingMore.set(false);

    this.initialLoading.set(true);
    this.api
      .getTransactions({ ...filters, limit: 30 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          if (seq !== this.initialLoadSeq) return;
          this.items.set(res.items);
          this.nextCursorId.set(res.nextCursorId);
          this.initialLoading.set(false);
        },
        error: () => {
          if (seq !== this.initialLoadSeq) return;
          this.error.set('Erro ao carregar transações');
          this.initialLoading.set(false);
        },
      });
  }

  protected loadMore() {
    if (this.initialLoading() || this.loadingMore()) return;

    const cursorId = this.nextCursorId();
    if (!cursorId) return;

    const seq = this.initialLoadSeq;

    const q = this.searchQuery();
    const accountId = this.accountFilterId();
    const categoryId = this.categoryFilterId();
    const type = this.typeFilter();
    const timeQuery = resolveTimeFilterToTransactionsQuery(this.timeFilterSelection());

    const filters: {
      cursorId: string;
      limit: number;
      q?: string;
      accountId?: string;
      categoryId?: string;
      type?: TransactionDTO['type'];
      invoiceMonth?: string;
      startDay?: string;
      endDay?: string;
      tzOffsetMinutes?: number;
    } = { cursorId, limit: 30 };
    if (q) filters.q = q;
    if (accountId) filters.accountId = accountId;
    if (categoryId) filters.categoryId = categoryId;
    if (type) filters.type = type;
    if (this.timeFilterActive()) {
      if (timeQuery.invoiceMonth) filters.invoiceMonth = timeQuery.invoiceMonth;
      if (timeQuery.startDay) filters.startDay = timeQuery.startDay;
      if (timeQuery.endDay) filters.endDay = timeQuery.endDay;
      if (typeof timeQuery.tzOffsetMinutes === 'number') {
        filters.tzOffsetMinutes = timeQuery.tzOffsetMinutes;
      }
    }

    this.loadingMore.set(true);
    this.api
      .getTransactions(filters)
      .pipe(
        finalize(() => this.loadingMore.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (res) => {
          if (seq !== this.initialLoadSeq) return;
          const current = this.items();
          const next = res.items;
          this.items.set([...current, ...next]);
          this.nextCursorId.set(res.nextCursorId);
        },
        error: () => {
          if (seq !== this.initialLoadSeq) return;
          this.error.set('Erro ao carregar transações');
        },
      });
  }

  private setupInfiniteScroll() {
    if (typeof IntersectionObserver === 'undefined') return;

    const el = this.host.nativeElement.querySelector(
      '[data-testid="transactions-load-more"]',
    ) as HTMLElement | null;

    if (!el) {
      this.observer?.disconnect();
      this.observer = null;
      this.observedEl = null;
      return;
    }

    if (this.observer && this.observedEl === el) return;

    this.observer?.disconnect();

    this.observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        this.loadMore();
      },
      { root: null, rootMargin: '200px', threshold: 0 },
    );

    this.observedEl = el;
    this.observer.observe(el);

    this.destroyRef.onDestroy(() => {
      try {
        this.observer?.disconnect();
      } finally {
        this.observer = null;
        this.observedEl = null;
      }
    });
  }
}
