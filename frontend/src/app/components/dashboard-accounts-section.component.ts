import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccountDTO } from '@dindinho/shared';
import { AccountCardComponent } from './accounts/account-card.component';
import { EmptyStateComponent } from './empty-state.component';

@Component({
  selector: 'app-dashboard-accounts-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, AccountCardComponent, EmptyStateComponent],
  host: {
    class: 'block',
  },
  template: `
    <div class="flex flex-col gap-2">
      <div class="flex justify-between items-center px-1">
        <h2 class="text-lg font-bold text-slate-800">Contas</h2>

        @if (accounts().length === 0) {
          <button
            data-testid="dashboard-create-account-btn"
            type="button"
            (click)="create.emit()"
            class="flex items-center gap-1 text-emerald-600 text-sm font-semibold hover:text-emerald-700 transition-colors"
          >
            <i class="pi pi-plus text-xs"></i>
            Nova Conta
          </button>
        }
      </div>

      @if (accounts().length > 0) {
        <div data-testid="dashboard-account-list" class="flex gap-2 overflow-x-auto pb-2 px-1">
          @for (account of accounts(); track account.id) {
            <app-account-card [account]="account" variant="compact" />
          }
        </div>
      } @else {
        <app-empty-state
          testId="dashboard-account-empty"
          icon="pi-wallet"
          title="Nenhuma conta encontrada"
          [description]="emptyDescription()"
        />
      }
    </div>
  `,
})
export class DashboardAccountsSectionComponent {
  readonly accounts = input.required<AccountDTO[]>();
  readonly create = output<void>();

  readonly emptyDescription = computed(
    () => 'Clique em "Nova Conta" para criar sua primeira conta',
  );
}
