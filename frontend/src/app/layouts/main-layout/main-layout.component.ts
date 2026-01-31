import { Component, ChangeDetectionStrategy, DestroyRef, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="flex flex-col h-dvh bg-slate-50 font-sans">
      <!-- Cabeçalho -->
      <header
        class="bg-white/80 backdrop-blur-md px-4 md:px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 z-50 shadow-sm"
      >
        <div class="flex items-center gap-3">
          <div
            data-testid="logo"
            class="w-10 h-10 bg-linear-to-tr from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center text-white font-bold shadow-sm text-lg"
          >
            D
          </div>
          <span data-testid="app-title" class="font-bold text-slate-800 text-xl tracking-tight">{{
            title()
          }}</span>
        </div>

        <button
          class="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors relative"
        >
          <i class="pi pi-bell text-lg"></i>
          <span
            class="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-white"
          ></span>
        </button>
      </header>

      <!-- Conteúdo Principal -->
      <main
        data-testid="main-content"
        class="flex-1 overflow-y-auto scroll-smooth overscroll-contain"
      >
        <div
          data-testid="page-container"
          [class]="
            'w-full mx-auto px-4 md:px-6 pt-4 md:pt-6 pb-[calc(6rem+env(safe-area-inset-bottom))] ' +
            maxWidthClass()
          "
        >
          <router-outlet></router-outlet>
        </div>
      </main>

      <!-- Navegação Inferior -->
      <nav
        data-testid="bottom-navigation"
        class="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 md:px-6 py-2 flex justify-between items-end z-50 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.02)]"
      >
        <!-- Botão para acessar a página de início -->
        <a
          data-testid="nav-home"
          routerLink="/dashboard"
          routerLinkActive="text-emerald-600 !font-semibold"
          class="flex flex-col items-center gap-1 text-slate-400 w-16 py-1 transition-colors group"
        >
          <i class="pi pi-home text-xl group-hover:text-emerald-500 transition-colors"></i>
          <span class="text-[10px] font-medium">Início</span>
        </a>

        <!-- Botão para acessar a página de transações -->
        <a
          data-testid="nav-transactions"
          routerLink="/transactions"
          routerLinkActive="text-emerald-600 !font-semibold"
          class="flex flex-col items-center gap-1 text-slate-400 w-16 py-1 transition-colors group"
        >
          <i class="pi pi-list text-xl group-hover:text-emerald-500 transition-colors"></i>
          <span class="text-[10px] font-medium">Transações</span>
        </a>

        <!-- Botão central de ação rápida -->
        <div class="relative -mt-8">
          <a
            data-testid="add-button"
            routerLink="/transactions/new"
            [queryParams]="{ openAmount: 1 }"
            class="w-16 h-16 rounded-full bg-linear-to-r from-emerald-500 to-teal-600 text-white shadow-lg flex items-center justify-center hover:shadow-xl transition-shadow"
          >
            <i class="pi pi-plus text-2xl text-white!"></i>
          </a>
        </div>

        <!-- Botão para acessar a página de relatórios -->
        <a
          data-testid="nav-reports"
          routerLink="/reports"
          routerLinkActive="text-emerald-600 !font-semibold"
          class="flex flex-col items-center gap-1 text-slate-400 w-16 py-1 transition-colors group"
        >
          <i class="pi pi-chart-pie text-xl group-hover:text-emerald-500 transition-colors"></i>
          <span class="text-[10px] font-medium">Relatórios</span>
        </a>

        <!-- Botão para acessar o perfil -->
        <a
          data-testid="nav-profile"
          routerLink="/profile"
          routerLinkActive="text-emerald-600 !font-semibold"
          class="flex flex-col items-center gap-1 text-slate-400 w-16 py-1 transition-colors group"
        >
          <i class="pi pi-user text-xl group-hover:text-emerald-500 transition-colors"></i>
          <span class="text-[10px] font-medium">Perfil</span>
        </a>
      </nav>
    </div>
  `,
})
export class MainLayoutComponent {
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  protected readonly title = signal('Dindinho');
  protected readonly maxWidthClass = signal('max-w-5xl');

  constructor() {
    const updateRouteData = () => {
      const title = this.getDeepestRouteData('title');
      this.title.set((title as string) ?? 'Dindinho');

      const maxWidth = this.getDeepestRouteData('maxWidth');
      this.maxWidthClass.set(maxWidth ? `max-w-${maxWidth}` : 'max-w-5xl');
    };

    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => updateRouteData());
  }

  private getDeepestRouteData(key: string): unknown {
    const root = this.router.routerState.snapshot.root;

    let current: typeof root | null = root;
    while (current?.firstChild) {
      current = current.firstChild;
    }

    return (current as unknown as { data?: Record<string, unknown> } | null)?.data?.[key] ?? null;
  }
}
