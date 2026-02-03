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
    <div
      data-testid="admin-docs-layout"
      class="flex flex-col h-dvh bg-slate-900 font-sans text-slate-300"
    >
      <!-- Admin Header -->
      <header
        data-testid="admin-docs-header"
        class="h-16 border-b border-slate-800 bg-slate-900 flex items-center px-6 justify-between sticky top-0 z-20"
      >
        <div class="flex items-center gap-3">
          <a data-testid="admin-logo" routerLink="/dashboard" class="flex items-center gap-2">
            <div
              class="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold"
            >
              A
            </div>
            <span class="font-bold text-white tracking-tight"
              >Dindinho <span class="text-indigo-400 font-medium">Internal</span></span
            >
          </a>
          <span
            class="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 text-[10px] font-bold uppercase tracking-widest border border-indigo-500/20"
            >Admin Docs</span
          >
        </div>

        <div class="flex items-center gap-4">
          <a
            data-testid="btn-back-app"
            routerLink="/dashboard"
            class="text-sm font-medium text-slate-400 hover:text-white transition-colors"
          >
            Voltar para o App
          </a>
        </div>
      </header>

      <div class="flex-1 flex overflow-hidden">
        <!-- Sidebar -->
        <aside
          data-testid="admin-docs-sidebar"
          class="w-64 border-r border-slate-800 bg-slate-900 hidden md:flex flex-col"
        >
          <nav class="flex-1 overflow-y-auto p-4 space-y-1">
            <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-2">
              Engenharia
            </div>

            <a
              data-testid="nav-arch"
              routerLink="/docs/admin/architecture"
              routerLinkActive="bg-indigo-500/10 text-indigo-400 font-semibold"
              class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
            >
              <i class="pi pi-sitemap"></i> Arquitetura
            </a>

            <a
              data-testid="nav-adr"
              routerLink="/docs/admin/adr"
              routerLinkActive="bg-indigo-500/10 text-indigo-400 font-semibold"
              class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
            >
              <i class="pi pi-book"></i> ADRs
            </a>

            <div
              class="pt-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-2"
            >
              Infraestrutura
            </div>

            <a
              data-testid="nav-ops"
              routerLink="/docs/admin/ops"
              routerLinkActive="bg-indigo-500/10 text-indigo-400 font-semibold"
              class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
            >
              <i class="pi pi-cog"></i> Operações
            </a>

            <a
              data-testid="nav-api-ref"
              routerLink="/docs/admin/api-ref"
              routerLinkActive="bg-indigo-500/10 text-indigo-400 font-semibold"
              class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
            >
              <i class="pi pi-code"></i> API Reference
            </a>

            <div
              class="pt-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-2"
            >
              Domínios (Técnico)
            </div>

            <a
              data-testid="nav-dominio-auth"
              routerLink="/docs/admin/dominio-auth"
              routerLinkActive="bg-indigo-500/10 text-indigo-400 font-semibold"
              class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
            >
              <i class="pi pi-lock"></i> Auth & Security
            </a>

            <a
              data-testid="nav-dominio-contas"
              routerLink="/docs/admin/dominio-contas"
              routerLinkActive="bg-indigo-500/10 text-indigo-400 font-semibold"
              class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
            >
              <i class="pi pi-wallet"></i> Accounts & Cards
            </a>

            <a
              data-testid="nav-dominio-collab"
              routerLink="/docs/admin/dominio-colaboracao"
              routerLinkActive="bg-indigo-500/10 text-indigo-400 font-semibold"
              class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
            >
              <i class="pi pi-users"></i> Collaboration & Invites
            </a>

            <div
              class="pt-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-2"
            >
              API & Contratos
            </div>

            <a
              data-testid="nav-openapi"
              routerLink="/docs/admin/openapi"
              routerLinkActive="bg-indigo-500/10 text-indigo-400 font-semibold"
              class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
            >
              <i class="pi pi-code"></i> OpenAPI Spec
            </a>

            <a
              data-testid="nav-swagger"
              routerLink="/docs/admin/swagger"
              routerLinkActive="bg-indigo-500/10 text-indigo-400 font-semibold"
              class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
            >
              <i class="pi pi-external-link"></i> Swagger UI
            </a>

            <div
              class="pt-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-2"
            >
              Infra & Ops
            </div>

            <a
              data-testid="nav-deploy"
              routerLink="/docs/admin/deploy"
              routerLinkActive="bg-indigo-500/10 text-indigo-400 font-semibold"
              class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
            >
              <i class="pi pi-cloud-upload"></i> Deploy & Coolify
            </a>
          </nav>

          <div class="p-4 border-t border-slate-800 bg-slate-950/50">
            <div class="flex items-center justify-between text-[10px] text-slate-500 font-mono">
              <span>ENV: PROD</span>
              <span>v1.0.0-build.42</span>
            </div>
          </div>
        </aside>

        <!-- Main Content -->
        <main data-testid="admin-docs-main" class="flex-1 overflow-y-auto bg-slate-950">
          <div class="max-w-5xl mx-auto px-8 py-12">
            <router-outlet></router-outlet>
          </div>
        </main>
      </div>
    </div>
  `,
})
export class AdminDocsLayoutComponent {}
