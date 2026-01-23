import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { AccountDTO } from '@dindinho/shared';

@Component({
  selector: 'app-account-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, CurrencyPipe],
  host: {
    class: 'block',
  },
  template: `
    <div [class]="containerClass()" [attr.data-testid]="accountCardTestId()">
      <div [class]="headerClass()">
        <div
          [class]="iconClass()"
          [style]="{ backgroundColor: account().color + '20', color: account().color }"
          [attr.data-testid]="accountIconTestId()"
        >
          <i [class]="'pi ' + account().icon"></i>
        </div>

        <span [class]="tagClass()" [attr.data-testid]="accountTypeTestId()">{{ typeLabel() }}</span>
      </div>

      <div class="min-w-0">
        <p [class]="nameClass()" [title]="account().name" [attr.data-testid]="accountNameTestId()">
          {{ account().name }}
        </p>
      </div>

      @if (variant() === 'full') {
        @if (account().type === 'CREDIT' && account().creditCardInfo) {
          <div class="flex items-center gap-2 text-xs text-slate-500 mt-1">
            <span>Fecha dia {{ account().creditCardInfo!.closingDay }}</span>
            <span class="w-1 h-1 bg-slate-300 rounded-full"></span>
            <span>Vence dia {{ account().creditCardInfo!.dueDay }}</span>
          </div>
          <div class="mt-3 pt-3 border-t border-slate-50">
            <p class="text-xs text-slate-400 font-medium uppercase tracking-wider">
              Limite Disponível
            </p>
            <p
              class="text-lg font-semibold text-slate-700"
              [attr.data-testid]="accountValueTestId()"
            >
              {{ creditAvailableLimit() ?? 0 | currency: 'BRL' }}
            </p>
          </div>
        } @else {
          <div class="mt-3 pt-3 border-t border-slate-50">
            <p class="text-xs text-slate-400 font-medium uppercase tracking-wider">Saldo Atual</p>
            <p [class]="standardBalanceValueClass()" [attr.data-testid]="accountValueTestId()">
              {{ standardBalance() | currency: 'BRL' }}
            </p>
          </div>
        }
      } @else {
        @if (account().type === 'CREDIT' && account().creditCardInfo) {
          <p
            class="mt-2 text-base font-bold text-slate-900"
            [attr.data-testid]="accountValueTestId()"
          >
            {{ creditAvailableLimit() ?? 0 | currency: 'BRL' }}
          </p>
          <p class="text-xs text-slate-500" [attr.data-testid]="accountCaptionTestId()">
            Limite disponível
          </p>
        } @else {
          <p [class]="standardBalanceValueClass()" [attr.data-testid]="accountValueTestId()">
            {{ standardBalance() | currency: 'BRL' }}
          </p>
          <p class="text-xs text-slate-500" [attr.data-testid]="accountCaptionTestId()">
            Saldo atual
          </p>
        }
      }
    </div>
  `,
})
export class AccountCardComponent {
  account = input.required<AccountDTO>();
  variant = input<'compact' | 'full'>('full');

  typeLabel = computed(() => (this.account().type === 'CREDIT' ? 'Crédito' : 'Conta'));

  creditAvailableLimit = computed(() => {
    const credit = this.account().creditCardInfo;
    if (!credit) return null;
    const value =
      typeof credit.availableLimit === 'number'
        ? credit.availableLimit
        : typeof credit.limit === 'number'
          ? credit.limit
          : null;

    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  });

  standardBalance = computed(() => {
    const value = this.account().balance;
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
  });

  private standardBalanceColorClass = computed(() => {
    if (this.account().type === 'CREDIT') return 'text-slate-900';
    const value = this.standardBalance();
    if (value > 0) return 'text-emerald-600';
    if (value < 0) return 'text-rose-600';
    return 'text-slate-700';
  });

  standardBalanceValueClass = computed(() => {
    const base =
      this.variant() === 'compact' ? 'mt-2 text-base font-bold' : 'text-lg font-semibold';
    return `${base} ${this.standardBalanceColorClass()}`;
  });

  accountCardTestId = computed(() => `account-card-${this.account().id}`);
  accountIconTestId = computed(() => `account-icon-${this.account().id}`);
  accountTypeTestId = computed(() => `account-type-${this.account().id}`);
  accountNameTestId = computed(() => `account-name-${this.account().id}`);
  accountValueTestId = computed(() => `account-value-${this.account().id}`);
  accountCaptionTestId = computed(() => `account-caption-${this.account().id}`);

  containerClass = computed(() => {
    if (this.variant() === 'compact') {
      return 'shrink-0 bg-white rounded-xl p-3 border border-slate-100 shadow-sm min-w-[160px]';
    }

    return 'group relative bg-white rounded-xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-all duration-300 hover:-translate-y-1';
  });

  headerClass = computed(() => {
    if (this.variant() === 'compact') {
      return 'flex items-start justify-between gap-2 mb-3';
    }

    return 'flex items-start justify-between mb-4';
  });

  iconClass = computed(() => {
    if (this.variant() === 'compact') {
      return 'w-10 h-10 rounded-xl flex items-center justify-center shadow-sm text-sm';
    }

    return 'w-12 h-12 rounded-xl flex items-center justify-center text-xl shadow-sm';
  });

  nameClass = computed(() => {
    if (this.variant() === 'compact') {
      return 'text-sm font-bold text-slate-800 truncate';
    }

    return 'font-bold text-slate-800 text-lg truncate';
  });

  tagClass = computed(() => {
    const base = 'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full';

    if (this.account().type === 'CREDIT') {
      return `${base} bg-sky-50 text-sky-700`;
    }

    return `${base} bg-emerald-50 text-emerald-700`;
  });
}
