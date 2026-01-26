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
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { TransactionDTO, AccountDTO } from '@dindinho/shared';
import { ApiService } from '../../app/services/api.service';
import { AccountService } from '../../app/services/account.service';
import { EmptyStateComponent } from '../../app/components/empty-state.component';
import { PageHeaderComponent } from '../../app/components/page-header.component';
import { TransactionDrawerComponent } from '../../app/components/transaction-drawer.component';

type TransactionTypeFilter = '' | TransactionDTO['type'];

const utcStartOfMonthIso = (year: number, month: number) =>
  new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0)).toISOString();

const utcEndOfMonthIso = (year: number, month: number) =>
  new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)).toISOString();

@Component({
  selector: 'app-transactions-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    DatePickerModule,
    CurrencyPipe,
    DatePipe,
    EmptyStateComponent,
    PageHeaderComponent,
    TransactionDrawerComponent,
  ],
  template: `
    <div data-testid="transactions-page" class="p-4 pb-24 max-w-3xl mx-auto flex flex-col gap-4">
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
            (onClick)="toggleFilters()"
          />
        </div>

        @if (filtersOpen()) {
          <div data-testid="transactions-filters" class="grid grid-cols-2 gap-2">
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
                [value]="accountFilterId()"
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

            <div
              class="flex flex-col gap-1 col-span-2"
              data-testid="transactions-month-year-filter"
            >
              <label class="sr-only" for="monthYear">Mês e ano</label>
              <p-datepicker
                data-testid="transactions-month-year-picker"
                inputId="monthYear"
                [formControl]="monthYearControl"
                view="month"
                dateFormat="mm/yy"
                [showIcon]="true"
                [showClear]="true"
                [readonlyInput]="true"
                [styleClass]="'w-full'"
                inputStyleClass="h-10 w-full rounded-xl border border-slate-200 px-3 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                aria-label="Mês e ano"
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
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);
  private host = inject(ElementRef<HTMLElement>);

  protected readonly accounts = this.accountService.accounts;

  protected readonly searchDraft = signal('');
  protected readonly searchQuery = signal('');
  protected readonly accountFilterId = signal<string>('');
  protected readonly typeFilter = signal<TransactionTypeFilter>('');

  protected readonly monthYearControl = new FormControl<Date | null>(null);
  protected readonly monthYearFilter = signal<Date | null>(null);

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

  protected onTransactionUpdated(updated: TransactionDTO) {
    this.items.update((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  }

  protected onTransactionsDeleted(deletedIds: string[]) {
    const toRemove = new Set(deletedIds);
    this.items.update((prev) => prev.filter((t) => !toRemove.has(t.id)));
  }

  constructor() {
    this.accountService.loadAccounts();

    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const accountId = params.get('accountId') ?? '';
      if (this.accountFilterId() !== accountId) {
        this.accountFilterId.set(accountId);
      }

      const openFiltersRaw = params.get('openFilters');
      const shouldOpenFilters = openFiltersRaw === '1' || openFiltersRaw === 'true' || !!accountId;

      if (shouldOpenFilters && !this.filtersOpen()) {
        this.filtersOpen.set(true);
      }
    });

    this.monthYearControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => this.monthYearFilter.set(value));

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
      const type = this.typeFilter();

      const range = this.dateRangeFilters(this.monthYearFilter());

      const filters: {
        q?: string;
        accountId?: string;
        type?: TransactionDTO['type'];
        from?: string;
        to?: string;
      } = { ...range };
      if (q) filters.q = q;
      if (accountId) filters.accountId = accountId;
      if (type) filters.type = type;
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
    this.filtersOpen.update((v) => !v);
  }

  protected onSearchDraftInput(event: Event) {
    const value = (event.target as HTMLInputElement | null)?.value ?? '';
    this.searchDraft.set(value);
  }

  protected onAccountFilterChange(event: Event) {
    const value = (event.target as HTMLSelectElement | null)?.value ?? '';
    this.accountFilterId.set(value);
  }

  protected onTypeFilterChange(event: Event) {
    const value = (event.target as HTMLSelectElement | null)?.value ?? '';
    this.typeFilter.set(value as TransactionTypeFilter);
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
    type?: TransactionDTO['type'];
    from?: string;
    to?: string;
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
    const type = this.typeFilter();
    const range = this.dateRangeFilters(this.monthYearFilter());

    const filters: {
      cursorId: string;
      limit: number;
      q?: string;
      accountId?: string;
      type?: TransactionDTO['type'];
      from?: string;
      to?: string;
    } = { cursorId, limit: 30 };
    if (q) filters.q = q;
    if (accountId) filters.accountId = accountId;
    if (type) filters.type = type;
    if (range.from) filters.from = range.from;
    if (range.to) filters.to = range.to;

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

  private dateRangeFilters(monthYear: Date | null): { from?: string; to?: string } {
    if (!monthYear) return {};
    const year = monthYear.getFullYear();
    const month = monthYear.getMonth() + 1;
    if (!Number.isFinite(year) || year < 1970 || year > 2100) return {};
    if (!Number.isFinite(month) || month < 1 || month > 12) return {};
    return {
      from: utcStartOfMonthIso(year, month),
      to: utcEndOfMonthIso(year, month),
    };
  }
}
