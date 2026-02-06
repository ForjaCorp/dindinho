/**
 * Componente principal do Dashboard da aplicação.
 *
 * Exibe o resumo financeiro do usuário, incluindo:
 * - Saldo total
 * - Botões de ação rápida (receita/despesa)
 * - Atalhos para funcionalidades principais
 * - Lista de transações recentes
 *
 * @component
 * @example
 * <app-dashboard></app-dashboard>
 */
import {
  Component,
  inject,
  signal,
  OnInit,
  ChangeDetectionStrategy,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../app/services/api.service';
import { HealthCheckDTO, TransactionDTO, AccountDTO } from '@dindinho/shared';
import { AccountService } from '../app/services/account.service';
import { CurrencyPipe } from '@angular/common';
import { CreateAccountDialogComponent } from '../app/components/accounts/create-account-dialog.component';
import { Router } from '@angular/router';
import { DashboardBalanceCardComponent } from '../app/components/dashboard-balance-card.component';
import { BackendStatusCardComponent } from '../app/components/backend-status-card.component';
import { EmptyStateComponent } from '../app/components/empty-state.component';
import { DashboardAccountsSectionComponent } from '../app/components/dashboard-accounts-section.component';
import { DashboardCreditCardsSectionComponent } from '../app/components/dashboard-credit-cards-section.component';
import { TransactionDrawerComponent } from '../app/components/transaction-drawer.component';
import { AuthService } from '../app/services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    CurrencyPipe,
    CreateAccountDialogComponent,
    DashboardBalanceCardComponent,
    BackendStatusCardComponent,
    EmptyStateComponent,
    DashboardAccountsSectionComponent,
    DashboardCreditCardsSectionComponent,
    TransactionDrawerComponent,
  ],
  template: `
    <div class="flex flex-col gap-6">
      <app-dashboard-balance-card [totalBalance]="totalBalance()" (quickAdd)="onQuickAdd($event)" />

      <app-dashboard-accounts-section
        [accounts]="standardAccounts()"
        (create)="createAccountDialog.showForType('STANDARD')"
        (openTransactions)="onOpenTransactions($event)"
        (edit)="createAccountDialog.showForEdit($event)"
      />

      <app-dashboard-credit-cards-section
        [cards]="creditAccounts()"
        (create)="createAccountDialog.showForType('CREDIT')"
        (openTransactions)="onOpenTransactions($event)"
        (edit)="createAccountDialog.showForEdit($event)"
      />

      <app-create-account-dialog #createAccountDialog />

      <!-- Atalhos Rápidos -->
      <div data-testid="quick-links-section">
        <h2 class="text-lg font-bold text-slate-800 mb-3 px-1">Atalhos</h2>
        <div class="grid grid-cols-4 gap-2">
          <button
            data-testid="quick-link-accounts"
            type="button"
            class="flex flex-col items-center gap-2 p-2 active:scale-95 transition-transform group"
            (click)="onOpenAccounts()"
          >
            <div
              class="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-100 transition-colors"
            >
              <i class="pi pi-wallet text-xl"></i>
            </div>
            <span class="text-xs font-medium text-slate-600">Contas</span>
          </button>

          <button
            data-testid="quick-link-cards"
            type="button"
            class="flex flex-col items-center gap-2 p-2 active:scale-95 transition-transform group"
            (click)="onOpenCards()"
          >
            <div
              class="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:bg-purple-100 transition-colors"
            >
              <i class="pi pi-credit-card text-xl"></i>
            </div>
            <span class="text-xs font-medium text-slate-600">Cartões</span>
          </button>

          <button
            class="flex flex-col items-center gap-2 p-2 active:scale-95 transition-transform group"
          >
            <div
              class="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center group-hover:bg-orange-100 transition-colors"
            >
              <i class="pi pi-chart-pie text-xl"></i>
            </div>
            <span class="text-xs font-medium text-slate-600">Relatórios</span>
          </button>

          <button
            class="flex flex-col items-center gap-2 p-2 active:scale-95 transition-transform group"
          >
            <div
              class="w-12 h-12 rounded-2xl bg-gray-100 text-gray-600 flex items-center justify-center group-hover:bg-gray-200 transition-colors"
            >
              <i class="pi pi-cog text-xl"></i>
            </div>
            <span class="text-xs font-medium text-slate-600">Ajustes</span>
          </button>
        </div>
      </div>

      <!-- Lista Recente (Placeholder) -->
      <div data-testid="transactions-section">
        <div class="flex items-center justify-between mb-3 px-1">
          <h2 class="text-lg font-bold text-slate-800">Últimas Transações</h2>
        </div>

        @if (recentTransactionsLoading()) {
          <div
            data-testid="dashboard-transactions-loading"
            class="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 text-sm text-slate-500"
          >
            Carregando...
          </div>
        } @else if (recentTransactionsError()) {
          <div
            data-testid="dashboard-transactions-error"
            class="bg-red-50 text-red-700 border border-red-100 rounded-2xl p-4 text-sm"
          >
            Erro ao carregar transações
          </div>
        } @else if (recentTransactions().length > 0) {
          <div
            data-testid="dashboard-transactions-list"
            class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden"
          >
            @for (t of recentTransactions(); track t.id) {
              <button
                type="button"
                [attr.data-testid]="'dashboard-transaction-item-' + t.id"
                class="w-full flex items-center justify-between px-4 py-3 border-b border-slate-100 last:border-b-0 text-left hover:bg-slate-50 active:bg-slate-100 transition-colors"
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

            <button
              data-testid="dashboard-new-transaction"
              class="w-full text-center text-sm text-emerald-600 font-medium hover:text-emerald-700 px-4 py-3"
              (click)="onNewTransaction()"
            >
              Nova Transação
            </button>
          </div>
        } @else {
          <app-empty-state
            icon="pi-inbox"
            title="Nenhuma transação recente"
            description="Crie uma transação para começar a acompanhar seu histórico."
          >
            <button
              empty-state-actions
              data-testid="dashboard-new-transaction"
              class="text-sm text-emerald-600 font-medium hover:text-emerald-700"
              (click)="onNewTransaction()"
            >
              Nova Transação
            </button>
          </app-empty-state>
        }
      </div>

      @if (isAdmin()) {
        <app-backend-status-card [apiData]="apiData()" [error]="error()" />
      }

      @if (isAdmin()) {
        <div
          data-testid="dashboard-admin-section"
          class="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center justify-between"
        >
          <div class="space-y-1">
            <h3 class="text-base font-semibold text-slate-800">Administração</h3>
            <p class="text-sm text-slate-500">Gerencie a allowlist de cadastro</p>
          </div>
          <button
            data-testid="dashboard-admin-allowlist"
            type="button"
            class="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            (click)="onOpenAllowlist()"
          >
            <i class="pi pi-shield"></i>
            Allowlist
          </button>
        </div>
      }

      <app-transaction-drawer
        #transactionDrawer
        (updated)="onTransactionUpdated($event)"
        (deleted)="onTransactionsDeleted($event)"
      />
    </div>
  `,
})
/**
 * Componente principal do dashboard que exibe informações financeiras e status do sistema
 * @implements {OnInit}
 * @since 1.0.0
 */
export class DashboardComponent implements OnInit {
  private apiService = inject(ApiService);
  protected accountService = inject(AccountService);
  private router = inject(Router);
  private authService = inject(AuthService);

  apiData = signal<HealthCheckDTO | null>(null);
  error = signal<string | null>(null);
  isLoading = signal(false);

  protected recentTransactions = signal<TransactionDTO[]>([]);
  protected recentTransactionsLoading = signal(false);
  protected recentTransactionsError = signal(false);

  protected accountMap = computed(() => {
    const map = new Map<string, AccountDTO>();
    for (const a of this.accountService.accounts()) map.set(a.id, a);
    return map;
  });

  // Signal reativo para o saldo total
  totalBalance = computed(() => this.accountService.totalBalance());

  protected isAdmin = computed(() => this.authService.currentUser()?.systemRole === 'ADMIN');

  protected standardAccounts = computed(() =>
    this.accountService.accounts().filter((a: AccountDTO) => a.type === 'STANDARD'),
  );

  protected creditAccounts = computed(() =>
    this.accountService.accounts().filter((a: AccountDTO) => a.type === 'CREDIT'),
  );

  ngOnInit() {
    if (this.isAdmin()) {
      this.checkBackendConnection();
    }
    this.loadAccounts();
    this.loadRecentTransactions();
  }

  protected onTransactionUpdated(updated: TransactionDTO) {
    this.recentTransactions.update((prev: TransactionDTO[]) =>
      prev.map((t: TransactionDTO) => (t.id === updated.id ? updated : t)),
    );
  }

  protected onTransactionsDeleted(deletedIds: string[]) {
    const toRemove = new Set(deletedIds);
    this.recentTransactions.update((prev: TransactionDTO[]) =>
      prev.filter((t: TransactionDTO) => !toRemove.has(t.id)),
    );
  }

  checkBackendConnection() {
    this.apiService.getHello().subscribe({
      next: (response: HealthCheckDTO) => {
        this.apiData.set(response);
        this.error.set(null);
      },
      error: () => {
        this.apiData.set(null);
        this.error.set('Erro ao conectar com o backend');
      },
    });
  }

  loadAccounts() {
    this.accountService.loadAccounts();
  }

  protected loadRecentTransactions() {
    this.recentTransactionsError.set(false);
    this.recentTransactionsLoading.set(true);
    this.apiService.getTransactions({ limit: 5 }).subscribe({
      next: (res: { items: TransactionDTO[]; nextCursorId: string | null }) => {
        this.recentTransactions.set(res.items);
        this.recentTransactionsLoading.set(false);
      },
      error: () => {
        this.recentTransactionsError.set(true);
        this.recentTransactionsLoading.set(false);
      },
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

  protected onOpenTransactions(account: AccountDTO) {
    this.router.navigate(['/transactions'], {
      queryParams: { accountId: account.id, openFilters: 1 },
    });
  }

  protected onQuickAdd(type: 'INCOME' | 'EXPENSE') {
    this.router.navigate(['/transactions/new'], {
      queryParams: { type, openAmount: 1 },
    });
  }

  protected onOpenAccounts() {
    this.router.navigate(['/accounts']);
  }

  protected onOpenCards() {
    this.router.navigate(['/cards']);
  }

  protected onNewTransaction() {
    this.router.navigate(['/transactions/new'], {
      queryParams: { openAmount: 1 },
    });
  }

  protected onOpenAllowlist() {
    this.router.navigate(['/admin/allowlist']);
  }
}
