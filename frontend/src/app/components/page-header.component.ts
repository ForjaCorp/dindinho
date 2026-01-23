import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-page-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block',
  },
  template: `
    <div class="flex items-center justify-between gap-4">
      <div class="flex flex-col min-w-0">
        <h1
          class="text-xl md:text-2xl font-bold text-slate-900 truncate"
          [attr.data-testid]="titleTestId()"
        >
          {{ title() }}
        </h1>
        @if (subtitle()) {
          <span class="text-sm text-slate-500 truncate" [attr.data-testid]="subtitleTestId()">{{
            subtitle()
          }}</span>
        }
      </div>

      <div class="shrink-0 flex items-center gap-2" [attr.data-testid]="actionsTestId()">
        <ng-content select="[page-header-actions]"></ng-content>
      </div>
    </div>
  `,
})
export class PageHeaderComponent {
  readonly title = input.required<string>();
  readonly subtitle = input<string | null>(null);

  readonly titleTestId = input<string | null>(null);
  readonly subtitleTestId = input<string | null>(null);
  readonly actionsTestId = input<string | null>(null);
}
