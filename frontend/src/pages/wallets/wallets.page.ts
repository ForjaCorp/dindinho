import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WalletService } from '../../app/services/wallet.service';
import { CreateWalletDialogComponent } from '../../app/components/wallets/create-wallet-dialog.component';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-wallets-page',
  standalone: true,
  imports: [
    CommonModule,
    CreateWalletDialogComponent,
    ButtonModule,
    CardModule,
    SkeletonModule,
    TagModule,
    TooltipModule,
  ],
  template: `
    <div class="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl md:text-3xl font-bold text-slate-800">Minhas Carteiras</h1>
          <p class="text-slate-500 mt-1">Gerencie suas contas e cartões de crédito</p>
        </div>
        <p-button 
          label="Nova Carteira" 
          icon="pi pi-plus" 
          (onClick)="dialog.show()"
          styleClass="w-full sm:w-auto shadow-sm"
        />
      </div>

      <!-- Loading State -->
      @if (walletService.isLoading() && !walletService.wallets().length) {
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          @for (i of [1, 2, 3]; track i) {
            <p-skeleton height="160px" styleClass="rounded-xl" />
          }
        </div>
      }

      <!-- Empty State -->
      @if (!walletService.isLoading() && !walletService.wallets().length) {
        <div class="flex flex-col items-center justify-center py-12 px-4 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
          <div class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
            <i class="pi pi-wallet text-2xl text-slate-400"></i>
          </div>
          <h3 class="text-lg font-semibold text-slate-700">Nenhuma carteira encontrada</h3>
          <p class="text-slate-500 max-w-md mt-2 mb-6">
            Você ainda não possui carteiras cadastradas. Crie sua primeira carteira para começar a controlar suas finanças.
          </p>
          <p-button 
            label="Criar Primeira Carteira" 
            icon="pi pi-plus" 
            (onClick)="dialog.show()" 
            outlined="true"
          />
        </div>
      }

      <!-- Wallets Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        @for (wallet of walletService.wallets(); track wallet.id) {
          <div class="group relative bg-white rounded-xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-all duration-300 hover:-translate-y-1">
            <!-- Header -->
            <div class="flex items-start justify-between mb-4">
              <div 
                class="w-12 h-12 rounded-xl flex items-center justify-center text-xl shadow-sm"
                [style.backgroundColor]="wallet.color + '20'"
                [style.color]="wallet.color"
              >
                <i [class]="'pi ' + wallet.icon"></i>
              </div>
              <p-tag 
                [value]="wallet.type === 'CREDIT' ? 'Crédito' : 'Conta'" 
                [severity]="wallet.type === 'CREDIT' ? 'info' : 'success'"
                styleClass="text-xs uppercase font-bold tracking-wider"
              />
            </div>

            <!-- Content -->
            <div class="space-y-1">
              <h3 class="font-bold text-slate-800 text-lg truncate" [pTooltip]="wallet.name">
                {{ wallet.name }}
              </h3>
              
              @if (wallet.type === 'CREDIT' && wallet.creditCardInfo) {
                <div class="flex items-center gap-2 text-xs text-slate-500">
                  <span>Fecha dia {{ wallet.creditCardInfo.closingDay }}</span>
                  <span class="w-1 h-1 bg-slate-300 rounded-full"></span>
                  <span>Vence dia {{ wallet.creditCardInfo.dueDay }}</span>
                </div>
                <div class="mt-3 pt-3 border-t border-slate-50">
                  <p class="text-xs text-slate-400 font-medium uppercase tracking-wider">Limite Disponível</p>
                  <p class="text-lg font-semibold text-slate-700">
                    {{ wallet.creditCardInfo.limit | currency:'BRL' }}
                  </p>
                </div>
              } @else {
                <div class="mt-3 pt-3 border-t border-slate-50">
                  <p class="text-xs text-slate-400 font-medium uppercase tracking-wider">Saldo Atual</p>
                  <p class="text-lg font-semibold text-emerald-600">
                    {{ wallet.balance | currency:'BRL' }}
                  </p>
                </div>
              }
            </div>
          </div>
        }
      </div>

      <app-create-wallet-dialog #dialog />
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100%;
      background-color: #f8fafc; /* Slate 50 */
    }
  `]
})
export class WalletsPage implements OnInit {
  walletService = inject(WalletService);

  ngOnInit() {
    this.walletService.loadWallets();
  }
}
