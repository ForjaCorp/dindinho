import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { WalletDTO } from '@dindinho/shared';

@Component({
  selector: 'app-wallet-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, CurrencyPipe],
  host: {
    class: 'block',
  },
  template: `
    <div [class]="containerClass()">
      <div [class]="headerClass()">
        <div
          [class]="iconClass()"
          [style]="{ backgroundColor: wallet().color + '20', color: wallet().color }"
        >
          <i [class]="'pi ' + wallet().icon"></i>
        </div>

        <span [class]="tagClass()">{{ typeLabel() }}</span>
      </div>

      <div class="min-w-0">
        <p [class]="nameClass()" [title]="wallet().name">{{ wallet().name }}</p>
      </div>

      @if (variant() === 'full') {
        @if (wallet().type === 'CREDIT' && wallet().creditCardInfo) {
          <div class="flex items-center gap-2 text-xs text-slate-500 mt-1">
            <span>Fecha dia {{ wallet().creditCardInfo!.closingDay }}</span>
            <span class="w-1 h-1 bg-slate-300 rounded-full"></span>
            <span>Vence dia {{ wallet().creditCardInfo!.dueDay }}</span>
          </div>
          <div class="mt-3 pt-3 border-t border-slate-50">
            <p class="text-xs text-slate-400 font-medium uppercase tracking-wider">
              Limite Disponível
            </p>
            <p class="text-lg font-semibold text-slate-700">
              {{ wallet().creditCardInfo!.limit | currency: 'BRL' }}
            </p>
          </div>
        } @else {
          <div class="mt-3 pt-3 border-t border-slate-50">
            <p class="text-xs text-slate-400 font-medium uppercase tracking-wider">Saldo Atual</p>
            <p class="text-lg font-semibold text-emerald-600">
              {{ wallet().balance || 0 | currency: 'BRL' }}
            </p>
          </div>
        }
      } @else {
        @if (wallet().type === 'CREDIT' && wallet().creditCardInfo?.limit) {
          <p class="mt-2 text-base font-bold text-slate-900">
            {{ wallet().creditCardInfo!.limit | currency: 'BRL' }}
          </p>
          <p class="text-xs text-slate-500">Limite disponível</p>
        } @else {
          <p class="mt-2 text-base font-bold text-slate-900">
            {{ wallet().balance || 0 | currency: 'BRL' }}
          </p>
          <p class="text-xs text-slate-500">Saldo atual</p>
        }
      }
    </div>
  `,
})
export class WalletCardComponent {
  wallet = input.required<WalletDTO>();
  variant = input<'compact' | 'full'>('full');

  typeLabel = computed(() => (this.wallet().type === 'CREDIT' ? 'Crédito' : 'Conta'));

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

    if (this.wallet().type === 'CREDIT') {
      return `${base} bg-sky-50 text-sky-700`;
    }

    return `${base} bg-emerald-50 text-emerald-700`;
  });
}
