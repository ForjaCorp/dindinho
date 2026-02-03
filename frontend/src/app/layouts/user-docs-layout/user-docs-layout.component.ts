import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

/**
 * @description
 * Layout para documentação de usuários autenticados.
 * Oferece navegação lateral e contexto de uso do sistema.
 */
@Component({
  selector: 'app-user-docs-layout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div data-testid="user-docs-layout" class="flex flex-col h-dvh bg-slate-50 font-sans">
      <!-- Header -->
      <header
        data-testid="user-docs-header"
        class="h-16 border-b border-slate-200 bg-white flex items-center px-6 justify-between sticky top-0 z-20"
      >
        <div class="flex items-center gap-3">
          <a data-testid="docs-logo" routerLink="/dashboard" class="flex items-center gap-2">
            <div
              class="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold"
            >
              D
            </div>
            <span class="font-bold text-slate-900 tracking-tight"
              >Dindinho <span class="text-emerald-600 font-medium">Docs</span></span
            >
          </a>
        </div>

        <div class="flex items-center gap-4">
          <a
            data-testid="btn-back-app"
            routerLink="/dashboard"
            class="text-sm font-medium text-slate-600 hover:text-emerald-600 transition-colors"
          >
            Voltar para o App
          </a>
        </div>
      </header>

      <div class="flex-1 flex overflow-hidden">
        <!-- Sidebar -->
        <aside
          data-testid="user-docs-sidebar"
          class="w-64 border-r border-slate-200 bg-white hidden md:flex flex-col"
        >
          <nav class="flex-1 overflow-y-auto p-4 space-y-1">
            <div class="text-xs font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
              Guia do Usuário
            </div>

            <a
              data-testid="nav-intro"
              routerLink="/docs/user/intro"
              routerLinkActive="bg-emerald-50 text-emerald-700 font-semibold"
              class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <i class="pi pi-info-circle"></i> Introdução
            </a>

            <div class="pt-4 text-xs font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
              Domínios do Produto
            </div>

            <a
              data-testid="nav-auth"
              routerLink="/docs/user/dominio-auth"
              routerLinkActive="bg-emerald-50 text-emerald-700 font-semibold"
              class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <i class="pi pi-lock"></i> Autenticação
            </a>

            <a
              data-testid="nav-accounts"
              routerLink="/docs/user/dominio-contas"
              routerLinkActive="bg-emerald-50 text-emerald-700 font-semibold"
              class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <i class="pi pi-wallet"></i> Contas e Saldos
            </a>

            <a
              data-testid="nav-transactions"
              routerLink="/docs/user/dominio-transacoes"
              routerLinkActive="bg-emerald-50 text-emerald-700 font-semibold"
              class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <i class="pi pi-list"></i> Transações
            </a>

            <a
              data-testid="nav-reports"
              routerLink="/docs/user/dominio-relatorios"
              routerLinkActive="bg-emerald-50 text-emerald-700 font-semibold"
              class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <i class="pi pi-chart-pie"></i> Relatórios
            </a>
          </nav>

          <div class="p-4 border-t border-slate-100 bg-slate-50/50">
            <p class="text-[10px] text-slate-400 text-center uppercase font-bold tracking-tighter">
              Dindinho v1.0.0
            </p>
          </div>
        </aside>

        <!-- Main Content -->
        <main data-testid="user-docs-main" class="flex-1 overflow-y-auto bg-white">
          <div class="max-w-4xl mx-auto px-6 py-10">
            <router-outlet></router-outlet>
          </div>
        </main>
      </div>
    </div>
  `,
})
export class UserDocsLayoutComponent {}
