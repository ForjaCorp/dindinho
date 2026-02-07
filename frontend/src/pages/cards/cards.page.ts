import { ChangeDetectionStrategy, Component, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccountService } from '../../app/services/account.service';
import { CreateAccountDialogComponent } from '../../app/components/accounts/create-account-dialog.component';
import { ShareAccountDialogComponent } from '../../app/components/accounts/share-account-dialog.component';
import { AccountCardComponent } from '../../app/components/accounts/account-card.component';
import { EmptyStateComponent } from '../../app/components/empty-state.component';
import { PageHeaderComponent } from '../../app/components/page-header.component';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { Router } from '@angular/router';
import { AccountDTO } from '@dindinho/shared';

@Component({
  selector: 'app-cards-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    CreateAccountDialogComponent,
    ShareAccountDialogComponent,
    AccountCardComponent,
    EmptyStateComponent,
    PageHeaderComponent,
    ButtonModule,
    SkeletonModule,
  ],
  template: `
    <div data-testid="cards-page" class="space-y-6">
      <app-page-header title="Meus Cartões" subtitle="Gerencie seus cartões de crédito">
        <p-button
          page-header-actions
          data-testid="cards-create-btn"
          label="Novo Cartão"
          icon="pi pi-plus"
          (onClick)="dialog.showForType('CREDIT')"
          styleClass="w-full sm:w-auto shadow-sm"
        />
      </app-page-header>

      @if (accountService.isLoading() && !creditCards().length) {
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          @for (i of [1, 2, 3]; track i) {
            <p-skeleton height="160px" styleClass="rounded-xl" />
          }
        </div>
      }

      @if (!accountService.isLoading() && !creditCards().length) {
        <app-empty-state
          testId="cards-empty-state"
          icon="pi-credit-card"
          title="Nenhum cartão cadastrado"
          description="Você ainda não possui cartões cadastrados. Adicione seu primeiro cartão para acompanhar limites e gastos."
        >
          <p-button
            empty-state-actions
            data-testid="cards-empty-create-btn"
            label="Adicionar Primeiro Cartão"
            icon="pi pi-plus"
            (onClick)="dialog.showForType('CREDIT')"
            outlined="true"
          />
        </app-empty-state>
      }

      <div
        data-testid="cards-grid"
        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
      >
        @for (card of creditCards(); track card.id) {
          <app-account-card
            [account]="card"
            (edit)="onEditAccount(dialog, $event)"
            (openTransactions)="onOpenTransactions($event)"
            (share)="onShareAccount(shareDialog, $event)"
          />
        }
      </div>

      <app-create-account-dialog #dialog />
      <app-share-account-dialog #shareDialog />
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100%;
        background-color: #f8fafc;
      }
    `,
  ],
})
export class CardsPage implements OnInit {
  protected readonly accountService = inject(AccountService);
  private router = inject(Router);

  protected readonly creditCards = computed(() =>
    this.accountService.accounts().filter((a) => a.type === 'CREDIT'),
  );

  ngOnInit() {
    this.accountService.loadAccounts();
  }

  protected onEditAccount(dialog: CreateAccountDialogComponent, account: AccountDTO) {
    dialog.showForEdit(account);
  }

  protected onShareAccount(dialog: ShareAccountDialogComponent, account: AccountDTO) {
    dialog.open([account.id]);
  }

  protected onOpenTransactions(account: AccountDTO) {
    this.router.navigate(['/transactions'], {
      queryParams: { accountId: account.id, openFilters: 1 },
    });
  }
}
