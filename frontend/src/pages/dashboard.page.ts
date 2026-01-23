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
import { ButtonModule } from 'primeng/button';
import { ApiService } from '../app/services/api.service';
import { ApiResponseDTO, TransactionDTO, WalletDTO } from '@dindinho/shared';
import { WalletService } from '../app/services/wallet.service';
import { CurrencyPipe } from '@angular/common';
import { CreateWalletDialogComponent } from '../app/components/wallets/create-wallet-dialog.component';
import { WalletCardComponent } from '../app/components/wallets/wallet-card.component';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ButtonModule,
    CurrencyPipe,
    CreateWalletDialogComponent,
    WalletCardComponent,
  ],
  template: `
    <div class="flex flex-col gap-4 p-4 pb-24">
      <!-- Card de Saldo Total -->
      <div
        data-testid="balance-card"
        class="bg-linear-to-r from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden"
      >
        <!-- Efeito de fundo decorativo -->
        <div class="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>

        <span class="text-emerald-50 text-sm font-medium" data-testid="balance-title"
          >Saldo Total</span
        >
        <div class="text-3xl font-bold mt-1 tracking-tight">
          {{ totalBalance() | currency: 'BRL' }}
        </div>

        <div class="flex gap-3 mt-6">
          <p-button
            data-testid="income-button"
            label="Receita"
            icon="pi pi-arrow-up"
            size="small"
            [rounded]="true"
            styleClass="!bg-white/20 !border-0 text-white hover:!bg-white/30 w-full"
            (onClick)="onQuickAdd('INCOME')"
          />
          <p-button
            data-testid="expense-button"
            label="Despesa"
            icon="pi pi-arrow-down"
            size="small"
            [rounded]="true"
            styleClass="!bg-white/20 !border-0 text-white hover:!bg-white/30 w-full"
            (onClick)="onQuickAdd('EXPENSE')"
          />
        </div>
      </div>

      <div class="flex flex-col gap-2">
        <div class="flex justify-between items-center px-1">
          <h2 class="text-lg font-bold text-slate-800">Minhas Contas</h2>

          <button
            data-testid="dashboard-create-wallet-btn"
            (click)="createWalletDialog.show()"
            class="flex items-center gap-1 text-emerald-600 text-sm font-semibold hover:text-emerald-700 transition-colors"
          >
            <i class="pi pi-plus text-xs"></i>
            Nova Conta
          </button>
        </div>

        <!-- Lista de Contas -->
        @if (walletService.wallets().length > 0) {
          <div data-testid="dashboard-wallet-list" class="flex gap-2 overflow-x-auto pb-2 px-1">
            @for (wallet of walletService.wallets(); track wallet.id) {
              <app-wallet-card [wallet]="wallet" variant="compact" />
            } @empty {
              <div class="w-full py-8 text-center text-slate-400">
                <i class="pi pi-wallet text-2xl mb-2"></i>
                <p class="text-sm">Nenhuma conta encontrada</p>
              </div>
            }
          </div>
        } @else {
          <div
            data-testid="dashboard-wallet-empty"
            class="w-full py-8 text-center text-slate-400 bg-white rounded-xl border border-slate-100"
          >
            <i class="pi pi-wallet text-2xl mb-2"></i>
            <p class="text-sm">Nenhuma conta encontrada</p>
            <p class="text-xs mt-1">Clique em "Nova Conta" para criar sua primeira conta</p>
          </div>
        }
      </div>

      <app-create-wallet-dialog #createWalletDialog />

      <!-- Atalhos Rápidos -->
      <div data-testid="quick-links-section">
        <h2 class="text-lg font-bold text-slate-800 mb-3 px-1">Atalhos</h2>
        <div class="grid grid-cols-4 gap-2">
          <button
            class="flex flex-col items-center gap-2 p-2 active:scale-95 transition-transform group"
          >
            <div
              class="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-100 transition-colors"
            >
              <i class="pi pi-wallet text-xl"></i>
            </div>
            <span class="text-xs font-medium text-slate-600">Contas</span>
          </button>

          <button
            class="flex flex-col items-center gap-2 p-2 active:scale-95 transition-transform group"
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
          <button
            data-testid="view-all-transactions"
            class="text-sm text-emerald-600 font-medium hover:text-emerald-700"
            (click)="onViewAllTransactions()"
          >
            Ver todas
          </button>
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
              <div
                [attr.data-testid]="'dashboard-transaction-item-' + t.id"
                class="flex items-center justify-between px-4 py-3 border-b border-slate-100 last:border-b-0"
              >
                <div class="flex flex-col gap-0.5 min-w-0">
                  <span class="text-sm font-semibold text-slate-800 truncate">{{
                    transactionTitle(t)
                  }}</span>
                  <div class="flex items-center gap-2 text-xs text-slate-500">
                    <span>{{ t.date | date: 'dd/MM/yyyy' }}</span>
                    <span aria-hidden="true">•</span>
                    <span class="truncate">{{ walletName(t.walletId) }}</span>
                  </div>
                </div>

                <div class="flex flex-col items-end gap-0.5">
                  <span class="text-sm font-bold" [class]="amountClass(t)">
                    {{ signedAmount(t) | currency: 'BRL' }}
                  </span>
                  <span class="text-xs text-slate-500">{{ transactionTypeLabel(t) }}</span>
                </div>
              </div>
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
          <div
            class="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 flex flex-col items-center justify-center text-slate-400 gap-3"
          >
            <div class="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-1">
              <i class="pi pi-inbox text-3xl opacity-50"></i>
            </div>
            <span class="text-sm">Nenhuma transação recente</span>
            <button
              data-testid="dashboard-new-transaction"
              class="text-sm text-emerald-600 font-medium hover:text-emerald-700"
              (click)="onNewTransaction()"
            >
              Nova Transação
            </button>
          </div>
        }
      </div>

      <div
        data-testid="backend-status-card"
        class="bg-white rounded-2xl p-4 shadow-sm border border-slate-100"
      >
        <h3 class="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
          <i class="pi pi-server text-emerald-500"></i> Status do Backend
        </h3>

        @if (apiData(); as data) {
          <div class="text-xs text-slate-600">
            <p class="font-medium text-emerald-600">{{ data.message }}</p>
            <p class="mt-1 opacity-70">{{ data.docs }}</p>
          </div>
        } @else if (error()) {
          <div class="text-xs text-red-500 bg-red-50 p-2 rounded-lg">
            Erro ao conectar: Backend offline?
          </div>
        } @else {
          <div class="text-xs text-slate-400 animate-pulse">Conectando ao servidor...</div>
        }
      </div>
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
  protected walletService = inject(WalletService);
  private router = inject(Router);

  apiData = signal<ApiResponseDTO | null>(null);
  error = signal<string | null>(null);
  isLoading = signal(false);

  protected recentTransactions = signal<TransactionDTO[]>([]);
  protected recentTransactionsLoading = signal(false);
  protected recentTransactionsError = signal(false);

  protected walletMap = computed(() => {
    const map = new Map<string, WalletDTO>();
    for (const w of this.walletService.wallets()) map.set(w.id, w);
    return map;
  });

  // Signal reativo para o saldo total
  totalBalance = computed(() => this.walletService.totalBalance());

  ngOnInit() {
    this.checkBackendConnection();
    this.loadWallets();
    this.loadRecentTransactions();
  }

  checkBackendConnection() {
    this.apiService.getHello().subscribe({
      next: (response: ApiResponseDTO) => {
        this.apiData.set(response);
      },
      error: () => {
        this.error.set('Erro ao conectar com o backend');
      },
    });
  }

  loadWallets() {
    this.walletService.loadWallets();
  }

  protected loadRecentTransactions() {
    this.recentTransactionsError.set(false);
    this.recentTransactionsLoading.set(true);
    this.apiService.getTransactions({ limit: 5 }).subscribe({
      next: (res) => {
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

  protected walletName(walletId: string): string {
    return this.walletMap().get(walletId)?.name ?? 'Conta';
  }

  protected onQuickAdd(type: 'INCOME' | 'EXPENSE') {
    this.router.navigate(['/transactions/new'], {
      queryParams: { type, openAmount: 1 },
    });
  }

  protected onViewAllTransactions() {
    this.router.navigate(['/transactions']);
  }

  protected onNewTransaction() {
    this.router.navigate(['/transactions/new'], {
      queryParams: { openAmount: 1 },
    });
  }
}
