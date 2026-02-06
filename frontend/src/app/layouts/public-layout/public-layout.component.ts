import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink } from '@angular/router';

/**
 * @description
 * Layout para páginas públicas (FAQ, Pricing, Onboarding, etc).
 * Oferece uma estrutura simples com header de navegação básica.
 */
@Component({
  selector: 'app-public-layout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterOutlet, RouterLink],
  template: `
    <div data-testid="public-layout" class="flex flex-col min-h-dvh bg-white font-sans">
      <!-- Header Simples -->
      <header
        data-testid="public-header"
        class="h-16 border-b border-slate-100 flex items-center px-6 justify-between sticky top-0 bg-white/80 backdrop-blur-md z-10"
      >
        <div class="flex items-center gap-2">
          <a data-testid="public-logo" routerLink="/" class="flex items-center gap-2">
            <div class="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
              <span class="text-white font-bold text-xl">D</span>
            </div>
            <span class="font-bold text-slate-900 text-lg tracking-tight">Dindinho</span>
          </a>
        </div>

        <nav
          data-testid="public-nav"
          class="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600"
        >
          <a
            data-testid="nav-pricing"
            routerLink="/pricing"
            routerLinkActive="text-emerald-600"
            class="hover:text-emerald-600 transition-colors"
            >Preços</a
          >
          <button
            data-testid="nav-principles"
            (click)="goToDocs('/docs/public/principles')"
            class="hover:text-emerald-600 transition-colors cursor-pointer bg-transparent border-none font-medium p-0"
          >
            Princípios
          </button>
          <a
            data-testid="nav-faq"
            routerLink="/faq"
            routerLinkActive="text-emerald-600"
            class="hover:text-emerald-600 transition-colors"
            >FAQ</a
          >
          <a
            data-testid="nav-privacy"
            routerLink="/privacy-policy"
            routerLinkActive="text-emerald-600"
            class="hover:text-emerald-600 transition-colors"
            >Privacidade</a
          >
        </nav>

        <div class="flex items-center gap-3">
          <a
            data-testid="btn-login"
            routerLink="/login"
            class="text-sm font-semibold text-slate-700 hover:text-slate-900 px-4 py-2"
            >Entrar</a
          >
          <a
            data-testid="btn-signup"
            routerLink="/signup"
            class="text-sm font-semibold bg-emerald-600 text-white px-4 py-2 rounded-xl hover:bg-emerald-700 transition-all shadow-sm shadow-emerald-200"
            >Começar agora</a
          >
        </div>
      </header>

      <!-- Conteúdo -->
      <main data-testid="public-main" class="flex-1">
        <router-outlet></router-outlet>
      </main>

      <!-- Footer Simples -->
      <footer data-testid="public-footer" class="py-12 border-t border-slate-100 bg-slate-50">
        <div class="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div class="md:col-span-2">
            <div class="flex items-center gap-2 mb-4">
              <div
                class="w-6 h-6 bg-emerald-600 rounded flex items-center justify-center text-[10px] text-white font-bold"
              >
                D
              </div>
              <span class="font-bold text-slate-900">Dindinho</span>
            </div>
            <p class="text-sm text-slate-500 max-w-xs">
              Organize suas finanças de forma simples e eficiente. O controle total do seu dinheiro
              na palma da mão.
            </p>
          </div>
          <div>
            <h4 class="font-semibold text-slate-900 mb-4 text-sm">Produto</h4>
            <ul class="space-y-2 text-sm text-slate-500">
              <li><a routerLink="/pricing" class="hover:text-emerald-600">Preços</a></li>
              <li>
                <button
                  (click)="goToDocs('/docs/public/principles')"
                  class="hover:text-emerald-600 cursor-pointer bg-transparent border-none p-0 text-sm text-slate-500"
                >
                  Princípios
                </button>
              </li>
              <li><a routerLink="/onboarding" class="hover:text-emerald-600">Como funciona</a></li>
            </ul>
          </div>
          <div>
            <h4 class="font-semibold text-slate-900 mb-4 text-sm">Suporte</h4>
            <ul class="space-y-2 text-sm text-slate-500">
              <li><a routerLink="/faq" class="hover:text-emerald-600">FAQ</a></li>
              <li>
                <a routerLink="/privacy-policy" class="hover:text-emerald-600">Privacidade</a>
              </li>
            </ul>
          </div>
        </div>
        <div
          class="max-w-7xl mx-auto px-6 mt-12 pt-8 border-t border-slate-200 text-center text-xs text-slate-400"
        >
          &copy; 2026 Dindinho. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  `,
})
export class PublicLayoutComponent {
  /**
   * Redireciona para o subdomínio de documentação.
   */
  goToDocs(path: string): void {
    const origin = window.location.origin;
    const docsOrigin = origin.replace('://', '://docs.');
    window.location.href = `${docsOrigin}${path}`;
  }
}
