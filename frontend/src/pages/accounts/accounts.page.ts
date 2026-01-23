import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccountService } from '../../app/services/account.service';
import { CreateAccountDialogComponent } from '../../app/components/accounts/create-account-dialog.component';
import { AccountCardComponent } from '../../app/components/accounts/account-card.component';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';

@Component({
  selector: 'app-accounts-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    CreateAccountDialogComponent,
    AccountCardComponent,
    ButtonModule,
    SkeletonModule,
  ],
  template: `
    <div data-testid="accounts-page" class="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl md:text-3xl font-bold text-slate-800">Minhas Contas</h1>
          <p class="text-slate-500 mt-1">Gerencie suas contas e cartões de crédito</p>
        </div>
        <p-button
          data-testid="accounts-create-account-btn"
          label="Nova Conta"
          icon="pi pi-plus"
          (onClick)="dialog.show()"
          styleClass="w-full sm:w-auto shadow-sm"
        />
      </div>

      <!-- Loading State -->
      @if (accountService.isLoading() && !accountService.accounts().length) {
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          @for (i of [1, 2, 3]; track i) {
            <p-skeleton height="160px" styleClass="rounded-xl" />
          }
        </div>
      }

      <!-- Empty State -->
      @if (!accountService.isLoading() && !accountService.accounts().length) {
        <div
          data-testid="accounts-empty-state"
          class="flex flex-col items-center justify-center py-12 px-4 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200"
        >
          <div class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
            <i class="pi pi-wallet text-2xl text-slate-400"></i>
          </div>
          <h3 class="text-lg font-semibold text-slate-700">Nenhuma conta encontrada</h3>
          <p class="text-slate-500 max-w-md mt-2 mb-6">
            Você ainda não possui contas cadastradas. Crie sua primeira conta para começar a
            controlar suas finanças.
          </p>
          <p-button
            data-testid="accounts-empty-create-btn"
            label="Criar Primeira Conta"
            icon="pi pi-plus"
            (onClick)="dialog.show()"
            outlined="true"
          />
        </div>
      }

      <!-- Accounts Grid -->
      <div
        data-testid="accounts-grid"
        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
      >
        @for (account of accountService.accounts(); track account.id) {
          <app-account-card [account]="account" />
        }
      </div>

      <app-create-account-dialog #dialog />
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100%;
        background-color: #f8fafc; /* Slate 50 */
      }
    `,
  ],
})
export class AccountsPage implements OnInit {
  accountService = inject(AccountService);

  ngOnInit() {
    this.accountService.loadAccounts();
  }
}
