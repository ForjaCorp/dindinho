import {
  Component,
  signal,
  OnInit,
  Input,
  HostListener,
  computed,
  inject,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

/**
 * @interface SidebarItem
 * @description Representa um item individual de navegação na sidebar.
 */
export interface SidebarItem {
  id: string;
  label: string;
  icon: string;
  link: string;
  status?: 'ANDAMENTO' | 'DISCUSSAO' | 'ARQUIVADO';
  priority?: 'alta' | 'media' | 'baixa';
  owner?: string;
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
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, FormsModule],
  template: `
    <div [attr.data-testid]="testId" class="flex flex-col h-dvh bg-slate-50 font-sans relative">
      <!-- Command Palette Overlay -->
      @if (isSearchOpen()) {
        <div
          class="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-100 flex items-start justify-center pt-[15vh] px-4"
          (click)="closeSearch()"
          (keydown.escape)="closeSearch()"
          role="button"
          tabindex="-1"
          aria-label="Fechar busca"
        >
          <div
            class="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
            (click)="$event.stopPropagation()"
            (keydown)="handleDialogKeyDown($event)"
            role="dialog"
            aria-modal="true"
            aria-label="Busca na documentação"
          >
            <!-- Search Input -->
            <div class="p-4 border-b border-slate-100 flex items-center gap-3">
              <i class="pi pi-search text-slate-500 text-lg" aria-hidden="true"></i>
              <input
                #searchInput
                type="text"
                [(ngModel)]="searchQuery"
                (ngModelChange)="onSearchQueryChange($event)"
                placeholder="Buscar na documentação... (Esc para sair)"
                class="flex-1 bg-transparent border-none outline-none text-slate-900 placeholder:text-slate-500 text-lg"
                autoFocus
                aria-autocomplete="list"
                aria-controls="search-results-list"
                [attr.aria-activedescendant]="
                  searchResults().length > 0 ? 'search-result-' + selectedIndex() : null
                "
              />
              <div
                class="px-2 py-1 bg-slate-100 rounded text-[10px] font-bold text-slate-600 uppercase"
              >
                Esc
              </div>
            </div>

            <!-- Search Results -->
            <div class="max-h-[50vh] overflow-y-auto p-2" id="search-results-list" role="listbox">
              @if (searchResults().length > 0) {
                <div class="space-y-1">
                  @for (result of searchResults(); track result.id; let i = $index) {
                    <button
                      (click)="navigateToResult(result)"
                      class="w-full flex items-center justify-between p-3 rounded-xl group transition-colors text-left"
                      [id]="'search-result-' + i"
                      role="option"
                      [attr.aria-selected]="i === selectedIndex()"
                      [class.bg-indigo-50]="false"
                      [ngClass]="[
                        i === selectedIndex() ? searchResultActiveClass : '',
                        searchResultHoverClass,
                      ]"
                    >
                      <div class="flex items-center gap-3">
                        <div
                          class="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-white transition-colors shadow-sm"
                          [ngClass]="searchIconHighlightClass"
                        >
                          <i [class]="'pi ' + result.icon" aria-hidden="true"></i>
                        </div>
                        <div>
                          <div
                            class="text-sm font-bold text-slate-900"
                            [ngClass]="searchTextHighlightClass"
                          >
                            {{ result.label }}
                          </div>
                          <div class="text-[11px] text-slate-600">
                            {{ result.category }}
                          </div>
                        </div>
                      </div>
                      <div class="flex items-center gap-2">
                        @if (result.priority) {
                          <i
                            [class]="'pi ' + getPriorityIcon(result.priority) + ' text-[10px]'"
                            [attr.title]="'Prioridade: ' + result.priority"
                            aria-hidden="true"
                          ></i>
                        }
                        @if (result.owner) {
                          <span
                            class="text-[9px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium border border-slate-200/50"
                          >
                            {{ result.owner }}
                          </span>
                        }
                        @if (result.status) {
                          <span
                            [class]="
                              'text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ' +
                              getStatusClass(result.status)
                            "
                          >
                            {{ result.status === 'DISCUSSAO' ? 'DISCUSSÃO' : result.status }}
                          </span>
                        }
                        <i
                          class="pi pi-arrow-right text-xs text-slate-400"
                          [ngClass]="searchArrowHighlightClass"
                          aria-hidden="true"
                        ></i>
                      </div>
                    </button>
                  }
                </div>
                <!-- Announcer for screen readers -->
                <div class="sr-only" aria-live="polite" aria-atomic="true">
                  {{ searchResults().length }} resultados encontrados
                </div>
              } @else if (searchQuery()) {
                <div class="py-12 text-center">
                  <div
                    class="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3"
                  >
                    <i class="pi pi-search text-slate-400" aria-hidden="true"></i>
                  </div>
                  <p class="text-slate-600 text-sm">
                    Nenhum resultado encontrado para "{{ searchQuery() }}"
                  </p>
                </div>
              } @else {
                <div class="py-12 text-center">
                  <p class="text-slate-600 text-sm italic">
                    Digite para buscar comandos, guias e documentos...
                  </p>
                </div>
              }
            </div>

            <!-- Footer -->
            <div
              class="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest"
            >
              <div class="flex items-center gap-4">
                <span class="flex items-center gap-1"
                  ><i class="pi pi-arrow-up text-[8px]" aria-hidden="true"></i
                  ><i class="pi pi-arrow-down text-[8px]" aria-hidden="true"></i> Navegar</span
                >
                <span class="flex items-center gap-1"
                  ><i class="pi pi-reply text-[8px] rotate-180" aria-hidden="true"></i>
                  Selecionar</span
                >
              </div>
              <div>Dindinho Docs Search</div>
            </div>
          </div>
        </div>
      }

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
            class="p-2 -ml-2 lg:hidden text-slate-600 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            aria-label="Abrir menu"
          >
            <i
              [class]="isMobileMenuOpen() ? 'pi pi-times text-xl' : 'pi pi-bars text-xl'"
              aria-hidden="true"
            ></i>
          </button>

          <a [routerLink]="logoLink" class="flex items-center gap-2 group">
            <div
              [class]="
                'w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold transition-transform group-hover:scale-105 ' +
                logoBgClass
              "
              aria-hidden="true"
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
              class="px-2 py-0.5 rounded bg-slate-50 text-slate-700 text-[10px] font-bold uppercase tracking-widest border border-slate-100"
              >{{ badgeText }}</span
            >
          }
        </div>

        <div class="flex items-center gap-2">
          <!-- Atalho de Busca Visual -->
          <button
            (click)="openSearch()"
            class="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-500 hover:text-slate-600 transition-all group/search"
            aria-label="Abrir busca (Ctrl+K)"
          >
            <i class="pi pi-search text-xs" aria-hidden="true"></i>
            <span class="text-xs font-medium">Buscar na documentação...</span>
            <div class="flex items-center gap-0.5 ml-2" aria-hidden="true">
              <kbd
                class="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-bold text-slate-500 transition-colors"
                [ngClass]="searchKbdHighlightClass"
                >Ctrl</kbd
              >
              <kbd
                class="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-bold text-slate-500 transition-colors"
                [ngClass]="searchKbdHighlightClass"
                >K</kbd
              >
            </div>
          </button>

          <!-- Busca Mobile -->
          <button
            (click)="openSearch()"
            class="md:hidden p-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
            [ngClass]="searchMobileHighlightClass"
            aria-label="Buscar"
          >
            <i class="pi pi-search text-xl" aria-hidden="true"></i>
          </button>
        </div>
      </header>

      <div class="flex-1 flex overflow-hidden">
        <!-- Sidebar -->
        <aside
          [class.translate-x-0]="isMobileMenuOpen()"
          [class.-translate-x-full]="!isMobileMenuOpen()"
          class="fixed inset-y-0 left-0 w-72 lg:static lg:translate-x-0 border-r border-slate-200 bg-white flex flex-col z-40 transition-transform duration-300 ease-in-out"
          role="complementary"
          aria-label="Sidebar de navegação"
        >
          <!-- Header da Sidebar no Mobile (opcional, para alinhar com o header principal) -->
          <div class="h-16 flex lg:hidden items-center px-6 border-b border-slate-100 gap-2">
            <i class="pi pi-list text-slate-500" aria-hidden="true"></i>
            <span class="font-bold text-slate-900">Conteúdo do Guia</span>
          </div>

          <nav class="flex-1 overflow-y-auto p-4 space-y-6" aria-label="Navegação da documentação">
            @for (category of categories; track category.id) {
              <div>
                <button
                  (click)="toggleCategory(category.id)"
                  class="w-full flex items-center gap-2 px-3 py-1.5 mb-1 group text-left hover:bg-slate-50 rounded-lg transition-colors focus:outline-none focus:ring-2"
                  [ngClass]="accentFocusClass"
                  [attr.aria-expanded]="isExpanded(category.id)"
                >
                  <span
                    class="text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap group-hover:text-slate-800 transition-colors"
                  >
                    {{ category.label }}
                  </span>
                  @if (category.items.length > 0) {
                    <span class="text-xs font-bold text-slate-400 group-hover:text-slate-500">
                      ({{ category.items.length }})
                    </span>
                  }
                  <div class="flex-1"></div>
                  <i
                    class="pi pi-chevron-down text-xs text-slate-400 transition-transform duration-200 group-hover:text-slate-500"
                    [class.rotate-180]="isExpanded(category.id)"
                    aria-hidden="true"
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
                          class="px-3 py-1.5 text-xs font-bold uppercase tracking-tighter flex items-center justify-between"
                          [ngClass]="accentTextClass"
                        >
                          <span>Em Andamento</span>
                          <i class="pi pi-bolt text-[10px]"></i>
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
                          class="px-3 py-1.5 mt-2 text-xs font-bold text-orange-600 uppercase tracking-tighter flex items-center justify-between"
                        >
                          <span>Discussão</span>
                          <span class="opacity-60">{{ getRFCItems(category).length }}</span>
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
                          class="px-3 py-1.5 mt-2 text-xs font-bold text-slate-500 uppercase tracking-tighter flex items-center justify-between"
                        >
                          <span>Arquivado</span>
                          <span class="opacity-60">{{ getDoneItems(category).length }}</span>
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

          <!-- Sidebar Footer (Acesso Rápido / CTAs) -->
          <div class="mt-auto border-t border-slate-100 bg-slate-50/50">
            <div class="p-4 space-y-3">
              <!-- Conteúdo Projetado (Ações específicas de cada layout) -->
              <ng-content select="[sidebarFooter]"></ng-content>

              <p
                class="text-[10px] text-slate-500 text-center uppercase font-bold tracking-tighter"
              >
                {{ footerText }}
              </p>
            </div>
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
        <div class="flex items-center gap-3.5 min-w-0">
          <i
            [class]="
              'pi ' + item.icon + ' text-base group-hover:scale-110 transition-transform shrink-0'
            "
            aria-hidden="true"
          ></i>
          <span class="leading-tight truncate">{{ item.label }}</span>
        </div>
        <div class="flex items-center gap-1.5 shrink-0">
          @if (item.priority && item.status !== 'ARQUIVADO') {
            <i
              [class]="'pi ' + getPriorityIcon(item.priority) + ' text-[10px]'"
              [attr.title]="'Prioridade: ' + item.priority"
              aria-hidden="true"
            ></i>
          }
          @if (item.owner) {
            <span
              class="text-[9px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium border border-slate-200/50 hidden group-hover:inline-block transition-all"
              [attr.title]="'Proprietário: ' + item.owner"
            >
              {{ item.owner }}
            </span>
          }
          @if (item.status) {
            <span
              [class]="
                'text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-tighter ' +
                getStatusClass(item.status)
              "
            >
              {{ item.status === 'DISCUSSAO' ? 'DISCUSSÃO' : item.status }}
            </span>
          }
        </div>
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
  @Input() badgeText = '';
  @Input() footerText = 'Dindinho v1.0.0';
  @Input() activeLinkClass = 'bg-indigo-50 text-indigo-700 font-bold';
  @Input() accentTextClass = 'text-indigo-500';
  @Input() accentFocusClass = 'focus:ring-indigo-500/20';
  @Input() searchResultHoverClass = 'hover:bg-indigo-50';
  @Input() searchResultActiveClass = 'bg-indigo-50';
  @Input() searchIconHighlightClass = 'group-hover:text-indigo-600';
  @Input() searchTextHighlightClass = 'group-hover:text-indigo-700';
  @Input() searchArrowHighlightClass = 'group-hover:text-indigo-400';
  @Input() searchKbdHighlightClass = 'group-hover/search:text-indigo-500';
  @Input() searchMobileHighlightClass = 'hover:text-indigo-600';
  @Input() currentContext: 'public' | 'user' | 'admin' = 'public';
  @Input() categories: SidebarCategory[] = [];

  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;

  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);
  private lastFocusedElement?: HTMLElement;

  // Estados de Busca
  protected readonly isSearchOpen = signal(false);
  protected readonly searchQuery = signal('');
  protected readonly selectedIndex = signal(0);

  // Resultado da busca computado
  protected readonly searchResults = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return [];

    const allItems: (SidebarItem & { category: string })[] = [];
    this.categories.forEach((cat) => {
      cat.items.forEach((item) => {
        allItems.push({ ...item, category: cat.label });
      });
    });

    return allItems
      .filter(
        (item) =>
          item.label.toLowerCase().includes(query) ||
          item.category.toLowerCase().includes(query) ||
          item.owner?.toLowerCase().includes(query) ||
          item.status?.toLowerCase().includes(query),
      )
      .slice(0, 8); // Limita a 8 resultados
  });

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    // 1. Atalho Global: Ctrl+K ou Cmd+K para abrir busca
    if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
      event.preventDefault();
      this.openSearch();
      return;
    }

    // 2. Se a busca não estiver aberta, não processa mais nada
    if (!this.isSearchOpen()) return;

    // 3. Tecla Escape: Fecha a busca
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeSearch();
      return;
    }

    // 4. Navegação e Seleção (apenas se houver resultados)
    const results = this.searchResults();
    if (results.length > 0) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        this.selectedIndex.update((i) => (i + 1) % results.length);
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        this.selectedIndex.update((i) => (i - 1 + results.length) % results.length);
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        const selected = results[this.selectedIndex()];
        if (selected) {
          this.navigateToResult(selected);
        }
        return;
      }
    }

    // 5. Focus Trap para Tab (dentro do diálogo)
    if (event.key === 'Tab') {
      const focusableElements = this.getFocusableElements();
      if (focusableElements.length > 0) {
        const first = focusableElements[0];
        const last = focusableElements[focusableElements.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }
  }

  openSearch() {
    this.lastFocusedElement = document.activeElement as HTMLElement;
    this.isSearchOpen.set(true);
    this.searchQuery.set('');
    this.selectedIndex.set(0);
    // Pequeno delay para focar o input após renderizar
    setTimeout(() => {
      this.searchInput?.nativeElement.focus();
    }, 10);
  }

  closeSearch() {
    this.isSearchOpen.set(false);
    if (this.lastFocusedElement) {
      this.lastFocusedElement.focus();
      this.lastFocusedElement = undefined;
    }
  }

  onSearchQueryChange(value: string) {
    this.searchQuery.set(value);
    this.selectedIndex.set(0);
  }

  /**
   * Impede que cliques dentro do diálogo fechem a busca,
   * mas permite que eventos de teclado borbulhem para o HostListener global.
   */
  handleDialogKeyDown(event: KeyboardEvent) {
    // Permitir que teclas de navegação e atalhos cheguem ao window:keydown
    const navigationKeys = ['ArrowUp', 'ArrowDown', 'Enter', 'Escape', 'Tab'];
    const isShortcut = (event.ctrlKey || event.metaKey) && event.key === 'k';

    if (navigationKeys.includes(event.key) || isShortcut) {
      return;
    }

    // Para outras teclas (como digitação), podemos parar a propagação se necessário,
    // mas o mais seguro para acessibilidade é apenas não fazer nada e deixar o linter feliz.
  }

  navigateToResult(result: SidebarItem) {
    this.closeSearch();
    this.router.navigateByUrl(result.link);
  }

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
    if (!this.isMobileMenuOpen()) {
      this.lastFocusedElement = document.activeElement as HTMLElement;
    }
    this.isMobileMenuOpen.update((v) => !v);
    if (!this.isMobileMenuOpen() && this.lastFocusedElement) {
      this.lastFocusedElement.focus();
      this.lastFocusedElement = undefined;
    }
  }

  closeMobileMenu(): void {
    const wasOpen = this.isMobileMenuOpen();
    this.isMobileMenuOpen.set(false);
    if (wasOpen && this.lastFocusedElement) {
      this.lastFocusedElement.focus();
      this.lastFocusedElement = undefined;
    }
  }

  private getFocusableElements(): HTMLElement[] {
    const dialog = document.querySelector('[role="dialog"]');
    if (!dialog) return [];
    return Array.from(
      dialog.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      ),
    ) as HTMLElement[];
  }

  getWIPItems(category: SidebarCategory): SidebarItem[] {
    return category.items.filter((item) => item.status === 'ANDAMENTO');
  }

  getRFCItems(category: SidebarCategory): SidebarItem[] {
    return category.items.filter((item) => item.status === 'DISCUSSAO');
  }

  getDoneItems(category: SidebarCategory): SidebarItem[] {
    return category.items.filter((item) => item.status === 'ARQUIVADO');
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'ANDAMENTO':
        return 'bg-indigo-50 text-indigo-600 border border-indigo-100';
      case 'DISCUSSAO':
        return 'bg-orange-50 text-orange-700 border border-orange-200/50';
      case 'ARQUIVADO':
        return 'bg-slate-100 text-slate-500 border border-slate-200/50';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  }

  getPriorityIcon(priority: string): string {
    switch (priority) {
      case 'alta':
        return 'pi-bolt text-orange-500';
      case 'media':
        return 'pi-angle-double-up text-amber-500';
      case 'baixa':
        return 'pi-angle-up text-slate-400';
      default:
        return '';
    }
  }
}
