import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

/**
 * @description
 * Layout para documentação técnica e administrativa.
 * Restrito a desenvolvedores e administradores.
 */
@Component({
  selector: 'app-admin-docs-layout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div data-testid="admin-docs-layout" class="flex flex-col h-dvh bg-slate-50 font-sans">
      <!-- Admin Header -->
      <header
        data-testid="admin-docs-header"
        class="h-16 border-b border-slate-200 bg-white flex items-center px-6 justify-between sticky top-0 z-20"
      >
        <div class="flex items-center gap-3">
          <a data-testid="admin-logo" routerLink="/docs" class="flex items-center gap-2">
            <div
              class="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold"
            >
              A
            </div>
            <span class="font-bold text-slate-900 tracking-tight"
              >Dindinho <span class="text-indigo-600 font-medium">Internal</span></span
            >
          </a>
          <span
            class="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase tracking-widest border border-indigo-100"
            >Admin Docs</span
          >
        </div>

        <div class="flex items-center gap-4">
          <button
            data-testid="btn-back-app"
            (click)="goToApp()"
            class="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors"
          >
            Voltar para o App
          </button>
        </div>
      </header>

      <div class="flex-1 flex overflow-hidden">
        <!-- Sidebar -->
        <aside
          data-testid="admin-docs-sidebar"
          class="w-64 border-r border-slate-200 bg-white hidden md:flex flex-col"
        >
          <nav class="flex-1 overflow-y-auto p-4 space-y-1">
            <div class="text-xs font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
              Engenharia
            </div>

            <a
              data-testid="nav-arch"
              routerLink="/docs/admin/architecture"
              routerLinkActive="bg-indigo-50 text-indigo-700 font-semibold"
              class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <i class="pi pi-sitemap"></i> Arquitetura
            </a>

            <a
              data-testid="nav-adr"
              routerLink="/docs/admin/adr"
              routerLinkActive="bg-indigo-50 text-indigo-700 font-semibold"
              class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <i class="pi pi-book"></i> ADRs
            </a>

            <a
              data-testid="nav-roadmap"
              routerLink="/docs/admin/roadmap"
              routerLinkActive="bg-indigo-50 text-indigo-700 font-semibold"
              class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <i class="pi pi-map"></i> Roadmap
            </a>

            <a
              data-testid="nav-test-plan-e2e"
              routerLink="/docs/admin/test-plan-e2e"
              routerLinkActive="bg-indigo-50 text-indigo-700 font-semibold"
              class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <i class="pi pi-check-square"></i> Plano E2E
            </a>

            <div class="pt-4 text-xs font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
              Infraestrutura
            </div>

            <a
              data-testid="nav-ops"
              routerLink="/docs/admin/ops"
              routerLinkActive="bg-indigo-50 text-indigo-700 font-semibold"
              class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <i class="pi pi-cog"></i> Operações
            </a>

            <a
              data-testid="nav-deploy"
              routerLink="/docs/admin/deploy"
              routerLinkActive="bg-indigo-50 text-indigo-700 font-semibold"
              class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <i class="pi pi-cloud-upload"></i> Deploy & Cloud
            </a>

            <a
              data-testid="nav-api-ref"
              routerLink="/docs/admin/api-ref"
              routerLinkActive="bg-indigo-50 text-indigo-700 font-semibold"
              class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <i class="pi pi-code"></i> Referência de API
            </a>

            <div class="pt-4 text-xs font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
              Domínios do Produto
            </div>

            <a
              data-testid="nav-dominio-auth"
              routerLink="/docs/admin/dominio-auth"
              routerLinkActive="bg-indigo-50 text-indigo-700 font-semibold"
              class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <i class="pi pi-lock"></i> Autenticação
            </a>

            <a
              data-testid="nav-dominio-contas"
              routerLink="/docs/admin/dominio-contas"
              routerLinkActive="bg-indigo-50 text-indigo-700 font-semibold"
              class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <i class="pi pi-wallet"></i> Contas e Cartões
            </a>

            <a
              data-testid="nav-dominio-transacoes"
              routerLink="/docs/admin/dominio-transacoes"
              routerLinkActive="bg-indigo-50 text-indigo-700 font-semibold"
              class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <i class="pi pi-list"></i> Transações
            </a>

            <a
              data-testid="nav-dominio-relatorios"
              routerLink="/docs/admin/dominio-relatorios"
              routerLinkActive="bg-indigo-50 text-indigo-700 font-semibold"
              class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <i class="pi pi-chart-bar"></i> Relatórios
            </a>

            <a
              data-testid="nav-dominio-colaboracao"
              routerLink="/docs/admin/dominio-colaboracao"
              routerLinkActive="bg-indigo-50 text-indigo-700 font-semibold"
              class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <i class="pi pi-users"></i> Colaboração
            </a>

            <a
              data-testid="nav-dominio-metas"
              routerLink="/docs/admin/dominio-metas"
              routerLinkActive="bg-indigo-50 text-indigo-700 font-semibold"
              class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <i class="pi pi-briefcase"></i> Metas de Economia
            </a>
          </nav>

          <div class="p-4 border-t border-slate-100 bg-slate-50/50">
            <p class="text-[10px] text-slate-400 text-center uppercase font-bold tracking-tighter">
              Dindinho Internal v1.0.0
            </p>
          </div>
        </aside>

        <!-- Main Content -->
        <main data-testid="admin-docs-main" class="flex-1 overflow-y-auto bg-white">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `,
})
export class AdminDocsLayoutComponent {
  /**
   * Redireciona o usuário para o domínio principal da aplicação (Dashboard).
   * Remove o subdomínio 'docs.' do host atual (preservando a porta se existir).
   */
  goToApp(): void {
    const host = window.location.host;
    if (host.startsWith('docs.')) {
      const mainDomain = host.replace('docs.', '');
      window.location.href = `${window.location.protocol}//${mainDomain}/dashboard`;
    } else {
      // Se já estiver no domínio principal (desenvolvimento), apenas navega
      window.location.href = '/dashboard';
    }
  }
}
