import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-dashboard-balance-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyPipe, ButtonModule],
  host: {
    class: 'block',
  },
  template: `
    <div
      data-testid="balance-card"
      class="bg-linear-to-r from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden"
    >
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
          (onClick)="quickAdd.emit('INCOME')"
        />
        <p-button
          data-testid="expense-button"
          label="Despesa"
          icon="pi pi-arrow-down"
          size="small"
          [rounded]="true"
          styleClass="!bg-white/20 !border-0 text-white hover:!bg-white/30 w-full"
          (onClick)="quickAdd.emit('EXPENSE')"
        />
      </div>
    </div>
  `,
})
export class DashboardBalanceCardComponent {
  readonly totalBalance = input.required<number>();
  readonly quickAdd = output<'INCOME' | 'EXPENSE'>();
}
