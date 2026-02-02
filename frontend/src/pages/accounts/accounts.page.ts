import { ChangeDetectionStrategy, Component, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccountService } from '../../app/services/account.service';
import { CreateAccountDialogComponent } from '../../app/components/accounts/create-account-dialog.component';
import { AccountCardComponent } from '../../app/components/accounts/account-card.component';
import { EmptyStateComponent } from '../../app/components/empty-state.component';
import { PageHeaderComponent } from '../../app/components/page-header.component';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { Router } from '@angular/router';
import { AccountDTO } from '@dindinho/shared';

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
    <div data-testid="accounts-page" class="space-y-6">
      <!-- Header -->
      <app-page-header title="Minhas Contas" subtitle="Gerencie suas contas">
        <p-button
          page-header-actions
          data-testid="accounts-create-account-btn"
          label="Nova Conta"
          icon="pi pi-plus"
          (onClick)="dialog.showForType('STANDARD')"
          styleClass="w-full sm:w-auto shadow-sm"
        />
      </app-page-header>

      <!-- Loading State -->
      @if (accountService.isLoading() && !standardAccounts().length) {
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          @for (i of [1, 2, 3]; track i) {
            <p-skeleton height="160px" styleClass="rounded-xl" />
          }
        </div>
      }

      <!-- Empty State -->
      @if (!accountService.isLoading() && !standardAccounts().length) {
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
            (onClick)="dialog.showForType('STANDARD')"
            outlined="true"
          />
        </app-empty-state>
      }

      <!-- Accounts Grid -->
      <div
        data-testid="accounts-grid"
        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
      >
        @for (account of standardAccounts(); track account.id) {
          <app-account-card
            [account]="account"
            (edit)="onEditAccount(dialog, $event)"
            (openTransactions)="onOpenTransactions($event)"
          />
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
  private router = inject(Router);

  protected readonly standardAccounts = computed(() =>
    this.accountService.accounts().filter((a: AccountDTO) => a.type === 'STANDARD'),
  );

  ngOnInit() {
    this.accountService.loadAccounts();
  }

  protected onEditAccount(dialog: CreateAccountDialogComponent, account: AccountDTO) {
    dialog.showForEdit(account);
  }

  protected onOpenTransactions(account: AccountDTO) {
    this.router.navigate(['/transactions'], {
      queryParams: { accountId: account.id, openFilters: 1 },
    });
  }
}
