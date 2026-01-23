import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccountService } from '../../app/services/account.service';
import { CreateAccountDialogComponent } from '../../app/components/accounts/create-account-dialog.component';
import { AccountCardComponent } from '../../app/components/accounts/account-card.component';
import { EmptyStateComponent } from '../../app/components/empty-state.component';
import { PageHeaderComponent } from '../../app/components/page-header.component';
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
    EmptyStateComponent,
    PageHeaderComponent,
    ButtonModule,
    SkeletonModule,
  ],
  template: `
    <div data-testid="accounts-page" class="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <!-- Header -->
      <app-page-header title="Minhas Contas" subtitle="Gerencie suas contas e cartões de crédito">
        <p-button
          page-header-actions
          data-testid="accounts-create-account-btn"
          label="Nova Conta"
          icon="pi pi-plus"
          (onClick)="dialog.show()"
          styleClass="w-full sm:w-auto shadow-sm"
        />
      </app-page-header>

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
        <app-empty-state
          testId="accounts-empty-state"
          icon="pi-wallet"
          title="Nenhuma conta encontrada"
          description="Você ainda não possui contas cadastradas. Crie sua primeira conta para começar a controlar suas finanças."
        >
          <p-button
            empty-state-actions
            data-testid="accounts-empty-create-btn"
            label="Criar Primeira Conta"
            icon="pi pi-plus"
            (onClick)="dialog.show()"
            outlined="true"
          />
        </app-empty-state>
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
