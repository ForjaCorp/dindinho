import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  effect,
  inject,
  input,
  output,
  signal,
  ViewChild,
} from '@angular/core';
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
    <div
      [class]="containerClass()"
      [attr.data-testid]="accountCardTestId()"
      role="button"
      tabindex="0"
      aria-haspopup="menu"
      [attr.aria-expanded]="actionsOpen()"
      [attr.aria-controls]="actionsOpen() ? menuId() : null"
      (contextmenu)="onContextMenu($event)"
      (pointerdown)="onPointerDown($event)"
      (pointermove)="onPointerMove($event)"
      (pointerup)="onPointerUp($event)"
      (pointercancel)="onPointerCancel($event)"
      (pointerleave)="onPointerLeave()"
      (keydown.enter)="onKeyboardOpenMenu($event)"
      (keydown.space)="$event.preventDefault(); onKeyboardOpenMenu($event)"
      (keydown.escape)="onKeyboardCloseMenu($event)"
    >
      <div [class]="headerClass()">
        <div
          [class]="iconClass()"
          [style]="{ backgroundColor: account().color + '20', color: account().color }"
          [attr.data-testid]="accountIconTestId()"
        >
          <i [class]="'pi ' + account().icon"></i>
        </div>

        <div class="flex items-start gap-2 relative">
          <span [class]="tagClass()" [attr.data-testid]="accountTypeTestId()">{{
            typeLabel()
          }}</span>

          @if (actionsOpen()) {
            <div
              #menu
              [attr.id]="menuId()"
              [attr.data-testid]="accountMenuTestId()"
              class="fixed z-50 w-44 rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden"
              [style.left.px]="menuLeft()"
              [style.top.px]="menuTop()"
              role="menu"
              tabindex="-1"
              (click)="$event.stopPropagation()"
              (keydown.escape)="onKeyboardCloseMenu($event)"
              (keydown)="$event.stopPropagation()"
              (pointerdown)="$event.stopPropagation()"
              (contextmenu)="$event.stopPropagation()"
            >
              <button
                type="button"
                [attr.data-testid]="accountTransactionsTestId()"
                class="w-full px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition-colors flex items-center gap-2"
                aria-label="Transações"
                (click)="onOpenTransactionsClick($event)"
              >
                <i class="pi pi-list text-sm"></i>
                Transações
              </button>

              <button
                type="button"
                [attr.data-testid]="accountEditTestId()"
                class="w-full px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition-colors flex items-center gap-2"
                aria-label="Editar"
                (click)="onEditClick($event)"
              >
                <i class="pi pi-pencil text-sm"></i>
                Editar
              </button>
            </div>
          }
        </div>
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
  private static nextInstanceId = 1;

  @ViewChild('menu')
  private menuEl?: ElementRef<HTMLElement>;

  private readonly destroyRef = inject(DestroyRef);
  private readonly instanceId = AccountCardComponent.nextInstanceId++;

  private restoreFocusEl: HTMLElement | null = null;

  account = input.required<AccountDTO>();
  variant = input<'compact' | 'full'>('full');

  readonly edit = output<AccountDTO>();
  readonly openTransactions = output<AccountDTO>();

  protected readonly actionsOpen = signal(false);
  protected readonly suppressNextClick = signal(false);

  private readonly menuAnchorX = signal(0);
  private readonly menuAnchorY = signal(0);

  private longPressTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private longPressPointerId: number | null = null;
  private longPressStartX = 0;
  private longPressStartY = 0;

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
  accountTransactionsTestId = computed(() => `account-transactions-${this.account().id}`);
  accountEditTestId = computed(() => `account-edit-${this.account().id}`);
  accountMenuTestId = computed(() => `account-menu-${this.account().id}`);
  menuId = computed(() => `account-menu-${this.instanceId}`);

  containerClass = computed(() => {
    if (this.variant() === 'compact') {
      return 'shrink-0 bg-white rounded-xl p-3 border border-slate-100 shadow-sm min-w-[160px] cursor-pointer focus:outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-200';
    }

    return 'bg-white rounded-xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow duration-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-200';
  });

  menuLeft = computed(() => {
    const menuWidth = 176;
    const padding = 8;
    const viewportWidth =
      typeof window !== 'undefined'
        ? window.innerWidth
        : typeof document !== 'undefined'
          ? document.documentElement.clientWidth
          : menuWidth;

    const maxLeft = Math.max(padding, viewportWidth - menuWidth - padding);
    return Math.min(Math.max(this.menuAnchorX(), padding), maxLeft);
  });

  menuTop = computed(() => {
    const menuHeight = 88;
    const padding = 8;
    const viewportHeight =
      typeof window !== 'undefined'
        ? window.innerHeight
        : typeof document !== 'undefined'
          ? document.documentElement.clientHeight
          : menuHeight;

    const maxTop = Math.max(padding, viewportHeight - menuHeight - padding);
    return Math.min(Math.max(this.menuAnchorY(), padding), maxTop);
  });

  constructor() {
    effect(() => {
      if (!this.actionsOpen()) return;

      queueMicrotask(() => {
        const first = this.menuEl?.nativeElement.querySelector(
          'button',
        ) as HTMLButtonElement | null;
        first?.focus();
      });
    });

    const onOpen = (event: Event) => {
      const detail = (event as CustomEvent<number>).detail;
      if (detail !== this.instanceId) {
        this.actionsOpen.set(false);
      }
    };

    const onDocumentPointerDown = (event: PointerEvent) => {
      if (!this.actionsOpen()) return;

      const menu = this.menuEl?.nativeElement;
      if (!menu) {
        this.suppressNextClick.set(true);
        this.actionsOpen.set(false);
        return;
      }

      const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
      if (path.includes(menu)) return;

      this.suppressNextClick.set(true);
      this.actionsOpen.set(false);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('dindinho:context-menu-open', onOpen);
    }
    if (typeof document !== 'undefined') {
      document.addEventListener('pointerdown', onDocumentPointerDown, true);
    }

    this.destroyRef.onDestroy(() => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('dindinho:context-menu-open', onOpen);
      }
      if (typeof document !== 'undefined') {
        document.removeEventListener('pointerdown', onDocumentPointerDown, true);
      }
    });
  }

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

  protected onKeyboardOpenMenu(event: Event) {
    event.stopPropagation();

    this.restoreFocusEl =
      typeof document !== 'undefined' && document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const target = (event as KeyboardEvent).currentTarget as HTMLElement | null;
    if (!target) return;

    const rect = target.getBoundingClientRect();
    this.openMenuAt(rect.left + rect.width / 2, rect.top + rect.height / 2);
  }

  protected onKeyboardCloseMenu(event: Event) {
    event.stopPropagation();
    this.actionsOpen.set(false);

    const el = this.restoreFocusEl;
    this.restoreFocusEl = null;
    el?.focus();
  }

  private openMenuAt(x: number, y: number) {
    this.menuAnchorX.set(x);
    this.menuAnchorY.set(y);

    this.restoreFocusEl =
      typeof document !== 'undefined' && document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    this.actionsOpen.set(true);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent<number>('dindinho:context-menu-open', { detail: this.instanceId }),
      );
    }
  }

  protected onContextMenu(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.openMenuAt(event.clientX, event.clientY);
  }

  protected onPointerDown(event: PointerEvent) {
    if (event.pointerType !== 'touch') return;
    this.clearLongPress();
    this.longPressPointerId = event.pointerId;
    this.longPressStartX = event.clientX;
    this.longPressStartY = event.clientY;
    this.longPressTimeoutId = setTimeout(() => {
      this.suppressNextClick.set(true);
      this.openMenuAt(this.longPressStartX, this.longPressStartY);
    }, 500);
  }

  protected onPointerMove(event: PointerEvent) {
    if (this.longPressTimeoutId === null) return;
    if (this.longPressPointerId !== event.pointerId) return;

    const dx = event.clientX - this.longPressStartX;
    const dy = event.clientY - this.longPressStartY;
    if (Math.hypot(dx, dy) > 10) {
      this.clearLongPress();
    }
  }

  protected onPointerUp(event: PointerEvent) {
    if (this.longPressPointerId !== event.pointerId) return;
    this.clearLongPress();
  }

  protected onPointerCancel(event: PointerEvent) {
    if (this.longPressPointerId !== event.pointerId) return;
    this.clearLongPress();
  }

  protected onPointerLeave() {
    this.clearLongPress();
  }

  private clearLongPress() {
    if (this.longPressTimeoutId !== null) {
      clearTimeout(this.longPressTimeoutId);
    }
    this.longPressTimeoutId = null;
    this.longPressPointerId = null;
  }

  protected onEditClick(event: Event) {
    event.stopPropagation();
    this.actionsOpen.set(false);
    this.edit.emit(this.account());
  }

  protected onOpenTransactionsClick(event: Event) {
    event.stopPropagation();
    this.actionsOpen.set(false);
    this.openTransactions.emit(this.account());
  }
}
