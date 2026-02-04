import { Component, signal, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

/**
 * @interface SidebarItem
 * @description Representa um item individual de navegação na sidebar.
 */
export interface SidebarItem {
  id: string;
  label: string;
  icon: string;
  link: string;
  status?: 'WIP' | 'RFC' | 'DONE';
}

/**
 * @interface SidebarCategory
 * @description Representa uma categoria que agrupa múltiplos itens na sidebar.
 */
export interface SidebarCategory {
  id: string;
  label: string;
  items: SidebarItem[];
  isBacklog?: boolean;
}

/**
 * @description
 * Componente base para layouts de documentação (User e Admin).
 * Centraliza a estilização premium, acessibilidade e comportamentos comuns.
 */
@Component({
  selector: 'app-base-docs-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div [attr.data-testid]="testId" class="flex flex-col h-dvh bg-slate-50 font-sans relative">
      <a
        href="#main-content"
        class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-100 focus:px-4 focus:py-2 focus:bg-indigo-600 focus:text-white focus:rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        Pular para o conteúdo principal
      </a>
      <!-- Overlay para Mobile -->
      @if (isMobileMenuOpen()) {
        <button
          class="fixed inset-0 bg-slate-900/50 z-30 lg:hidden backdrop-blur-sm transition-opacity cursor-default w-full h-full border-none"
          (click)="toggleMobileMenu()"
          (keydown.escape)="closeMobileMenu()"
          aria-label="Fechar menu"
          type="button"
        ></button>
      }

      <!-- Header -->
      <header
        class="h-16 border-b border-slate-200 bg-white flex items-center px-4 lg:px-6 justify-between sticky top-0 z-40"
      >
        <div class="flex items-center gap-3">
          <!-- Botão Menu Mobile -->
          <button
            (click)="toggleMobileMenu()"
            class="p-2 -ml-2 lg:hidden text-slate-500 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            aria-label="Abrir menu"
          >
            <i [class]="isMobileMenuOpen() ? 'pi pi-times text-xl' : 'pi pi-bars text-xl'"></i>
          </button>

          <a [routerLink]="logoLink" class="flex items-center gap-2 group">
            <div
              [class]="
                'w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold transition-transform group-hover:scale-105 ' +
                logoBgClass
              "
            >
              {{ logoLetter }}
            </div>
            <span class="font-bold text-slate-900 tracking-tight hidden sm:inline"
              >Dindinho
              <span [class]="'font-medium ' + logoTextClass">{{ logoSubtitle }}</span></span
            >
          </a>
          @if (badgeText) {
            <span
              class="px-2 py-0.5 rounded bg-slate-50 text-slate-600 text-[10px] font-bold uppercase tracking-widest border border-slate-100"
              >{{ badgeText }}</span
            >
          }
        </div>

        <div class="flex items-center gap-4">
          <button
            (click)="backToApp.emit()"
            [class]="
              'flex items-center gap-2 px-4 py-2 text-sm font-bold text-white rounded-xl transition-all active:scale-95 shadow-sm border focus:outline-none focus:ring-2 ' +
              backButtonClass
            "
            aria-label="Voltar para o aplicativo principal"
          >
            <i class="pi pi-arrow-left text-[10px]"></i>
            <span class="hidden sm:inline">Voltar para o App</span>
            <span class="sm:hidden text-xs">Voltar ao App</span>
          </button>
        </div>
      </header>

      <div class="flex-1 flex overflow-hidden">
        <!-- Sidebar -->
        <aside
          [class.translate-x-0]="isMobileMenuOpen()"
          [class.-translate-x-full]="!isMobileMenuOpen()"
          class="fixed inset-y-0 left-0 w-72 lg:static lg:translate-x-0 border-r border-slate-200 bg-white flex flex-col z-40 transition-transform duration-300 ease-in-out"
        >
          <!-- Header da Sidebar no Mobile (opcional, para alinhar com o header principal) -->
          <div class="h-16 flex lg:hidden items-center px-6 border-b border-slate-100 gap-2">
            <i class="pi pi-list text-slate-400"></i>
            <span class="font-bold text-slate-900">Conteúdo do Guia</span>
          </div>

          <nav class="flex-1 overflow-y-auto p-4 space-y-6" aria-label="Navegação da documentação">
            @for (category of categories; track category.id) {
              <div>
                <button
                  (click)="toggleCategory(category.id)"
                  class="w-full flex items-center gap-2 px-3 py-1.5 mb-1 group text-left hover:bg-slate-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  [attr.aria-expanded]="isExpanded(category.id)"
                >
                  <span
                    class="text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap group-hover:text-slate-700 transition-colors"
                  >
                    {{ category.label }}
                  </span>
                  @if (category.items.length > 0) {
                    <span class="text-xs font-bold text-slate-300 group-hover:text-slate-400">
                      ({{ category.items.length }})
                    </span>
                  }
                  <div class="flex-1"></div>
                  <i
                    class="pi pi-chevron-down text-xs text-slate-300 transition-transform duration-200 group-hover:text-slate-400"
                    [class.rotate-180]="isExpanded(category.id)"
                  ></i>
                </button>

                @if (isExpanded(category.id)) {
                  <div
                    class="space-y-1 overflow-hidden"
                    role="group"
                    [attr.aria-label]="'Itens de ' + category.label"
                  >
                    @if (category.isBacklog) {
                      <!-- WIP Items -->
                      @if (getWIPItems(category).length > 0) {
                        <div
                          class="px-3 py-1.5 text-xs font-bold text-indigo-400 uppercase tracking-tighter flex items-center justify-between"
                        >
                          <span>Ativo (WIP)</span>
                          <span class="opacity-50">{{ getWIPItems(category).length }}</span>
                        </div>
                        @for (item of getWIPItems(category); track item.id) {
                          <ng-container
                            *ngTemplateOutlet="navItemTemplate; context: { $implicit: item }"
                          ></ng-container>
                        }
                      }

                      <!-- RFC Items -->
                      @if (getRFCItems(category).length > 0) {
                        <div
                          class="px-3 py-1.5 mt-2 text-xs font-bold text-orange-500 uppercase tracking-tighter flex items-center justify-between"
                        >
                          <span>Discussão (RFC)</span>
                          <span class="opacity-50">{{ getRFCItems(category).length }}</span>
                        </div>
                        @for (item of getRFCItems(category); track item.id) {
                          <ng-container
                            *ngTemplateOutlet="navItemTemplate; context: { $implicit: item }"
                          ></ng-container>
                        }
                      }

                      <!-- DONE Items -->
                      @if (getDoneItems(category).length > 0) {
                        <div
                          class="px-3 py-1.5 mt-2 text-xs font-bold text-slate-400 uppercase tracking-tighter flex items-center justify-between"
                        >
                          <span>Arquivado (Concluído)</span>
                          <span class="opacity-50">{{ getDoneItems(category).length }}</span>
                        </div>
                        @for (item of getDoneItems(category); track item.id) {
                          <ng-container
                            *ngTemplateOutlet="navItemTemplate; context: { $implicit: item }"
                          ></ng-container>
                        }
                      }
                    } @else {
                      @for (item of category.items; track item.id) {
                        <ng-container
                          *ngTemplateOutlet="navItemTemplate; context: { $implicit: item }"
                        ></ng-container>
                      }
                    }
                  </div>
                }
              </div>
            }
          </nav>

          <div class="p-4 border-t border-slate-100 bg-slate-50/50">
            <p class="text-[10px] text-slate-400 text-center uppercase font-bold tracking-tighter">
              {{ footerText }}
            </p>
          </div>
        </aside>

        <!-- Main Content -->
        <main
          id="main-content"
          class="flex-1 overflow-y-auto bg-white p-4 sm:px-6 lg:px-8 sm:py-2"
          tabindex="-1"
        >
          <div class="max-w-4xl mx-auto">
            <router-outlet></router-outlet>
          </div>
        </main>
      </div>
    </div>

    <!-- Template para Item de Navegação -->
    <ng-template #navItemTemplate let-item>
      <a
        [attr.data-testid]="'nav-' + item.id"
        [routerLink]="item.link"
        [routerLinkActive]="activeLinkClass"
        (click)="closeMobileMenu()"
        class="flex items-center justify-between px-3 py-2.5 rounded-lg text-[15px] text-slate-600 hover:bg-slate-50 transition-all group focus:outline-none focus:ring-2 focus:ring-indigo-500/10"
      >
        <div class="flex items-center gap-3.5">
          <i
            [class]="'pi ' + item.icon + ' text-base group-hover:scale-110 transition-transform'"
          ></i>
          <span class="leading-tight">{{ item.label }}</span>
        </div>
        @if (item.status) {
          <span
            [class]="
              'text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-tighter ' +
              getStatusClass(item.status)
            "
          >
            {{ item.status }}
          </span>
        }
      </a>
    </ng-template>
  `,
})
export class BaseDocsLayoutComponent implements OnInit {
  @Input() testId = 'base-docs-layout';
  @Input() logoLink = '/docs';
  @Input() logoLetter = 'D';
  @Input() logoBgClass = 'bg-indigo-600';
  @Input() logoTextClass = 'text-indigo-600';
  @Input() logoSubtitle = 'Docs';
  @Input() badgeText: string | null = null;
  @Input() footerText = 'Dindinho Docs v1.0.0';
  @Input() activeLinkClass = 'bg-indigo-50 text-indigo-700 font-bold';
  @Input() categories: SidebarCategory[] = [];
  @Input() backButtonClass =
    'bg-emerald-600 hover:bg-emerald-700 border-emerald-500 shadow-emerald-100 focus:ring-emerald-500/40';
  @Output() backToApp = new EventEmitter<void>();

  private expandedCategories = signal<Set<string>>(new Set());
  public isMobileMenuOpen = signal<boolean>(false);

  ngOnInit(): void {
    // Inicializar com todas as categorias expandidas por padrão
    this.initializeExpanded();
  }

  /**
   * @description
   * Inicializa o estado de expansão das categorias.
   * Chamado no ngOnInit e pode ser usado em testes para reinicializar após mudanças de input.
   */
  public initializeExpanded(): void {
    const cats = this.categories;
    if (cats && cats.length > 0) {
      this.expandedCategories.set(new Set(cats.map((c) => c.id)));
    }
  }

  isExpanded(categoryId: string): boolean {
    return this.expandedCategories().has(categoryId);
  }

  toggleCategory(categoryId: string): void {
    const current = new Set(this.expandedCategories());
    if (current.has(categoryId)) {
      current.delete(categoryId);
    } else {
      current.add(categoryId);
    }
    this.expandedCategories.set(current);
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen.update((v) => !v);
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen.set(false);
  }

  getWIPItems(category: SidebarCategory): SidebarItem[] {
    return category.items.filter((item) => item.status === 'WIP');
  }

  getRFCItems(category: SidebarCategory): SidebarItem[] {
    return category.items.filter((item) => item.status === 'RFC');
  }

  getDoneItems(category: SidebarCategory): SidebarItem[] {
    return category.items.filter((item) => item.status === 'DONE');
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'WIP':
        return 'bg-indigo-50 text-indigo-600 border border-indigo-100';
      case 'RFC':
        return 'bg-orange-50 text-orange-700 border border-orange-200/50';
      case 'DONE':
        return 'bg-slate-100 text-slate-500 border border-slate-200/50';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  }
}
