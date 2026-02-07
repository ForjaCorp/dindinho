import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccountDTO } from '@dindinho/shared';
import { AccountCardComponent } from './accounts/account-card.component';
import { EmptyStateComponent } from './empty-state.component';

@Component({
  selector: 'app-dashboard-credit-cards-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, AccountCardComponent, EmptyStateComponent],
  host: {
    class: 'block',
  },
  template: `
    <div class="flex flex-col gap-2">
      <div class="flex justify-between items-center px-1">
        <h2 class="text-lg font-bold text-slate-800">Cartões de Crédito</h2>

        @if (cards().length === 0) {
          <button
            data-testid="dashboard-create-credit-card-btn"
            type="button"
            (click)="create.emit()"
            class="flex items-center gap-1 text-emerald-600 text-sm font-semibold hover:text-emerald-700 transition-colors"
          >
            <i class="pi pi-plus text-xs"></i>
            Novo Cartão
          </button>
        }
      </div>

      @if (cards().length > 0) {
        <div data-testid="dashboard-credit-card-list" class="flex gap-2 overflow-x-auto pb-2 px-1">
          @for (card of cards(); track card.id) {
            <app-account-card
              [account]="card"
              variant="compact"
              (openTransactions)="openTransactions.emit($event)"
              (edit)="edit.emit($event)"
              (share)="share.emit($event)"
            />
          }
        </div>
      } @else {
        <app-empty-state
          testId="dashboard-credit-card-empty"
          icon="pi-credit-card"
          title="Nenhum cartão cadastrado"
          [description]="emptyDescription()"
        />
      }
    </div>
  `,
})
export class DashboardCreditCardsSectionComponent {
  readonly cards = input.required<AccountDTO[]>();
  readonly create = output<void>();
  readonly edit = output<AccountDTO>();
  readonly openTransactions = output<AccountDTO>();
  readonly share = output<AccountDTO>();

  readonly emptyDescription = computed(
    () => 'Clique em "Novo Cartão" para adicionar seu primeiro cartão de crédito',
  );
}
